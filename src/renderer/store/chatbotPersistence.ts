import type { ChatMessage, LLMConfig } from '@shared/types'
import { normalizeLLMConfig } from '@shared/assistantConfig'

export type ChatbotPersistenceSnapshot = {
  messages: ChatMessage[]
  isStreaming: boolean
  config: LLMConfig
}

type ChatbotPersistenceInput = {
  messages?: unknown
  isStreaming?: boolean
  config?: Partial<LLMConfig> | null
}

export function serializeChatbotPersistenceSnapshot(
  state: ChatbotPersistenceInput,
): ChatbotPersistenceSnapshot {
  return {
    messages: Array.isArray(state.messages) ? state.messages as ChatMessage[] : [],
    isStreaming: Boolean(state.isStreaming),
    config: normalizeLLMConfig(state.config ?? undefined),
  }
}

export function restoreChatbotPersistenceSnapshot(
  persisted: unknown,
): ChatbotPersistenceSnapshot {
  const data = (persisted && typeof persisted === 'object')
    ? persisted as ChatbotPersistenceInput
    : {}

  return {
    messages: Array.isArray(data.messages) ? data.messages as ChatMessage[] : [],
    isStreaming: false,
    config: normalizeLLMConfig(data.config ?? undefined),
  }
}