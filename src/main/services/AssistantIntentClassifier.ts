import { completion, type ApiMessage, type LLMStreamConfig } from './LLMService'
import type {
  AssistantIntentClassificationRequest,
  AssistantIntentClassifier,
  AssistantIntentResolution,
} from './AssistantPlannerModels'

function canUseIntentClassifier(config: AssistantIntentClassificationRequest['config']): boolean {
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

function normalizeResolution(
  parsed: unknown,
  validCandidateIds: Set<string>,
): AssistantIntentResolution | null {
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>
  const orderedCandidateIds = Array.isArray(record.orderedCandidateIds)
    ? record.orderedCandidateIds.filter((value): value is string => typeof value === 'string' && validCandidateIds.has(value))
    : []

  if (orderedCandidateIds.length === 0) return null

  return {
    orderedCandidateIds,
    source: 'llm',
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    needsClarification: record.needsClarification === true,
    clarificationQuestion: typeof record.clarificationQuestion === 'string'
      ? record.clarificationQuestion
      : undefined,
  }
}

export async function classifyAssistantIntentWithLLM(
  request: AssistantIntentClassificationRequest,
  invokeCompletion: (messages: ApiMessage[], config: LLMStreamConfig) => Promise<string> = completion,
): Promise<AssistantIntentResolution | null> {
  if (!canUseIntentClassifier(request.config) || request.candidates.length <= 1) {
    return null
  }

  const messages: ApiMessage[] = [
    {
      role: 'system',
      content: [
        '你是一个结构化任务路由器。',
        '你只负责在候选 tool/workflow 中按最符合用户真实意图的顺序排序。',
        'pattern 只代表线索，不代表必须执行。',
        '如果用户消息里既有上下文限定（如工作区）又有具体任务目标，优先保留任务目标，把上下文当作参数。',
        '你必须只返回 JSON，不要输出解释性文字。',
        'JSON schema: {"orderedCandidateIds": string[], "reason": string, "needsClarification": boolean, "clarificationQuestion": string}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        input: request.input,
        candidates: request.candidates,
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
    const parsed = JSON.parse(json)
    return normalizeResolution(parsed, new Set(request.candidates.map((candidate) => candidate.id)))
  } catch {
    return null
  }
}

export const classifyAssistantIntent: AssistantIntentClassifier = async (request) =>
  classifyAssistantIntentWithLLM(request)
