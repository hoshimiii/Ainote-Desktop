import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'
import {
  resolvePendingPreviewAction,
  runPlanAndSolveAgent,
  type PlanAndSolveAgentDependencies,
} from '../src/main/services/PlanAndSolveAgentService'
import type { AssistantPendingPreview } from '../src/main/services/AssistantWorkflowPlanner'

test('runPlanAndSolveAgent persists successful structured mutations through saveSnapshot', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let savedSnapshot = emptySnapshot

  const result = await runPlanAndSolveAgent(
    '创建工作区“Demo”',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: (snapshot) => {
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /已验证/)
  assert.equal(savedSnapshot.workspaces[0]?.name, 'Demo')
  assert.ok(result.toolCalls?.some((call) => call.toolId === 'simple-create' && call.status === 'handled'))
})

test('runPlanAndSolveAgent reports failed formal command execution without saving', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let saveCalls = 0

  const result = await runPlanAndSolveAgent(
    '确认',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: () => {
        saveCalls += 1
      },
      loadPendingPlan: () => ({
        input: 'rename missing workspace',
        response: 'pending',
        plan: ['rename missing workspace'],
        commands: [{ kind: 'rename_workspace', workspaceId: 'missing-workspace', newName: 'Renamed' }],
      }),
      savePendingPlan: () => {},
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /执行失败/)
  assert.doesNotMatch(result.response, /已验证/)
  assert.equal(saveCalls, 0)
})

test('runPlanAndSolveAgent defers writes until confirmation mode is satisfied', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let savedSnapshot = emptySnapshot
  let pendingPlan: Parameters<NonNullable<PlanAndSolveAgentDependencies['savePendingPlan']>>[0] = null
  let saveSnapshotCalls = 0

  const pending = await runPlanAndSolveAgent(
    '创建工作区“Deferred”',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: (snapshot) => {
        saveSnapshotCalls += 1
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => null,
      savePendingPlan: (plan) => {
        pendingPlan = plan
      },
    },
  )

  assert.equal(pending.handled, true)
  assert.ok(pendingPlan)
  assert.equal(saveSnapshotCalls, 0)
  assert.equal(savedSnapshot.workspaces.length, 0)

  const confirmed = await runPlanAndSolveAgent(
    '确认',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: (snapshot) => {
        saveSnapshotCalls += 1
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => pendingPlan,
      savePendingPlan: (plan) => {
        pendingPlan = plan
      },
    },
  )

  assert.equal(confirmed.handled, true)
  assert.match(confirmed.response, /已验证/)
  assert.equal(savedSnapshot.workspaces[0]?.name, 'Deferred')
  assert.equal(pendingPlan, null)
})

test('runPlanAndSolveAgent read-only tools do not save mutated snapshots', async () => {
  const snapshot = normalizePersistedKanbanState({
    workspaces: [{ id: 'workspace-1', name: 'Demo', missionIds: [] }],
    activeWorkSpaceId: 'workspace-1',
  })
  let saveCalls = 0

  const result = await runPlanAndSolveAgent(
    '当前工作区 id 是什么？',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    {
      loadSnapshot: () => snapshot,
      saveSnapshot: () => {
        saveCalls += 1
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /workspace-1/)
  assert.equal(saveCalls, 0)
})

test('runPlanAndSolveAgent stores LLM-routed write previews without saving snapshots', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let saveSnapshotCalls = 0
  let pendingPreview: AssistantPendingPreview | null = null

  const result = await runPlanAndSolveAgent(
    '帮我开一个叫 PreviewOnly 的空间',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: () => {
        saveSnapshotCalls += 1
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
      loadPendingPreview: () => null,
      savePendingPreview: (preview) => {
        pendingPreview = preview
      },
      routeToolCalls: async () => ({
        source: 'llm',
        toolCalls: [{
          toolId: 'simple-create',
          args: { entityType: 'workspace', title: 'PreviewOnly' },
        }],
      }),
    },
  )

  assert.equal(result.handled, true)
  assert.ok(result.preview)
  assert.ok(result.pendingPreviewId)
  assert.equal(result.preview.snapshot.workspaces[0]?.name, 'PreviewOnly')
  assert.equal(saveSnapshotCalls, 0)
  assert.ok(pendingPreview)
})

test('runPlanAndSolveAgent commits accepted previews by replaying tool calls on latest snapshot', async () => {
  const previewBase = normalizePersistedKanbanState(null)
  const latestSnapshot = normalizePersistedKanbanState({
    workspaces: [{ id: 'existing-workspace', name: 'Existing', missionIds: [] }],
    activeWorkSpaceId: 'existing-workspace',
  })
  let pendingPreview: AssistantPendingPreview | null = null
  let savedSnapshot = previewBase

  await runPlanAndSolveAgent(
    '帮我开一个叫 ReplayOnLatest 的空间',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => previewBase,
      saveSnapshot: (snapshot) => {
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
      loadPendingPreview: () => null,
      savePendingPreview: (preview) => {
        pendingPreview = preview
      },
      routeToolCalls: async () => ({
        source: 'llm',
        toolCalls: [{
          toolId: 'simple-create',
          args: { entityType: 'workspace', title: 'ReplayOnLatest' },
        }],
      }),
    },
  )

  const committed = await runPlanAndSolveAgent(
    '确认',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => latestSnapshot,
      saveSnapshot: (snapshot) => {
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
      loadPendingPreview: () => pendingPreview,
      savePendingPreview: (preview) => {
        pendingPreview = preview
      },
    },
  )

  assert.equal(committed.handled, true)
  assert.match(committed.response, /已提交并验证/)
  assert.match(committed.response, /工作区已创建/)
  assert.doesNotMatch(committed.response, /预览/)
  assert.equal(savedSnapshot.workspaces.some((workspace) => workspace.name === 'Existing'), true)
  assert.equal(savedSnapshot.workspaces.some((workspace) => workspace.name === 'ReplayOnLatest'), true)
  assert.equal(pendingPreview, null)
})

test('runPlanAndSolveAgent cancels pending previews without saving snapshots', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let saveSnapshotCalls = 0
  let pendingPreview: AssistantPendingPreview | null = {
    id: 'pending-preview',
    input: '帮我开一个叫 Cancelled 的空间',
    summary: 'preview',
    createdAt: 1,
    toolCalls: [{
      toolId: 'simple-create',
      args: { entityType: 'workspace', title: 'Cancelled' },
    }],
  }

  const cancelled = await runPlanAndSolveAgent(
    '取消',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: () => {
        saveSnapshotCalls += 1
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
      loadPendingPreview: () => pendingPreview,
      savePendingPreview: (preview) => {
        pendingPreview = preview
      },
    },
  )

  assert.equal(cancelled.handled, true)
  assert.match(cancelled.response, /已取消预览/)
  assert.equal(saveSnapshotCalls, 0)
  assert.equal(pendingPreview, null)
})

test('runPlanAndSolveAgent returns a deterministic response for orphaned confirmation input', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let saveSnapshotCalls = 0

  const result = await runPlanAndSolveAgent(
    '确认',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: () => {
        saveSnapshotCalls += 1
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
      loadPendingPreview: () => null,
      savePendingPreview: () => {},
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /当前没有待确认的预览或计划/)
  assert.equal(saveSnapshotCalls, 0)
})

test('resolvePendingPreviewAction rejects stale preview ids without saving', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let saveSnapshotCalls = 0
  let pendingPreview: AssistantPendingPreview | null = {
    id: 'pending-preview',
    input: '帮我开一个叫 Stale 的空间',
    summary: 'preview',
    createdAt: 1,
    toolCalls: [{
      toolId: 'simple-create',
      args: { entityType: 'workspace', title: 'Stale' },
    }],
  }

  const result = await resolvePendingPreviewAction(
    'confirm',
    'different-preview',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: () => {
        saveSnapshotCalls += 1
      },
      loadPendingPreview: () => pendingPreview,
      savePendingPreview: (preview) => {
        pendingPreview = preview
      },
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /当前没有待确认的预览或计划/)
  assert.equal(saveSnapshotCalls, 0)
  assert.ok(pendingPreview)
})
