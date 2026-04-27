import { useState, useEffect, useCallback } from 'react'

interface WindowTitlebarProps {
  /** 面包屑左侧：可选返回按钮 */
  onBack?: () => void
  /** 面包屑文字（如工作区名 / 任务名） */
  breadcrumb?: string
  /** Extra action buttons rendered between breadcrumb and window controls */
  actions?: React.ReactNode
}

export function WindowTitlebar({ onBack, breadcrumb, actions }: WindowTitlebarProps) {
  const [maximized, setMaximized] = useState(false)

  const checkMaximized = useCallback(async () => {
    try {
      const val = await window.electronAPI.app.isMaximized()
      setMaximized(val)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    checkMaximized()
    // Check on resize
    const handler = () => checkMaximized()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [checkMaximized])

  const handleMinimize = () => window.electronAPI.app.minimize()
  const handleMaximize = () => {
    window.electronAPI.app.maximize()
    setTimeout(checkMaximized, 100)
  }
  const handleClose = () => window.electronAPI.app.close()

  return (
    <div className="h-10 bg-surface-container/95 border-b border-outline-variant titlebar-drag select-none flex-shrink-0 backdrop-blur-sm">
      <div className="app-chrome-shell grid h-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
        {/* Left: breadcrumb area */}
        <div className="flex min-w-0 items-center gap-1 titlebar-no-drag">
          {onBack && (
            <button
              className="p-1 rounded-md hover:bg-surface-container-high"
              onClick={onBack}
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
            </button>
          )}
          <span className="text-xs text-on-surface-variant truncate">
            {breadcrumb ?? 'AiNote'}
          </span>
        </div>

        {/* Center: action buttons */}
        <div className="flex items-center justify-self-center gap-1 titlebar-no-drag">
          {actions}
        </div>

        {/* Right: window controls */}
        <div className="flex items-center justify-self-end titlebar-no-drag">
          <button
            className="w-10 h-8 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors"
            onClick={handleMinimize}
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">minimize</span>
          </button>
          <button
            className="w-10 h-8 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors"
            onClick={handleMaximize}
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              {maximized ? 'filter_none' : 'crop_square'}
            </span>
          </button>
          <button
            className="w-10 h-8 flex items-center justify-center rounded-md hover:bg-error/20 transition-colors"
            onClick={handleClose}
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
