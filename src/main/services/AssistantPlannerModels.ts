import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { LLMConfig } from '@shared/types'

export type AssistantPendingPlan = {
  input: string
  response: string
  plan: string[]
  commands: FormalKanbanCommand[]
}

export type AssistantWorkflowPlannerResponse = {
  handled: boolean
  response: string
  plan?: string[]
  pendingPlan?: AssistantPendingPlan
  commandsToExecute?: FormalKanbanCommand[]
  clearPendingPlan?: boolean
}

export type AssistantWorkflowExecution = {
  success: boolean
  snapshot?: KanbanPersistedState
  details: string[]
  error?: string
  affectedIds: Record<string, string | undefined>
}

export type AssistantCapabilityKind = 'tool' | 'workflow'

export type AssistantCapabilityMatch = {
  score: number
  signals: string[]
}

export type AssistantPlannerContext = {
  input: string
  snapshot: KanbanPersistedState
  config: LLMConfig
}

export type AssistantCapabilityDescriptor = {
  id: string
  kind: AssistantCapabilityKind
  label: string
  description: string
  match: (context: AssistantPlannerContext) => AssistantCapabilityMatch | null
  plan: (context: AssistantPlannerContext) => AssistantWorkflowPlannerResponse | Promise<AssistantWorkflowPlannerResponse | null> | null
}

export type AssistantCapabilityCandidate = {
  descriptor: AssistantCapabilityDescriptor
  match: AssistantCapabilityMatch
  order: number
}

export type AssistantIntentCandidate = {
  id: string
  kind: AssistantCapabilityKind
  label: string
  description: string
  score: number
  signals: string[]
}

export type AssistantIntentResolution = {
  orderedCandidateIds: string[]
  source: 'llm' | 'fallback'
  reason?: string
  needsClarification?: boolean
  clarificationQuestion?: string
}

export type AssistantIntentClassificationRequest = {
  input: string
  candidates: AssistantIntentCandidate[]
  config: LLMConfig
}

export type AssistantIntentClassifier = (
  request: AssistantIntentClassificationRequest,
) => Promise<AssistantIntentResolution | null>

export type AssistantPlannerDependencies = {
  classifyIntent?: AssistantIntentClassifier
}
