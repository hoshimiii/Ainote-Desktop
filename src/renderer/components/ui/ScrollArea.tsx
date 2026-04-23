import { useRef, type ReactNode } from 'react'
import { cn } from './cn'

export function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className={cn('overflow-y-auto scrollbar-thin', className)}
    >
      {children}
    </div>
  )
}

export function Separator({ className, orientation = 'horizontal' }: {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <div
      className={cn(
        'bg-outline-variant',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className,
      )}
    />
  )
}

export function Select({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        'rounded-lg bg-surface-container-high px-3 py-2 text-sm text-on-surface',
        'border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/40',
        className,
      )}
    >
      {children}
    </select>
  )
}
