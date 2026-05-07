import { completion, type ApiMessage, type LLMStreamConfig } from './LLMService'
import type {
  AssistantStructuredToolCall,
  AssistantToolArguments,
  AssistantToolCallResolution,
  AssistantToolCallRouterRequest,
} from './AssistantPlannerModels'

function canUseToolCallRouter(config: AssistantToolCallRouterRequest['config']): boolean {
  const hasModel = config.model.trim().length > 0
  const hasBaseUrl = config.baseurl.trim().length > 0
  const baseUrlLooksLocal = /localhost|127\.0\.0\.1/i.test(config.baseurl)
  const hasCredential = config.usertoken.trim().length > 0 || baseUrlLooksLocal || config.providerPreset === 'ollama'
  return hasModel && hasBaseUrl && hasCredential
}

function extractJsonObject(raw: string): string | null {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
  return raw.slice(firstBrace, lastBrace + 1)
}

function normalizeArgs(value: unknown): AssistantToolArguments {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const args: AssistantToolArguments = {}
  for (const [key, argValue] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof argValue === 'string'
      || typeof argValue === 'number'
      || typeof argValue === 'boolean'
      || argValue === null
      || argValue === undefined
    ) {
      args[key] = argValue
    }
  }
  return args
}

function normalizeResolution(
  parsed: unknown,
  validToolIds: Set<string>,
): AssistantToolCallResolution | null {
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>

  const toolCalls = Array.isArray(record.toolCalls)
    ? record.toolCalls
      .map((value): AssistantStructuredToolCall | null => {
        if (!value || typeof value !== 'object') return null
        const call = value as Record<string, unknown>
        if (typeof call.toolId !== 'string' || !validToolIds.has(call.toolId)) return null
        return {
          toolId: call.toolId,
          args: normalizeArgs(call.args),
        }
      })
      .filter((value): value is AssistantStructuredToolCall => Boolean(value))
    : []

  if (toolCalls.length === 0 && record.needsClarification !== true) return null

  return {
    toolCalls,
    source: 'llm',
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    needsClarification: record.needsClarification === true,
    clarificationQuestion: typeof record.clarificationQuestion === 'string'
      ? record.clarificationQuestion
      : undefined,
  }
}

export async function routeAssistantToolCallsWithLLM(
  request: AssistantToolCallRouterRequest,
  invokeCompletion: (messages: ApiMessage[], config: LLMStreamConfig) => Promise<string> = completion,
): Promise<AssistantToolCallResolution | null> {
  if (!canUseToolCallRouter(request.config) || request.tools.length === 0) {
    return null
  }

  const messages: ApiMessage[] = [
    {
      role: 'system',
      content: [
        '你是 AiNote 的结构化工具调用路由器。',
        '你必须先判断用户真实意图，再从 tools 中选择一个或多个工具，并抽取结构化 args。',
        '不要因为用户没有使用工具关键词就放弃；应根据语义选择工具。',
        '不要输出解释性文字，只返回 JSON。',
        '如果缺少执行所必需的信息，返回 needsClarification=true 和 clarificationQuestion。',
        'JSON schema: {"toolCalls":[{"toolId":string,"args":object}],"reason":string,"needsClarification":boolean,"clarificationQuestion":string}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        input: request.input,
        contextSummary: request.contextSummary,
        tools: request.tools,
      }, null, 2),
    },
  ]

  try {
    const raw = await invokeCompletion(messages, {
      model: request.config.model,
      temperature: 0,
      baseURL: request.config.baseurl,
      apiKey: request.config.usertoken || undefined,
    })
    const json = extractJsonObject(raw)
    if (!json) return null
    return normalizeResolution(JSON.parse(json), new Set(request.tools.map((tool) => tool.id)))
  } catch {
    return null
  }
}

export const routeAssistantToolCalls = routeAssistantToolCallsWithLLM
