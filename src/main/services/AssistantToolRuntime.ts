import { randomUUID } from 'crypto'
import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import {
  executeFormalKanbanCommand,
  type FormalKanbanCommand,
} from '@shared/formalKanbanCommands'
import type {
  AssistantCapabilityCandidate,
  AssistantCapabilityDescriptor,
  AssistantIntentResolution,
  AssistantPendingPreview,
  AssistantPlannerContext,
  AssistantPlannerDependencies,
  AssistantStructuredToolCall,
  AssistantToolArguments,
  AssistantToolCallResolution,
  AssistantToolCallTrace,
  AssistantToolInvocation,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'
import { classifyAssistantIntent } from './AssistantIntentClassifier'
import { routeAssistantToolCalls } from './AssistantToolCallRouter'
import { summarizeCurrentContext } from './AssistantPlannerShared'
import { assistantTools } from './tools'
import { assistantWorkflows } from './workflows'

export type AssistantToolRegistry = {
  descriptors: AssistantCapabilityDescriptor[]
  byId: Map<string, AssistantCapabilityDescriptor>
}

export function createAssistantToolRegistry(
  descriptors: AssistantCapabilityDescriptor[] = [...assistantTools, ...assistantWorkflows],
): AssistantToolRegistry {
  return {
    descriptors,
    byId: new Map(descriptors.map((descriptor) => [descriptor.id, descriptor])),
  }
}

export function collectAssistantToolCandidates(
  context: AssistantPlannerContext,
  registry: AssistantToolRegistry = createAssistantToolRegistry(),
): AssistantCapabilityCandidate[] {
  return registry.descriptors
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

export async function resolveAssistantToolOrder(
  context: AssistantPlannerContext,
  candidates: AssistantCapabilityCandidate[],
  deps: AssistantPlannerDependencies = {},
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

function createTrace(
  toolId: string,
  source: AssistantToolCallTrace['source'],
  status: AssistantToolCallTrace['status'],
  response?: AssistantWorkflowPlannerResponse | null,
): AssistantToolCallTrace {
  return {
    toolId,
    source,
    status,
    commandCount: response?.commandsToExecute?.length
      ?? response?.pendingPlan?.commands.length
      ?? response?.preview?.plan.length
      ?? 0,
    pending: Boolean(response?.pendingPlan ?? response?.pendingPreview),
    preview: Boolean(response?.preview),
  }
}

function cloneSnapshot(snapshot: KanbanPersistedState): KanbanPersistedState {
  return JSON.parse(JSON.stringify(snapshot)) as KanbanPersistedState
}

function executeCommandsOnSnapshot(
  snapshot: KanbanPersistedState,
  commands: FormalKanbanCommand[],
): { success: boolean; snapshot?: KanbanPersistedState; details: string[]; error?: string } {
  let current = cloneSnapshot(snapshot)
  const details: string[] = []

  for (const command of commands) {
    const result = executeFormalKanbanCommand(current, command)
    if (!result.success || !result.snapshot) {
      return {
        success: false,
        details: details.length ? details : [`执行 ${command.kind}`],
        error: result.error ?? `执行 ${command.kind} 失败`,
      }
    }

    current = result.snapshot
    details.push(`${command.kind}: ${result.verification.details.join('，')}`)
  }

  return { success: true, snapshot: current, details }
}

function shouldSuppressReadOnlyToolOutput(
  descriptor: AssistantCapabilityDescriptor | undefined,
  response: AssistantWorkflowPlannerResponse,
  hasWriteToolCalls: boolean,
): boolean {
  if (!hasWriteToolCalls || descriptor?.readOnly !== true) return false
  return response.response === '当前没有激活工作区。'
}

function getStructuredToolDescriptors(registry: AssistantToolRegistry) {
  return registry.descriptors
    .filter((descriptor) => descriptor.inputSchema && descriptor.execute)
    .map((descriptor) => ({
      id: descriptor.id,
      kind: descriptor.kind,
      label: descriptor.label,
      description: descriptor.description,
      readOnly: descriptor.readOnly === true,
      inputSchema: descriptor.inputSchema!,
    }))
}

async function resolveAssistantToolCalls(
  context: AssistantPlannerContext,
  registry: AssistantToolRegistry,
  deps: AssistantPlannerDependencies,
): Promise<AssistantToolCallResolution | null> {
  const tools = getStructuredToolDescriptors(registry)
  if (tools.length === 0) return null

  const router = deps.routeToolCalls ?? routeAssistantToolCalls
  return router({
    input: context.input,
    config: context.config,
    contextSummary: summarizeCurrentContext(context.snapshot),
    tools,
  })
}

export async function invokeAssistantTool(
  invocation: AssistantToolInvocation,
  context: AssistantPlannerContext,
  registry: AssistantToolRegistry = createAssistantToolRegistry(),
): Promise<AssistantWorkflowPlannerResponse | null> {
  const descriptor = registry.byId.get(invocation.toolId)
  if (!descriptor) return null

  const executionContext = descriptor.execute && invocation.args
    ? { ...context, config: { ...context.config, writeConfirmationMode: 'never' as const } }
    : context
  const response = descriptor.execute && invocation.args
    ? await descriptor.execute(executionContext, invocation.args)
    : await descriptor.plan(context)
  const source = invocation.source ?? 'direct'
  const trace = createTrace(
    invocation.toolId,
    source,
    response?.handled ? 'handled' : 'missed',
    response,
  )

  if (!response) {
    return {
      handled: false,
      response: '',
      toolCalls: [trace],
    }
  }

  return {
    ...response,
    toolCalls: [...(response.toolCalls ?? []), trace],
  }
}

export async function invokeAssistantToolCalls(
  context: AssistantPlannerContext,
  toolCalls: AssistantStructuredToolCall[],
  source: AssistantToolCallTrace['source'] = 'direct',
  registry: AssistantToolRegistry = createAssistantToolRegistry(),
): Promise<AssistantWorkflowPlannerResponse> {
  const traces: AssistantToolCallTrace[] = []
  const plan: string[] = []
  const internalTrace: string[] = []
  const commands: FormalKanbanCommand[] = []
  const responses: string[] = []
  const hasWriteToolCalls = toolCalls.some((toolCall) => registry.byId.get(toolCall.toolId)?.readOnly !== true)
  let currentSnapshot = context.snapshot

  for (const toolCall of toolCalls) {
    const descriptor = registry.byId.get(toolCall.toolId)
    traces.push({
      toolId: toolCall.toolId,
      source,
      status: 'selected',
      commandCount: 0,
      pending: false,
      preview: false,
    })
    const response = await invokeAssistantTool(
      { toolId: toolCall.toolId, args: toolCall.args, source },
      { ...context, snapshot: currentSnapshot },
      registry,
    )
    traces.push(...(response?.toolCalls ?? []))

    if (!response?.handled) {
      continue
    }

    const suppressReadOnlyOutput = shouldSuppressReadOnlyToolOutput(descriptor, response, hasWriteToolCalls)

    if (response.commandsToExecute?.length) {
      commands.push(...response.commandsToExecute)

      const previewExecution = executeCommandsOnSnapshot(currentSnapshot, response.commandsToExecute)
      if (!previewExecution.success || !previewExecution.snapshot) {
        return {
          handled: true,
          response: `结构化工具调用预演失败：${previewExecution.error ?? '未知错误'}`,
          plan: [...plan, ...(response.plan ?? []), ...previewExecution.details],
          internalTrace: [...internalTrace, ...(response.internalTrace ?? [])],
          toolCalls: traces,
        }
      }

      currentSnapshot = previewExecution.snapshot
    }

    if (response.internalTrace) internalTrace.push(...response.internalTrace)
    if (response.plan && !suppressReadOnlyOutput) plan.push(...response.plan)
    if (response.response && !suppressReadOnlyOutput) responses.push(response.response)
  }

  if (responses.length === 0 && commands.length === 0) {
    return { handled: false, response: '', toolCalls: traces }
  }

  return {
    handled: true,
    response: responses.join('\n\n') || '已生成结构化工具调用结果。',
    plan,
    internalTrace,
    commandsToExecute: commands.length ? commands : undefined,
    toolCalls: traces,
  }
}

function buildPreviewResponse(
  context: AssistantPlannerContext,
  response: AssistantWorkflowPlannerResponse,
  toolCalls: AssistantStructuredToolCall[],
): AssistantWorkflowPlannerResponse {
  const commands = response.commandsToExecute ?? []
  if (commands.length === 0) return response

  const previewExecution = executeCommandsOnSnapshot(context.snapshot, commands)
  if (!previewExecution.success || !previewExecution.snapshot) {
    return {
      handled: true,
      response: `预览生成失败：${previewExecution.error ?? '未知错误'}`,
      plan: response.plan ?? previewExecution.details,
      internalTrace: response.internalTrace,
      toolCalls: response.toolCalls,
    }
  }

  const pendingPreview: AssistantPendingPreview = {
    id: randomUUID(),
    input: context.input,
    toolCalls,
    summary: response.response,
    createdAt: Date.now(),
    baseSnapshotFingerprint: null,
  }

  return {
    handled: true,
    response: `${response.response}\n\n已生成界面预览，可直接查看；保存更改将重新读取最新数据并提交，放弃预览不会更改当前数据。`,
    plan: response.plan,
    internalTrace: response.internalTrace,
    pendingPreview,
    preview: {
      pendingPreviewId: pendingPreview.id,
      summary: response.response,
      plan: response.plan ?? previewExecution.details,
      toolCalls,
      snapshot: previewExecution.snapshot,
      baseSnapshotFingerprint: pendingPreview.baseSnapshotFingerprint,
    },
    toolCalls: response.toolCalls,
  }
}

export async function runAssistantToolNode(
  context: AssistantPlannerContext,
  deps: AssistantPlannerDependencies = {},
  registry: AssistantToolRegistry = createAssistantToolRegistry(),
): Promise<AssistantWorkflowPlannerResponse> {
  const toolCallResolution = await resolveAssistantToolCalls(context, registry, deps)
  if (toolCallResolution?.needsClarification && toolCallResolution.clarificationQuestion) {
    return {
      handled: true,
      response: toolCallResolution.clarificationQuestion,
      internalTrace: ['LLM 识别工具调用意图', '等待用户补充必要参数'],
    }
  }

  if (toolCallResolution?.toolCalls.length) {
    const response = await invokeAssistantToolCalls(
      context,
      toolCallResolution.toolCalls,
      toolCallResolution.source,
      registry,
    )
    if (response.handled) {
      const hasWrite = toolCallResolution.toolCalls.some((toolCall) => {
        const descriptor = registry.byId.get(toolCall.toolId)
        return descriptor?.readOnly !== true
      })
      return hasWrite
        ? buildPreviewResponse(context, response, toolCallResolution.toolCalls)
        : response
    }
  }

  const candidates = collectAssistantToolCandidates(context, registry)
  if (candidates.length === 0) {
    return { handled: false, response: '' }
  }

  const resolution = await resolveAssistantToolOrder(context, candidates, deps)
  if (resolution.needsClarification && resolution.clarificationQuestion) {
    return {
      handled: true,
      response: resolution.clarificationQuestion,
      internalTrace: ['分析候选工具与工作流', '等待用户澄清意图'],
    }
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.descriptor.id))
  const traces: AssistantToolCallTrace[] = []
  for (const candidateId of resolution.orderedCandidateIds) {
    if (!candidateIds.has(candidateId)) continue
    traces.push({
      toolId: candidateId,
      source: resolution.source,
      status: 'selected',
      commandCount: 0,
      pending: false,
      preview: false,
    })

    const response = await invokeAssistantTool(
      { toolId: candidateId, source: resolution.source },
      context,
      registry,
    )
    const responseToolCalls = response?.toolCalls ?? []
    traces.push(...responseToolCalls)
    if (response?.handled) {
      const extraTrace = resolution.source === 'llm'
        ? ['通过意图识别选择并调用工具/工作流']
        : ['使用确定性候选优先级选择并调用工具/工作流']
      return {
        ...response,
        internalTrace: response.internalTrace ? [...extraTrace, ...response.internalTrace] : extraTrace,
        toolCalls: traces,
      }
    }
  }

  return { handled: false, response: '', toolCalls: traces }
}
