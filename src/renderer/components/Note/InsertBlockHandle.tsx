import { useState } from 'react'

interface InsertBlockHandleProps {
  onInsert: (type: 'markdown' | 'code') => void
}

export function InsertBlockHandle({ onInsert }: InsertBlockHandleProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className="group relative h-2 flex items-center justify-center -my-1"
      onMouseEnter={() => {}}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Hover line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-transparent group-hover:bg-primary/30 transition-colors" />

      {/* Plus button */}
      <button
        className="relative z-10 w-5 h-5 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary"
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="material-symbols-outlined text-xs">add</span>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-full mt-1 z-20 bg-surface rounded-lg shadow-lg border border-outline-variant py-1 min-w-[120px]">
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
            onClick={() => {
              onInsert('markdown')
              setShowMenu(false)
            }}
          >
            <span className="material-symbols-outlined text-sm">notes</span>
            文本块
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
            onClick={() => {
              onInsert('code')
              setShowMenu(false)
            }}
          >
            <span className="material-symbols-outlined text-sm">code</span>
            代码块
          </button>
        </div>
      )}
    </div>
  )
}
