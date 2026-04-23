import { cn } from './cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation level: 0=base, 1=nesting, 2=active/floating */
  elevation?: 0 | 1 | 2
  /** Active state with left border accent */
  active?: boolean
}

export function Card({ className, elevation = 0, active, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all',
        elevation === 0 && 'bg-surface',
        elevation === 1 && 'bg-surface-container-low',
        elevation === 2 && 'bg-surface-container-lowest shadow-[0_12px_32px_rgba(42,52,55,0.06)]',
        active && 'border-l-2 border-primary',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
