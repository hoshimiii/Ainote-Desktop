import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Block } from '@shared/types'

interface MarkdownBlockProps {
  block: Block
  onChange: (block: Block) => void
  onDelete: () => void
  selected?: boolean
  onSelect?: () => void
}

export function MarkdownBlock({ block, onChange, onDelete, selected, onSelect }: MarkdownBlockProps) {
  const [editing, setEditing] = useState(!block.content)
  const [localContent, setLocalContent] = useState(block.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalContent(block.content)
  }, [block.id])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      autoResize()
    }
  }, [editing])

  const autoResize = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  const handleChange = useCallback(
    (value: string) => {
      setLocalContent(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange({ ...block, content: value })
      }, 300)
    },
    [block, onChange],
  )

  const handleBlur = () => {
    // Persist and switch to rendered
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onChange({ ...block, content: localContent })
    if (localContent.trim()) {
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="group relative">
        <div className="absolute -left-8 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-0.5 rounded hover:bg-surface-container-high" onClick={onDelete}>
            <span className="material-symbols-outlined text-xs text-on-surface-variant">close</span>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => {
            handleChange(e.target.value)
            autoResize()
          }}
          onBlur={handleBlur}
          className="w-full bg-transparent text-base text-on-surface leading-[1.6] resize-none focus:outline-none placeholder:text-on-surface-variant/50"
          placeholder="输入 Markdown 内容..."
          rows={1}
        />
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className="absolute -left-8 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-0.5 rounded hover:bg-surface-container-high" onClick={onDelete}>
          <span className="material-symbols-outlined text-xs text-on-surface-variant">close</span>
        </button>
      </div>
      <div
        className={`prose prose-sm max-w-none cursor-pointer text-on-surface rounded-lg transition-shadow
          ${selected ? 'ring-2 ring-primary/40' : ''}
          prose-headings:text-on-surface prose-headings:font-display
          prose-p:text-on-surface prose-p:leading-[1.6]
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-code:text-on-surface prose-code:bg-surface-container-high prose-code:rounded prose-code:px-1
          prose-pre:bg-surface-container-high prose-pre:rounded-xl
          prose-strong:text-on-surface
          prose-ul:text-on-surface prose-ol:text-on-surface
          prose-blockquote:text-on-surface-variant prose-blockquote:border-outline-variant`}
        onClick={(e) => { e.stopPropagation(); onSelect?.() }}
        onDoubleClick={() => setEditing(true)}
      >
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {localContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}
