import { create } from 'zustand'
import { attachSqlitePersist } from './sqlitePersist'
import type { ChatMessage, LLMConfig } from '@shared/types'
import {
  buildAssistantSystemPrompt,
  DEFAULT_LLM_CONFIG,
  normalizeLlmFallbackConfig,
  normalizeLLMConfig,
} from '@shared/assistantConfig'
import {
  restoreChatbotPersistenceSnapshot,
  serializeChatbotPersistenceSnapshot,
} from './chatbotPersistence'
import { useKanbanStore } from './kanban'

const PREVIEW_RESOLUTION_PATTERN = /^(确认|确认执行|执行|执行吧|继续|继续执行|好的执行|yes|ok|okay|取消|取消执行|算了|不用了|停止)$/i

function mapPreviewResolutionAction(content: string): 'confirm' | 'cancel' | null {
  const trimmed = content.trim()
  if (!PREVIEW_RESOLUTION_PATTERN.test(trimmed)) return null
  return /^(取消|取消执行|算了|不用了|停止)$/i.test(trimmed) ? 'cancel' : 'confirm'
}

function clearConsumedPreviewActions(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => (
    message.previewAction
      ? { ...message, previewAction: undefined }
      : message
  ))
}

function formatStructuredAssistantContent(structured: { response: string; plan?: string[] }): string {
  const visiblePlan = structured.plan?.length
    ? `\n\n${structured.plan.map((step) => `- ${step}`).join('\n')}`
    : ''
  return `${structured.response}${visiblePlan}`
}

type ResolvePreviewOptions = {
  appendUserMessage?: boolean
  userMessageContent?: string
}

export interface ChatbotStore {
  messages: ChatMessage[]
  isStreaming: boolean
  config: LLMConfig

  addMessage: (msg: ChatMessage) => void
  updateLastAssistant: (content: string) => void
  clearMessages: () => void
  setStreaming: (streaming: boolean) => void
  setConfig: (config: Partial<LLMConfig>) => void

  sendMessage: (content: string) => void
  resolvePreview: (action: 'confirm' | 'cancel', pendingPreviewId: string, options?: ResolvePreviewOptions) => Promise<void>
}

export const useChatbotStore = create<ChatbotStore>()(
  (set, get) => ({
    messages: [],
    isStreaming: false,
    config: DEFAULT_LLM_CONFIG,

    addMessage: (msg) => {
      set((s) => ({ messages: [...s.messages, msg] }))
    },

    updateLastAssistant: (content) => {
      set((s) => {
        const msgs = [...s.messages]
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant') {
            msgs[i] = { ...msgs[i], content }
            break
          }
        }
        return { messages: msgs }
      })
    },

    clearMessages: () => {
      set({ messages: [] })
    },

    setStreaming: (streaming) => {
      set({ isStreaming: streaming })
    },

    setConfig: (partial) => {
      const newConfig = normalizeLLMConfig({ ...get().config, ...partial })
      set({ config: newConfig })
      // Primary: immediately flush to store:chatbot (always-registered handler, bypasses debounce)
      const state = get()
      const snapshot = serializeChatbotPersistenceSnapshot({
        messages: state.messages,
        isStreaming: state.isStreaming,
        config: newConfig,
      })
      window.electronAPI.store.set('chatbot', snapshot).catch(console.error)
      // Secondary: best-effort encrypted write (may not be registered in dev HMR scenarios)
      window.electronAPI.botConfig?.set(newConfig).catch(() => { /* silently ignore */ })
    },

    resolvePreview: async (action, pendingPreviewId, options) => {
      const state = get()
      if (state.isStreaming) return

      const userContent = options?.appendUserMessage
        ? (options.userMessageContent?.trim() || (action === 'confirm' ? '确认' : '取消'))
        : null

      const userMsg: ChatMessage | null = userContent
        ? {
            id: crypto.randomUUID(),
            role: 'user',
            content: userContent,
            timestamp: Date.now(),
          }
        : null
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      useKanbanStore.getState().setPreviewSessionStatus('committing')
      set((s) => ({
        messages: [
          ...clearConsumedPreviewActions(s.messages),
          ...(userMsg ? [userMsg] : []),
          assistantMsg,
        ],
        isStreaming: true,
      }))

      try {
        const resolved = await window.electronAPI.kanban.resolvePreview(action, pendingPreviewId, state.config)
        useKanbanStore.getState().clearPreviewSession()

        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = {
              ...last,
              content: formatStructuredAssistantContent(resolved),
            }
          }
          return { messages: msgs, isStreaming: false }
        })
      } catch (error) {
        console.error('[chatbot] preview resolution failed', error)
        useKanbanStore.getState().setPreviewSessionStatus('previewing')
        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = {
              ...last,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
          return { messages: msgs, isStreaming: false }
        })
      }
    },

    sendMessage: async (content) => {
      const state = get()
      if (state.isStreaming) return
      const trimmedContent = content.trim()
      const consumePreviewAction = PREVIEW_RESOLUTION_PATTERN.test(trimmedContent)
      const previewResolutionAction = mapPreviewResolutionAction(trimmedContent)
      const activePreviewId = useKanbanStore.getState().previewSession?.pendingPreviewId

      if (
        state.config.enableFormalTools
        && state.config.workflowPreset === 'structured'
        && previewResolutionAction
        && activePreviewId
      ) {
        await get().resolvePreview(previewResolutionAction, activePreviewId, {
          appendUserMessage: true,
          userMessageContent: trimmedContent,
        })
        return
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedContent,
        timestamp: Date.now(),
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      set((s) => ({
        messages: [
          ...(consumePreviewAction ? clearConsumedPreviewActions(s.messages) : s.messages),
          userMsg,
          assistantMsg,
        ],
        isStreaming: true,
      }))

      if (state.config.enableFormalTools && state.config.workflowPreset === 'structured') {
        try {
          const structured = await window.electronAPI.kanban.planAndSolve(trimmedContent, state.config)
          if (structured.handled) {
            if (structured.preview && structured.pendingPreviewId) {
              useKanbanStore.getState().setPreviewSession({
                pendingPreviewId: structured.pendingPreviewId,
                snapshot: structured.preview.snapshot,
                summary: structured.preview.summary,
                baseSnapshotFingerprint: structured.preview.baseSnapshotFingerprint ?? null,
              })
            }

            set((s) => {
              const msgs = [...s.messages]
              const last = msgs[msgs.length - 1]
              if (last?.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: formatStructuredAssistantContent(structured) }
                if (structured.preview && structured.pendingPreviewId) {
                  msgs[msgs.length - 1] = {
                    ...msgs[msgs.length - 1],
                    previewAction: {
                      pendingPreviewId: structured.pendingPreviewId,
                      summary: structured.preview.summary,
                    },
                  }
                }
              }
              return { messages: msgs, isStreaming: false }
            })
            return
          }
        } catch (error) {
          console.error('[chatbot] structured workflow failed, falling back to LLM stream', error)
        }
      }

      // Setup stream listeners
      const removeToken = window.electronAPI.llm.onStreamToken((token) => {
        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + token }
          }
          return { messages: msgs }
        })
      })

      const removeEnd = window.electronAPI.llm.onStreamEnd(() => {
        set({ isStreaming: false })
        removeToken()
        removeEnd()
        removeError()
      })

      const removeError = window.electronAPI.llm.onStreamError((error) => {
        const hint = /401|api key|authorization|incorrect api key/i.test(error)
          ? '\n\n提示：请前往 Settings \u2192 AI Config 检查 API Key 配置。'
          : ''
        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: `Error: ${error}${hint}` }
          }
          return { messages: msgs, isStreaming: false }
        })
        removeToken()
        removeEnd()
        removeError()
      })

      // Format messages for LLM
      // Kimi (Moonshot) does not accept role='assistant'; map to 'system' before sending
      // Also filter out empty messages (e.g. the placeholder assistantMsg added above)
      const fallbackConfig = normalizeLlmFallbackConfig(state.config)
      const isKimi = /moonshot|kimi/i.test(fallbackConfig.baseurl + fallbackConfig.model)
      const assistantSystemPrompt = buildAssistantSystemPrompt(fallbackConfig)
      const llmMessages = [
        ...(assistantSystemPrompt.trim()
          ? [{ role: 'system', content: assistantSystemPrompt }]
          : []),
        ...get().messages,
      ]
        .filter((m) => m.content.trim() !== '')
        .map((m) => ({
          role: isKimi && m.role === 'assistant' ? 'system' : m.role,
          content: m.content,
        }))

      // Trigger stream via IPC
      window.electronAPI.llm.stream(llmMessages, {
        model: fallbackConfig.model,
        temperature: fallbackConfig.temperature,
        baseURL: fallbackConfig.baseurl,
        apiKey: fallbackConfig.usertoken,
      })
    },
  }),
)

attachSqlitePersist(useChatbotStore, {
  name: 'chatbot',
  debounceMs: 1000,
  serialize: (state) => serializeChatbotPersistenceSnapshot({
    messages: state.messages,
    isStreaming: state.isStreaming,
    config: state.config,
  }),
  restore: (persisted) => restoreChatbotPersistenceSnapshot(persisted),
})

// Prevent Vite HMR from triggering a full page reload when this module changes
if (import.meta.hot) import.meta.hot.accept()
