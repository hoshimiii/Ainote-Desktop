import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import {
  executeFormalKanbanCommand,
  type FormalKanbanCommand,
  type FormalCommandResult,
} from '@shared/formalKanbanCommands'
import type { LLMConfig } from '@shared/types'
import type {
  AssistantPlannerDependencies,
  AssistantWorkflowExecution,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'
import {
  CANCEL_PATTERN,
  CONFIRM_PATTERN,
} from './AssistantPlannerShared'
import { runAssistantToolNode } from './AssistantToolRuntime'

export function executePlannedCommands(
  snapshot: KanbanPersistedState,
  commands: FormalKanbanCommand[],
): AssistantWorkflowExecution {
  let current = snapshot
  const details: string[] = []
  const affectedIds: Record<string, string | undefined> = {}

  for (const command of commands) {
    const result: FormalCommandResult = executeFormalKanbanCommand(current, command)
    if (!result.success || !result.snapshot) {
      return {
        success: false,
        error: result.error ?? `执行 ${command.kind} 失败`,
        details: details.length ? details : [`执行 ${command.kind}`],
        affectedIds,
      }
    }

    current = result.snapshot
    Object.assign(affectedIds, result.affectedIds)
    details.push(`${command.kind}: ${result.verification.details.join('，')}`)
  }

  return {
    success: true,
    snapshot: current,
    details,
    affectedIds,
  }
}

export async function planAssistantWorkflow(
  input: string,
  snapshot: KanbanPersistedState,
  config: LLMConfig,
  pendingPlan?: import('./AssistantPlannerModels').AssistantPendingPlan | null,
  deps: AssistantPlannerDependencies = {},
): Promise<AssistantWorkflowPlannerResponse> {
  const text = input.trim()
  if (!text) return { handled: false, response: '' }

  if (pendingPlan) {
    if (CONFIRM_PATTERN.test(text)) {
      return {
        handled: true,
        response: '已开始执行待确认的结构化流程。',
        plan: pendingPlan.plan,
        commandsToExecute: pendingPlan.commands,
        clearPendingPlan: true,
      }
    }

    if (CANCEL_PATTERN.test(text)) {
      return {
        handled: true,
        response: '已取消待确认的结构化流程。',
        clearPendingPlan: true,
      }
    }

    return {
      handled: true,
      response: '当前仍有待确认的结构化流程。回复“确认”执行，或回复“取消”放弃后再发起新的写操作。',
      plan: pendingPlan.plan,
    }
  }

  if (CONFIRM_PATTERN.test(text) || CANCEL_PATTERN.test(text)) {
    return {
      handled: true,
      response: '当前没有待确认的预览或计划。请先生成新的结构化更改。',
    }
  }

  return runAssistantToolNode({ input: text, snapshot, config }, deps)
}

export type {
  AssistantPendingPlan,
  AssistantPendingPreview,
  AssistantPlannerDependencies,
  AssistantPreviewMetadata,
  AssistantToolCallTrace,
  AssistantWorkflowExecution,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'
