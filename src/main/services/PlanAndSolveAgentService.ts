import type { LLMConfig } from '@shared/types'
import { normalizeLLMConfig } from '@shared/assistantConfig'
import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import { settingsDao } from '../database'
import {
  executePlannedCommands,
  planAssistantWorkflow,
  type AssistantPlannerDependencies,
  type AssistantPendingPlan,
} from './AssistantWorkflowPlanner'
import {
  loadKanbanSnapshot,
  saveKanbanSnapshot,
  type KanbanSnapshotStoreDependencies,
} from './KanbanSnapshotStore'

type PlanAndSolveResponse = {
  handled: boolean
  response: string
  plan?: string[]
  affectedIds?: Record<string, string | undefined>
}

const PENDING_PLAN_KEY = 'assistant:pending-plan'

export type PlanAndSolveAgentDependencies = AssistantPlannerDependencies & {
  loadSnapshot?: () => KanbanPersistedState
  saveSnapshot?: (snapshot: KanbanPersistedState) => void
  loadPendingPlan?: () => AssistantPendingPlan | null
  savePendingPlan?: (plan: AssistantPendingPlan | null) => void
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

export async function runPlanAndSolveAgent(
  input: string,
  config?: Partial<LLMConfig>,
  deps: PlanAndSolveAgentDependencies = {},
): Promise<PlanAndSolveResponse> {
  const text = input.trim()
  if (!text) return { handled: false, response: '' }

  const snapshot = deps.loadSnapshot ? deps.loadSnapshot() : loadKanbanSnapshot(deps.snapshotStoreDeps)
  const pendingPlan = deps.loadPendingPlan ? deps.loadPendingPlan() : loadPendingPlan()
  const normalizedConfig = normalizeLLMConfig(config)
  const result = await planAssistantWorkflow(text, snapshot, normalizedConfig, pendingPlan, {
    classifyIntent: deps.classifyIntent,
  })

  if (!result.handled) {
    return { handled: false, response: '' }
  }

  if (result.clearPendingPlan) {
    ;(deps.savePendingPlan ?? persistPendingPlan)(null)
  }

  if (result.pendingPlan) {
    ;(deps.savePendingPlan ?? persistPendingPlan)(result.pendingPlan)
    return {
      handled: true,
      response: result.response,
      plan: result.plan,
    }
  }

  if (result.commandsToExecute?.length) {
    const execution = executePlannedCommands(snapshot, result.commandsToExecute)
    if (!execution.success || !execution.snapshot) {
      return {
        handled: true,
        response: `正式命令执行失败：${execution.error ?? '未知错误'}`,
        plan: result.plan ?? execution.details,
        affectedIds: execution.affectedIds,
      }
    }

    ;(deps.saveSnapshot ?? ((nextSnapshot: KanbanPersistedState) => saveKanbanSnapshot(nextSnapshot, deps.snapshotStoreDeps)))(execution.snapshot)
    ;(deps.savePendingPlan ?? persistPendingPlan)(null)
    return {
      handled: true,
      response: `${result.response}（已验证）`,
      plan: [...(result.plan ?? []), ...execution.details],
      affectedIds: execution.affectedIds,
    }
  }

  return {
    handled: true,
    response: result.response,
    plan: result.plan,
  }
}

export type { PlanAndSolveResponse }
