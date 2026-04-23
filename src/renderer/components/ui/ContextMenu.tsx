import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: string
  onClick: () => void
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

const ContextMenuContext = createContext<{
  show: (e: React.MouseEvent, items: ContextMenuItem[]) => void
}>({ show: () => {} })

export function useContextMenu() {
  return useContext(ContextMenuContext)
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const show = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    // Clamp position to viewport
    const x = Math.min(e.clientX, window.innerWidth - 180)
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16)
    setMenu({ x, y, items })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  // Close on Escape
  useEffect(() => {
    if (!menu) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menu, close])

  // Close on click outside
  useEffect(() => {
    if (!menu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    // Use capture so it fires before any other click handler
    window.addEventListener('mousedown', handleClick, true)
    return () => window.removeEventListener('mousedown', handleClick, true)
  }, [menu, close])

  return (
    <ContextMenuContext.Provider value={{ show }}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-lg bg-surface-container-high shadow-lg border border-outline-variant py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.items.map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-highest transition-colors text-left"
              onClick={() => {
                item.onClick()
                close()
              }}
            >
              {item.icon && (
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  )
}
