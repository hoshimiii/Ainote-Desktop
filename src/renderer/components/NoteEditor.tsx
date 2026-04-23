import { cn } from './ui/cn'

interface NoteEditorProps {
  children: React.ReactNode
  className?: string
}

export function NoteEditor({ children, className }: NoteEditorProps) {
  return (
    <div className={cn('flex-1 bg-surface overflow-y-auto custom-scrollbar', className)}>
      <div className="max-w-[65ch] mx-auto py-12 px-8">{children}</div>
    </div>
  )
}

interface NoteEditorTitleProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function NoteEditorTitle({ value, onChange, placeholder = 'Untitled' }: NoteEditorTitleProps) {
  return (
    <div className="relative mb-6 group">
      {/* Cursor Pillar focus indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-focus-within:opacity-100 transition-opacity" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-2xl font-bold font-display text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none pl-4"
      />
    </div>
  )
}

interface NoteEditorContentProps {
  children: React.ReactNode
}

export function NoteEditorContent({ children }: NoteEditorContentProps) {
  return (
    <div className="prose prose-slate max-w-none text-on-surface leading-[1.6]">
      {children}
    </div>
  )
}
