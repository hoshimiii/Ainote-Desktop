import { useState, useRef, useEffect } from 'react'
import { useChatbotStore } from '../store'
import { cn } from '../components/ui'
import { normalizeLLMConfig } from '@shared/assistantConfig'

/**
 * Mini Dialog — a Claude Desktop-style floating AI chat window.
 * Activated via Shift+Alt+Space global shortcut.
 * Glassmorphism design with frameless transparent window.
 */
export function MiniDialog() {
  const messages = useChatbotStore((s) => s.messages)
  const isStreaming = useChatbotStore((s) => s.isStreaming)
  const sendMessage = useChatbotStore((s) => s.sendMessage)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Refresh LLM config from store:chatbot on mount and every time the window gains focus.
  // The mini dialog is created once (show:false) and toggled, so useEffect runs once but
  // the focus listener ensures config is fresh on each subsequent show.
  useEffect(() => {
    const refreshConfig = () => {
      window.electronAPI.store.get('chatbot')
        .then((state: { config?: unknown } | null) => {
          const rawConfig = state?.config
          if (rawConfig && typeof rawConfig === 'object') {
            useChatbotStore.setState((s) => ({
              config: normalizeLLMConfig({ ...s.config, ...(rawConfig as Partial<import('@shared/types').LLMConfig>) }),
            }))
          }
        })
        .catch(console.error)
    }
    refreshConfig()
    window.addEventListener('focus', refreshConfig)
    return () => window.removeEventListener('focus', refreshConfig)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  // Show only last 6 messages to keep compact
  const recentMessages = messages.slice(-6)

  return (
    <div className="h-screen w-screen flex flex-col bg-surface/80 backdrop-blur-xl rounded-2xl border border-outline-variant/30 shadow-2xl overflow-hidden select-none">
      {/* Drag handle */}
      <div className="h-6 titlebar-drag flex items-center justify-center">
        <div className="w-8 h-1 rounded-full bg-outline-variant/40" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-thin">
        {recentMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-on-surface-variant/50 text-sm">
            <span className="material-symbols-outlined text-lg mr-2">smart_toy</span>
            Ask anything...
          </div>
        )}
        {recentMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'mb-2 flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary/90 text-on-primary'
                  : 'bg-surface-container-high/80 text-on-surface',
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="text-xs text-on-surface-variant animate-pulse mb-2">●●●</div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 items-center bg-surface-container/60 backdrop-blur rounded-xl border border-outline-variant/20 px-3 py-1.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSend()
              if (e.key === 'Escape') window.electronAPI.dialog.toggle()
            }}
            placeholder="Ask AI..."
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="p-1 rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-primary">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
