import { useState, useEffect, useRef, createContext, useContext, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

// --- Dialog Context ---
interface DialogCtx {
  open: boolean
  setOpen: (v: boolean) => void
}
const DialogContext = createContext<DialogCtx>({ open: false, setOpen: () => {} })

export function Dialog({ open: controlledOpen, onOpenChange, children }: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = useCallback((v: boolean) => {
    setInternalOpen(v)
    onOpenChange?.(v)
  }, [onOpenChange])

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(DialogContext)
  if (asChild) {
    return <span onClick={() => setOpen(true)}>{children}</span>
  }
  return <button type="button" onClick={() => setOpen(true)}>{children}</button>
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(DialogContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        ref={ref}
        className={cn(
          'relative z-50 w-full max-w-md rounded-2xl bg-surface-container p-6 shadow-xl animate-in fade-in zoom-in-95',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold text-on-surface', className)}>{children}</h2>
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>
}

// --- Alert Dialog (confirmation variant) ---
export function AlertDialog({ open: controlledOpen, onOpenChange, children }: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: ReactNode
}) {
  return <Dialog open={controlledOpen} onOpenChange={onOpenChange}>{children}</Dialog>
}

export const AlertDialogTrigger = DialogTrigger
export const AlertDialogContent = DialogContent
export const AlertDialogHeader = DialogHeader
export const AlertDialogTitle = DialogTitle
export const AlertDialogFooter = DialogFooter

export function AlertDialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-on-surface-variant', className)}>{children}</p>
}

export function AlertDialogAction({ children, className, onClick }: {
  children: ReactNode; className?: string; onClick?: () => void
}) {
  const { setOpen } = useContext(DialogContext)
  return (
    <button
      type="button"
      className={cn('rounded-lg bg-error px-4 py-2 text-sm font-medium text-on-error hover:bg-error/90', className)}
      onClick={() => { onClick?.(); setOpen(false) }}
    >
      {children}
    </button>
  )
}

export function AlertDialogCancel({ children, className }: { children: ReactNode; className?: string }) {
  const { setOpen } = useContext(DialogContext)
  return (
    <button
      type="button"
      className={cn('rounded-lg bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-highest', className)}
      onClick={() => setOpen(false)}
    >
      {children ?? 'Cancel'}
    </button>
  )
}
