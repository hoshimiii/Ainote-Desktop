import { create } from 'zustand'
import { attachSqlitePersist } from './sqlitePersist'
import type { ChatMessage, LLMConfig } from '@shared/types'
import {
  buildAssistantSystemPrompt,
  DEFAULT_LLM_CONFIG,
  normalizeLLMConfig,
} from '@shared/assistantConfig'
import {
  restoreChatbotPersistenceSnapshot,
  serializeChatbotPersistenceSnapshot,
} from './chatbotPersistence'

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

    sendMessage: async (content) => {
      const state = get()
      if (state.isStreaming) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      set((s) => ({
        messages: [...s.messages, userMsg, assistantMsg],
        isStreaming: true,
      }))

      if (state.config.enableFormalTools && state.config.workflowPreset === 'structured') {
        try {
          const structured = await window.electronAPI.kanban.planAndSolve(content, state.config)
          if (structured.handled) {
            set((s) => {
              const msgs = [...s.messages]
              const last = msgs[msgs.length - 1]
              if (last?.role === 'assistant') {
                const trace = structured.plan?.length
                  ? `\n\n${structured.plan.map((step) => `- ${step}`).join('\n')}`
                  : ''
                msgs[msgs.length - 1] = { ...last, content: `${structured.response}${trace}` }
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
      const isKimi = /moonshot|kimi/i.test(state.config.baseurl + state.config.model)
      const assistantSystemPrompt = buildAssistantSystemPrompt(state.config)
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
        model: state.config.model,
        temperature: state.config.temperature,
        baseURL: state.config.baseurl,
        apiKey: state.config.usertoken,
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
