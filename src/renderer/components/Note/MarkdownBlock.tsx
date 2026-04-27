import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Block } from '@shared/types'
import { cn } from '../ui/cn'
import {
  getMarkdownBlockContainerClassName,
  getMarkdownCodeClassName,
  isExternalMarkdownLink,
  markdownElementClasses,
} from './markdownRender'

interface MarkdownBlockProps {
  block: Block
  onChange: (block: Block) => void
  onDelete: () => void
  selected?: boolean
  onSelect?: () => void
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className={markdownElementClasses.h1} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className={markdownElementClasses.h2} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className={markdownElementClasses.h3} {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className={markdownElementClasses.p} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className={markdownElementClasses.ul} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className={markdownElementClasses.ol} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className={markdownElementClasses.li} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className={markdownElementClasses.blockquote} {...props}>
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }) => {
    const external = isExternalMarkdownLink(href)
    return (
      <a
        href={href}
        className={markdownElementClasses.a}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        {...props}
      >
        {children}
      </a>
    )
  },
  hr: (props) => <hr className={markdownElementClasses.hr} {...props} />,
  strong: ({ children, ...props }) => (
    <strong className={markdownElementClasses.strong} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className={markdownElementClasses.em} {...props}>
      {children}
    </em>
  ),
  pre: ({ children, ...props }) => (
    <pre className={markdownElementClasses.pre} {...props}>
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => (
    <code className={getMarkdownCodeClassName(className)} {...props}>
      {children}
    </code>
  ),
}

export function MarkdownBlock({ block, onChange, onDelete, selected, onSelect }: MarkdownBlockProps) {
  const [editing, setEditing] = useState(!block.content)
  const [localContent, setLocalContent] = useState(block.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalContent(block.content)
  }, [block.content, block.id])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

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

  const handleEnterEdit = () => {
    onSelect?.()
    setEditing(true)
  }

  if (editing) {
    return (
      <div
        className={cn(
          'group relative rounded-xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors',
          selected
            ? 'border-primary/35 bg-primary/5'
            : 'border-outline-variant/40 bg-surface-container-low',
        )}
      >
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button className="p-1 rounded-md hover:bg-surface-container-highest" onClick={onDelete}>
            <span className="material-symbols-outlined text-xs text-on-surface-variant">close</span>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={localContent}
          onFocus={onSelect}
          onChange={(e) => {
            handleChange(e.target.value)
            autoResize()
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              if (debounceRef.current) clearTimeout(debounceRef.current)
              onChange({ ...block, content: localContent })
              if (localContent.trim()) {
                setEditing(false)
                textareaRef.current?.blur()
              }
            }
          }}
          className="w-full bg-transparent pr-8 text-base text-on-surface leading-[1.7] resize-none focus:outline-none placeholder:text-on-surface-variant/50"
          placeholder="输入 Markdown 内容..."
          rows={1}
        />
      </div>
    )
  }

  return (
    <div className="group relative rounded-2xl border border-transparent px-4 py-3 transition-colors hover:border-outline-variant/50 hover:bg-surface-container-low/60">
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button className="p-1 rounded-md hover:bg-surface-container-highest" onClick={onDelete}>
          <span className="material-symbols-outlined text-xs text-on-surface-variant">close</span>
        </button>
      </div>
      <div
        className={getMarkdownBlockContainerClassName(selected)}
        onClick={(e) => { e.stopPropagation(); onSelect?.() }}
        onDoubleClick={handleEnterEdit}
        onFocus={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleEnterEdit()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {localContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}
