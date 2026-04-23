import { cn } from './ui/cn'

interface NoteListProps {
  children: React.ReactNode
  className?: string
}

export function NoteList({ children, className }: NoteListProps) {
  return (
    <div className={cn('w-[340px] flex-shrink-0 bg-surface-container-low flex flex-col', className)}>
      {children}
    </div>
  )
}

interface NoteListHeaderProps {
  children: React.ReactNode
}

export function NoteListHeader({ children }: NoteListHeaderProps) {
  return <div className="p-6 pb-2">{children}</div>
}

interface NoteListContentProps {
  children: React.ReactNode
}

export function NoteListContent({ children }: NoteListContentProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-3">
      {children}
    </div>
  )
}

interface NoteListItemProps {
  title: string
  preview?: string
  time?: string
  tags?: string[]
  active?: boolean
  onClick?: () => void
}

export function NoteListItem({ title, preview, time, tags, active, onClick }: NoteListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl transition-all cursor-pointer',
        active
          ? 'bg-surface-container-lowest shadow-sm border-l-2 border-primary'
          : 'hover:bg-surface-container',
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className={cn('text-sm line-clamp-1 text-on-surface', active ? 'font-bold' : 'font-semibold')}>
          {title}
        </h3>
        {time && (
          <span className="text-[10px] text-on-surface-variant opacity-60 flex-shrink-0 ml-2">
            {time}
          </span>
        )}
      </div>
      {preview && (
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
          {preview}
        </p>
      )}
      {tags && tags.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
