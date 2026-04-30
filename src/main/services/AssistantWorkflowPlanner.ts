import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import {
  executeFormalKanbanCommand,
  type FormalKanbanCommand,
  type FormalCommandResult,
} from '@shared/formalKanbanCommands'
import type { LLMConfig } from '@shared/types'
import { classifyAssistantIntent } from './AssistantIntentClassifier'
import type {
  AssistantCapabilityCandidate,
  AssistantCapabilityDescriptor,
  AssistantIntentResolution,
  AssistantPlannerContext,
  AssistantPlannerDependencies,
  AssistantWorkflowExecution,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'
import {
  CANCEL_PATTERN,
  CONFIRM_PATTERN,
} from './AssistantPlannerShared'
import { assistantTools } from './tools'
import { assistantWorkflows } from './workflows'

function buildCapabilityRegistry(): AssistantCapabilityDescriptor[] {
  return [...assistantTools, ...assistantWorkflows]
}

function collectCandidates(context: AssistantPlannerContext): AssistantCapabilityCandidate[] {
  return buildCapabilityRegistry()
    .map((descriptor, index) => {
      const match = descriptor.match(context)
      if (!match) return null
      return {
        descriptor,
        match,
        order: index,
      } satisfies AssistantCapabilityCandidate
    })
    .filter((candidate): candidate is AssistantCapabilityCandidate => Boolean(candidate))
}

function buildFallbackResolution(candidates: AssistantCapabilityCandidate[]): AssistantIntentResolution {
  const orderedCandidateIds = [...candidates]
    .sort((left, right) => {
      if (right.match.score !== left.match.score) return right.match.score - left.match.score
      return left.order - right.order
    })
    .map((candidate) => candidate.descriptor.id)

  return {
    orderedCandidateIds,
    source: 'fallback',
    reason: '使用确定性候选优先级进行路由。',
  }
}

async function resolveIntentOrder(
  context: AssistantPlannerContext,
  candidates: AssistantCapabilityCandidate[],
  deps: AssistantPlannerDependencies,
): Promise<AssistantIntentResolution> {
  if (candidates.length <= 1) {
    return buildFallbackResolution(candidates)
  }

  const classifier = deps.classifyIntent ?? classifyAssistantIntent
  const llmResolution = await classifier({
    input: context.input,
    config: context.config,
    candidates: candidates.map((candidate) => ({
      id: candidate.descriptor.id,
      kind: candidate.descriptor.kind,
      label: candidate.descriptor.label,
      description: candidate.descriptor.description,
      score: candidate.match.score,
      signals: candidate.match.signals,
    })),
  })

  if (!llmResolution) {
    return buildFallbackResolution(candidates)
  }

  const fallback = buildFallbackResolution(candidates)
  const seen = new Set<string>()
  const orderedCandidateIds = [
    ...llmResolution.orderedCandidateIds,
    ...fallback.orderedCandidateIds,
  ].filter((candidateId) => {
    if (seen.has(candidateId)) return false
    seen.add(candidateId)
    return true
  })

  return {
    ...llmResolution,
    orderedCandidateIds,
  }
}

async function planFromCandidates(
  context: AssistantPlannerContext,
  deps: AssistantPlannerDependencies,
): Promise<AssistantWorkflowPlannerResponse> {
  const candidates = collectCandidates(context)
  if (candidates.length === 0) {
    return { handled: false, response: '' }
  }

  const resolution = await resolveIntentOrder(context, candidates, deps)
  if (resolution.needsClarification && resolution.clarificationQuestion) {
    return {
      handled: true,
      response: resolution.clarificationQuestion,
      plan: ['分析候选工具与工作流', '等待用户澄清意图'],
    }
  }

  const candidateMap = new Map(candidates.map((candidate) => [candidate.descriptor.id, candidate]))
  for (const candidateId of resolution.orderedCandidateIds) {
    const candidate = candidateMap.get(candidateId)
    if (!candidate) continue
    const response = await candidate.descriptor.plan(context)
    if (response?.handled) {
      const extraPlan = resolution.source === 'llm'
        ? ['通过意图识别选择最合适的工具/工作流']
        : ['使用确定性候选优先级选择工具/工作流']
      return {
        ...response,
        plan: response.plan ? [...extraPlan, ...response.plan] : extraPlan,
      }
    }
  }

  return { handled: false, response: '' }
}

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

  return planFromCandidates({ input: text, snapshot, config }, deps)
}

export type {
  AssistantPendingPlan,
  AssistantPlannerDependencies,
  AssistantWorkflowExecution,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'
