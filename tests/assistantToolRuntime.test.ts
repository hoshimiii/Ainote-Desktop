import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'
import {
  collectAssistantToolCandidates,
  createAssistantToolRegistry,
  invokeAssistantTool,
  invokeAssistantToolCalls,
  runAssistantToolNode,
} from '../src/main/services/AssistantToolRuntime'

const emptySnapshot = normalizePersistedKanbanState(null)

test('assistant tool runtime exposes registered tools by id', () => {
  const registry = createAssistantToolRegistry()

  assert.ok(registry.byId.has('workspace-read'))
  assert.ok(registry.byId.has('simple-create'))
  assert.ok(registry.byId.has('wrong-answer-workflow'))
})

test('assistant tool runtime collects candidates from the registry', () => {
  const candidates = collectAssistantToolCandidates({
    input: '创建工作区“Runtime”',
    snapshot: emptySnapshot,
    config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  })

  assert.ok(candidates.some((candidate) => candidate.descriptor.id === 'simple-create'))
})

test('invokeAssistantTool calls a registered tool function and returns trace metadata', async () => {
  const response = await invokeAssistantTool(
    { toolId: 'simple-create', source: 'direct' },
    {
      input: '创建工作区“Runtime”',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    },
  )

  assert.equal(response?.handled, true)
  assert.deepEqual(response?.commandsToExecute?.map((command) => command.kind), ['create_workspace'])
  assert.equal(response?.toolCalls?.[0]?.toolId, 'simple-create')
  assert.equal(response?.toolCalls?.[0]?.status, 'handled')
  assert.equal(response?.toolCalls?.[0]?.commandCount, 1)
})

test('runAssistantToolNode invokes the selected tool and preserves call trace', async () => {
  const response = await runAssistantToolNode(
    {
      input: '创建工作区“Node”',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    },
  )

  assert.equal(response.handled, true)
  assert.ok(response.commandsToExecute)
  assert.ok(response.toolCalls?.some((call) => call.toolId === 'simple-create' && call.status === 'selected'))
  assert.ok(response.toolCalls?.some((call) => call.toolId === 'simple-create' && call.status === 'handled'))
})

test('runAssistantToolNode can invoke an LLM-routed tool without keyword matching', async () => {
  const response = await runAssistantToolNode(
    {
      input: '帮我开一个叫 RuntimeNoKeyword 的空间',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    },
    {
      routeToolCalls: async () => ({
        source: 'llm',
        toolCalls: [{
          toolId: 'simple-create',
          args: { entityType: 'workspace', title: 'RuntimeNoKeyword' },
        }],
        reason: '用户想新增一个工作空间。',
      }),
    },
  )

  assert.equal(response.handled, true)
  assert.ok(response.preview)
  assert.ok(response.pendingPreview)
  assert.equal(response.preview.snapshot.workspaces[0]?.name, 'RuntimeNoKeyword')
  assert.equal(response.preview.baseSnapshotFingerprint ?? null, null)
  assert.ok(response.toolCalls?.some((call) => call.toolId === 'simple-create' && call.status === 'handled'))
})

test('runAssistantToolNode keeps clarification steps in internalTrace instead of visible plan', async () => {
  const response = await runAssistantToolNode(
    {
      input: '帮我开一个空间',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    },
    {
      routeToolCalls: async () => ({
        needsClarification: true,
        clarificationQuestion: '请告诉我新工作区的名字。',
      }) as any,
    },
  )

  assert.equal(response.handled, true)
  assert.equal(response.plan, undefined)
  assert.deepEqual(response.internalTrace, ['LLM 识别工具调用意图', '等待用户补充必要参数'])
  assert.match(response.response, /工作区的名字/)
})

test('invokeAssistantToolCalls lets later read tools observe preview mutations from earlier writes', async () => {
  const response = await invokeAssistantToolCalls(
    {
      input: '创建工作区并列出工作区',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    },
    [
      {
        toolId: 'simple-create',
        args: { entityType: 'workspace', title: 'SequentialDemo' },
      },
      {
        toolId: 'workspace-read',
        args: { queryType: 'list' },
      },
    ],
  )

  assert.equal(response.handled, true)
  assert.match(response.response, /SequentialDemo/)
  assert.equal(response.commandsToExecute?.length, 1)
})

test('invokeAssistantToolCalls suppresses redundant current-workspace misses when a write also runs', async () => {
  const response = await invokeAssistantToolCalls(
    {
      input: '创建工作区',
      snapshot: emptySnapshot,
      config: { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'always' },
    },
    [
      {
        toolId: 'workspace-read',
        args: { queryType: 'current' },
      },
      {
        toolId: 'simple-create',
        args: { entityType: 'workspace', title: 'NoNoise' },
      },
    ],
  )

  assert.equal(response.handled, true)
  assert.doesNotMatch(response.response, /当前没有激活工作区/)
  assert.ok(!response.plan?.includes('读取当前工作区上下文'))
  assert.match(response.response, /NoNoise/)
})
