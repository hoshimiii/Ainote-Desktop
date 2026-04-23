import { cn } from './ui/cn'

interface TaskBoardProps {
  children: React.ReactNode
  className?: string
}

export function TaskBoard({ children, className }: TaskBoardProps) {
  return (
    <div className={cn('flex gap-4 p-6 overflow-x-auto flex-1', className)}>
      {children}
    </div>
  )
}

interface TaskColumnProps {
  title: string
  count?: number
  children: React.ReactNode
  className?: string
}

export function TaskColumn({ title, count, children, className }: TaskColumnProps) {
  return (
    <div className={cn('w-72 flex-shrink-0 flex flex-col', className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="space-y-3 flex-1">{children}</div>
    </div>
  )
}

interface TaskCardProps {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  onClick?: () => void
  className?: string
}

export function TaskCard({ title, description, priority, onClick, className }: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 bg-surface-container-lowest rounded-xl cursor-pointer transition-all',
        'hover:shadow-[0_12px_32px_rgba(42,52,55,0.06)]',
        'active:scale-[0.98]',
        className,
      )}
    >
      {priority && (
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full mb-2',
            priority === 'high' && 'bg-error',
            priority === 'medium' && 'bg-tertiary',
            priority === 'low' && 'bg-secondary',
          )}
        />
      )}
      <h4 className="text-sm font-semibold text-on-surface mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-on-surface-variant line-clamp-2">{description}</p>
      )}
    </div>
  )
}
