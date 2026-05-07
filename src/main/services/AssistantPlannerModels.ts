import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { LLMConfig } from '@shared/types'

export type AssistantPendingPlan = {
  input: string
  response: string
  plan: string[]
  commands: FormalKanbanCommand[]
}

export type AssistantToolArgumentValue = string | number | boolean | null | undefined

export type AssistantToolArguments = Record<string, AssistantToolArgumentValue>

export type AssistantToolArgumentSchemaField = {
  type: 'string' | 'number' | 'boolean'
  description: string
  required?: boolean
  enum?: string[]
}

export type AssistantToolArgumentSchema = Record<string, AssistantToolArgumentSchemaField>

export type AssistantStructuredToolCall = {
  toolId: string
  args: AssistantToolArguments
}

export type AssistantPendingPreview = {
  id: string
  input: string
  toolCalls: AssistantStructuredToolCall[]
  summary: string
  createdAt: number
  baseSnapshotFingerprint?: string | null
}

export type AssistantPreviewMetadata = {
  pendingPreviewId: string
  summary: string
  plan: string[]
  toolCalls: AssistantStructuredToolCall[]
  snapshot: KanbanPersistedState
  baseSnapshotFingerprint?: string | null
}

export type AssistantWorkflowPlannerResponse = {
  handled: boolean
  response: string
  plan?: string[]
  internalTrace?: string[]
  pendingPlan?: AssistantPendingPlan
  pendingPreview?: AssistantPendingPreview
  preview?: AssistantPreviewMetadata
  commandsToExecute?: FormalKanbanCommand[]
  clearPendingPlan?: boolean
  clearPendingPreview?: boolean
  toolCalls?: AssistantToolCallTrace[]
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
  readOnly?: boolean
  inputSchema?: AssistantToolArgumentSchema
  match: (context: AssistantPlannerContext) => AssistantCapabilityMatch | null
  plan: (context: AssistantPlannerContext) => AssistantWorkflowPlannerResponse | Promise<AssistantWorkflowPlannerResponse | null> | null
  execute?: (
    context: AssistantPlannerContext,
    args: AssistantToolArguments,
  ) => AssistantWorkflowPlannerResponse | Promise<AssistantWorkflowPlannerResponse | null> | null
}

export type AssistantCapabilityCandidate = {
  descriptor: AssistantCapabilityDescriptor
  match: AssistantCapabilityMatch
  order: number
}

export type AssistantToolCallTrace = {
  toolId: string
  source: 'llm' | 'fallback' | 'direct'
  status: 'selected' | 'invoked' | 'handled' | 'missed'
  commandCount: number
  pending: boolean
  preview: boolean
}

export type AssistantToolInvocation = {
  toolId: string
  source?: 'llm' | 'fallback' | 'direct'
  args?: AssistantToolArguments
}

export type AssistantToolCallResolution = {
  toolCalls: AssistantStructuredToolCall[]
  source: 'llm'
  reason?: string
  needsClarification?: boolean
  clarificationQuestion?: string
}

export type AssistantToolCallRouterRequest = {
  input: string
  config: LLMConfig
  contextSummary: string
  tools: Array<{
    id: string
    kind: AssistantCapabilityKind
    label: string
    description: string
    readOnly: boolean
    inputSchema: AssistantToolArgumentSchema
  }>
}

export type AssistantToolCallRouter = (
  request: AssistantToolCallRouterRequest,
) => Promise<AssistantToolCallResolution | null>

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
  routeToolCalls?: AssistantToolCallRouter
}
