import type { LLMConfig } from '@shared/types'
import { normalizeLLMConfig } from '@shared/assistantConfig'
import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import { settingsDao } from '../database'
import {
  executePlannedCommands,
  planAssistantWorkflow,
  type AssistantPendingPlan,
  type AssistantPendingPreview,
  type AssistantPlannerDependencies,
  type AssistantPreviewMetadata,
  type AssistantToolCallTrace,
} from './AssistantWorkflowPlanner'
import { CANCEL_PATTERN, CONFIRM_PATTERN } from './AssistantPlannerShared'
import { invokeAssistantToolCalls } from './AssistantToolRuntime'
import {
  loadKanbanSnapshot,
  saveKanbanSnapshot,
  type KanbanSnapshotStoreDependencies,
} from './KanbanSnapshotStore'

type PlanAndSolveResponse = {
  handled: boolean
  response: string
  plan?: string[]
  internalTrace?: string[]
  affectedIds?: Record<string, string | undefined>
  toolCalls?: AssistantToolCallTrace[]
  preview?: AssistantPreviewMetadata
  pendingPreviewId?: string
}

export type PreviewResolveAction = 'confirm' | 'cancel'

const PENDING_PLAN_KEY = 'assistant:pending-plan'
const PENDING_PREVIEW_KEY = 'assistant:pending-preview'

export type PlanAndSolveAgentDependencies = AssistantPlannerDependencies & {
  loadSnapshot?: () => KanbanPersistedState
  saveSnapshot?: (snapshot: KanbanPersistedState) => void
  loadPendingPlan?: () => AssistantPendingPlan | null
  savePendingPlan?: (plan: AssistantPendingPlan | null) => void
  loadPendingPreview?: () => AssistantPendingPreview | null
  savePendingPreview?: (preview: AssistantPendingPreview | null) => void
  snapshotStoreDeps?: KanbanSnapshotStoreDependencies
}

function loadPendingPlan(): AssistantPendingPlan | null {
  const raw = settingsDao.get(PENDING_PLAN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AssistantPendingPlan
  } catch {
    return null
  }
}

function persistPendingPlan(plan: AssistantPendingPlan | null): void {
  if (!plan) {
    settingsDao.delete(PENDING_PLAN_KEY)
    return
  }
  settingsDao.set(PENDING_PLAN_KEY, JSON.stringify(plan))
}

function loadPendingPreview(): AssistantPendingPreview | null {
  const raw = settingsDao.get(PENDING_PREVIEW_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AssistantPendingPreview
  } catch {
    return null
  }
}

function persistPendingPreview(preview: AssistantPendingPreview | null): void {
  if (!preview) {
    settingsDao.delete(PENDING_PREVIEW_KEY)
    return
  }
  settingsDao.set(PENDING_PREVIEW_KEY, JSON.stringify(preview))
}

function stripExecutionCommandPrefix(detail: string): string {
  const separatorIndex = detail.indexOf(': ')
  return separatorIndex >= 0 ? detail.slice(separatorIndex + 2) : detail
}

function formatCommittedExecutionResponse(details: string[]): string {
  const committedDetails = details
    .map(stripExecutionCommandPrefix)
    .map((detail) => detail.trim())
    .filter(Boolean)

  if (committedDetails.length === 0) {
    return '已提交并验证。'
  }

  return `${committedDetails.join('；')}（已提交并验证）`
}

async function buildCommitFromPendingPreview(
  pendingPreview: AssistantPendingPreview,
  snapshot: KanbanPersistedState,
  config: LLMConfig,
): Promise<{
  response: PlanAndSolveResponse
  snapshot?: KanbanPersistedState
}> {
  const planned = await invokeAssistantToolCalls(
    {
      input: pendingPreview.input,
      snapshot,
      config,
    },
    pendingPreview.toolCalls,
    'direct',
  )

  if (!planned.commandsToExecute?.length) {
    return {
      response: {
        handled: true,
        response: '提交失败：工具调用没有生成可执行命令。',
        plan: planned.plan,
        internalTrace: planned.internalTrace,
        toolCalls: planned.toolCalls,
      },
    }
  }

  const execution = executePlannedCommands(snapshot, planned.commandsToExecute)
  if (!execution.success || !execution.snapshot) {
    return {
      response: {
        handled: true,
        response: `提交失败：${execution.error ?? '未知错误'}`,
        plan: planned.plan ?? execution.details,
        internalTrace: planned.internalTrace,
        affectedIds: execution.affectedIds,
        toolCalls: planned.toolCalls,
      },
    }
  }

  return {
    snapshot: execution.snapshot,
    response: {
      handled: true,
      response: formatCommittedExecutionResponse(execution.details),
      plan: [...(planned.plan ?? []), ...execution.details],
      internalTrace: planned.internalTrace,
      affectedIds: execution.affectedIds,
      toolCalls: planned.toolCalls,
    },
  }
}

function createNoPendingResolutionResponse(): PlanAndSolveResponse {
  return {
    handled: true,
    response: '当前没有待确认的预览或计划。请先生成新的结构化更改。',
  }
}

export async function resolvePendingPreviewAction(
  action: PreviewResolveAction,
  pendingPreviewId: string,
  config?: Partial<LLMConfig>,
  deps: PlanAndSolveAgentDependencies = {},
): Promise<PlanAndSolveResponse> {
  const snapshot = deps.loadSnapshot ? deps.loadSnapshot() : loadKanbanSnapshot(deps.snapshotStoreDeps)
  const pendingPreview = deps.loadPendingPreview
    ? deps.loadPendingPreview()
    : deps.loadSnapshot
      ? null
      : loadPendingPreview()
  const normalizedConfig = normalizeLLMConfig(config)

  if (!pendingPreview || pendingPreview.id !== pendingPreviewId) {
    return createNoPendingResolutionResponse()
  }

  if (action === 'cancel') {
    ;(deps.savePendingPreview ?? persistPendingPreview)(null)
    return {
      handled: true,
      response: '已取消预览，未更改当前数据。',
    }
  }

  const commit = await buildCommitFromPendingPreview(pendingPreview, snapshot, normalizedConfig)
  if (commit.snapshot) {
    ;(deps.saveSnapshot ?? ((nextSnapshot: KanbanPersistedState) => saveKanbanSnapshot(nextSnapshot, deps.snapshotStoreDeps)))(commit.snapshot)
    ;(deps.savePendingPreview ?? persistPendingPreview)(null)
  }

  return commit.response
}

export async function runPlanAndSolveAgent(
  input: string,
  config?: Partial<LLMConfig>,
  deps: PlanAndSolveAgentDependencies = {},
): Promise<PlanAndSolveResponse> {
  const text = input.trim()
  if (!text) return { handled: false, response: '' }

  const snapshot = deps.loadSnapshot ? deps.loadSnapshot() : loadKanbanSnapshot(deps.snapshotStoreDeps)
  const pendingPlan = deps.loadPendingPlan ? deps.loadPendingPlan() : loadPendingPlan()
  const pendingPreview = deps.loadPendingPreview
    ? deps.loadPendingPreview()
    : deps.loadSnapshot
      ? null
      : loadPendingPreview()
  const normalizedConfig = normalizeLLMConfig(config)

  if (pendingPreview) {
    if (CONFIRM_PATTERN.test(text)) {
      const commit = await buildCommitFromPendingPreview(pendingPreview, snapshot, normalizedConfig)
      if (commit.snapshot) {
        ;(deps.saveSnapshot ?? ((nextSnapshot: KanbanPersistedState) => saveKanbanSnapshot(nextSnapshot, deps.snapshotStoreDeps)))(commit.snapshot)
        ;(deps.savePendingPreview ?? persistPendingPreview)(null)
      }
      return commit.response
    }

    if (CANCEL_PATTERN.test(text)) {
      ;(deps.savePendingPreview ?? persistPendingPreview)(null)
      return {
        handled: true,
        response: '已取消预览，未更改当前数据。',
      }
    }

    return {
      handled: true,
      response: '当前有一个待确认的界面预览。请确认提交，或取消撤销本次预览。',
      pendingPreviewId: pendingPreview.id,
    }
  }

  if (!pendingPreview && !pendingPlan && (CONFIRM_PATTERN.test(text) || CANCEL_PATTERN.test(text))) {
    return createNoPendingResolutionResponse()
  }

  const result = await planAssistantWorkflow(text, snapshot, normalizedConfig, pendingPlan, {
    classifyIntent: deps.classifyIntent,
    routeToolCalls: deps.routeToolCalls,
  })

  if (!result.handled) {
    return { handled: false, response: '' }
  }

  if (result.clearPendingPlan) {
    ;(deps.savePendingPlan ?? persistPendingPlan)(null)
  }

  if (result.clearPendingPreview) {
    ;(deps.savePendingPreview ?? persistPendingPreview)(null)
  }

  if (result.pendingPreview) {
    ;(deps.savePendingPreview ?? persistPendingPreview)(result.pendingPreview)
    return {
      handled: true,
      response: result.response,
      plan: result.plan,
      internalTrace: result.internalTrace,
      toolCalls: result.toolCalls,
      preview: result.preview,
      pendingPreviewId: result.pendingPreview.id,
    }
  }

  if (result.pendingPlan) {
    ;(deps.savePendingPlan ?? persistPendingPlan)(result.pendingPlan)
    return {
      handled: true,
      response: result.response,
      plan: result.plan,
      internalTrace: result.internalTrace,
      toolCalls: result.toolCalls,
    }
  }

  if (result.commandsToExecute?.length) {
    const execution = executePlannedCommands(snapshot, result.commandsToExecute)
    if (!execution.success || !execution.snapshot) {
      return {
        handled: true,
        response: `正式命令执行失败：${execution.error ?? '未知错误'}`,
        plan: result.plan ?? execution.details,
        internalTrace: result.internalTrace,
        affectedIds: execution.affectedIds,
        toolCalls: result.toolCalls,
      }
    }

    ;(deps.saveSnapshot ?? ((nextSnapshot: KanbanPersistedState) => saveKanbanSnapshot(nextSnapshot, deps.snapshotStoreDeps)))(execution.snapshot)
    ;(deps.savePendingPlan ?? persistPendingPlan)(null)
    return {
      handled: true,
      response: `${result.response}（已验证）`,
      plan: [...(result.plan ?? []), ...execution.details],
      internalTrace: result.internalTrace,
      affectedIds: execution.affectedIds,
      toolCalls: result.toolCalls,
    }
  }

  return {
    handled: true,
    response: result.response,
    plan: result.plan,
    internalTrace: result.internalTrace,
    toolCalls: result.toolCalls,
    preview: result.preview,
  }
}

export type { PlanAndSolveResponse }
