import { create } from 'zustand'
import { attachSqlitePersist } from './sqlitePersist'
import type { ChatMessage, LLMConfig } from '@shared/types'

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
      config: {
        baseurl: '',
        model: '',
        usertoken: '',
        temperature: 0.7,
      },

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
        set((s) => ({ config: { ...s.config, ...partial } }))
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

        const structured = await window.electronAPI.kanban.planAndSolve(content)
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
          set((s) => {
            const msgs = [...s.messages]
            const last = msgs[msgs.length - 1]
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content: `Error: ${error}` }
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
        const llmMessages = get().messages
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

// Attach SQLite persistence
attachSqlitePersist(useChatbotStore, { name: 'chatbot', debounceMs: 1000 })

// Prevent Vite HMR from triggering a full page reload when this module changes
if (import.meta.hot) import.meta.hot.accept()
