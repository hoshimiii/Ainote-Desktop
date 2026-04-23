import { useState, useRef, useEffect, useCallback } from 'react'
import type { Block } from '@shared/types'

interface CodeBlockEditorProps {
  block: Block
  onChange: (block: Block) => void
  onDelete: () => void
}

export function CodeBlockEditor({ block, onChange, onDelete }: CodeBlockEditorProps) {
  const [localContent, setLocalContent] = useState(block.content)
  const [language, setLanguage] = useState(block.language ?? 'javascript')
  const [running, setRunning] = useState(false)
  const [languages, setLanguages] = useState<string[]>(['javascript', 'python', 'typescript'])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLocalContent(block.content)
    setLanguage(block.language ?? 'javascript')
  }, [block.id])

  useEffect(() => {
    window.electronAPI.code.languages().then(setLanguages).catch(() => {})
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [localContent])

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

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    onChange({ ...block, language: lang })
  }

  const handleRun = async () => {
    if (running) return
    setRunning(true)
    try {
      const result = await window.electronAPI.code.execute(localContent, language)
      const output = (result.stdout + result.stderr).trim()
      onChange({
        ...block,
        content: localContent,
        lastOutput: output || '(无输出)',
        lastExitCode: result.exitCode,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      onChange({
        ...block,
        content: localContent,
        lastOutput: `执行错误: ${msg}`,
        lastExitCode: -1,
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="group relative">
      <div className="absolute -left-8 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-0.5 rounded hover:bg-surface-container-high" onClick={onDelete}>
          <span className="material-symbols-outlined text-xs text-on-surface-variant">close</span>
        </button>
      </div>

      <div className="rounded-xl bg-surface-container-high overflow-hidden">
        {/* Header: language selector + run */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-highest">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-xs text-on-surface-variant font-mono bg-transparent focus:outline-none cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
            onClick={handleRun}
            disabled={running}
          >
            {running ? (
              <span className="animate-spin material-symbols-outlined text-xs">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-xs">play_arrow</span>
            )}
            {running ? '运行中...' : '运行'}
          </button>
        </div>

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full bg-transparent px-4 py-3 text-sm font-mono text-on-surface resize-none focus:outline-none"
          rows={3}
          spellCheck={false}
          placeholder="// 输入代码..."
        />

        {/* Output area */}
        {block.lastOutput != null && (
          <div className="border-t border-outline-variant px-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-on-surface-variant">输出</span>
              {block.lastExitCode != null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    block.lastExitCode === 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-error/10 text-error'
                  }`}
                >
                  exit: {block.lastExitCode}
                </span>
              )}
            </div>
            <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
              {block.lastOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
