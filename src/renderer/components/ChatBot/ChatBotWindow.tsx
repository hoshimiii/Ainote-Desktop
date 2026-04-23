import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useChatbotStore } from '../../store'
import { Button, ScrollArea, cn } from '../ui'
import { AgentSettingsPanel } from '../settings/AgentSettingsPanel'

export function ChatBotWindow() {
  const [isOpen, setIsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={cn(
          'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg',
          'bg-primary text-on-primary hover:shadow-xl',
          'flex items-center justify-center transition-all',
          isOpen && 'rotate-45',
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-outlined">
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>

      {/* Chat panel */}
      {isOpen &&
        createPortal(
          <div className="fixed bottom-20 right-6 z-50 w-96 h-[500px] rounded-2xl bg-surface-container shadow-2xl border border-outline-variant flex flex-col overflow-hidden">
            <ChatPanel onClose={() => setIsOpen(false)} onOpenSettings={() => setSettingsOpen(true)} />
          </div>,
          document.body,
        )}

      {/* Settings panel */}
      <AgentSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

function ChatPanel({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const messages = useChatbotStore((s) => s.messages)
  const isStreaming = useChatbotStore((s) => s.isStreaming)
  const sendMessage = useChatbotStore((s) => s.sendMessage)
  const clearMessages = useChatbotStore((s) => s.clearMessages)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
          <span className="text-sm font-semibold text-on-surface">AI 助手</span>
        </div>
        <div className="flex gap-1">
          <button
            className="p-1 rounded hover:bg-surface-container-high"
            onClick={onOpenSettings}
            title="设置"
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">settings</span>
          </button>
          <button
            className="p-1 rounded hover:bg-surface-container-high"
            onClick={clearMessages}
            title="清除对话"
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">refresh</span>
          </button>
          <button
            className="p-1 rounded hover:bg-surface-container-high"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">chat_bubble</span>
            关于你的笔记，问我任何问题
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'mb-3 flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-md'
                  : 'bg-surface-container-high text-on-surface rounded-bl-md',
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <div className="bg-surface-container-high text-on-surface-variant rounded-2xl rounded-bl-md px-4 py-2 text-sm">
              <span className="animate-pulse">●●●</span>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-outline-variant">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入消息..."
            className="flex-1 bg-surface-container-high rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
          >
            <span className="material-symbols-outlined text-sm">send</span>
          </Button>
        </div>
      </div>
    </>
  )
}
