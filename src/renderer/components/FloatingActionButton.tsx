import { cn } from './ui/cn'

interface FloatingActionButtonProps {
  icon: string
  onClick: () => void
  className?: string
  label?: string
}

export function FloatingActionButton({ icon, onClick, className, label }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed bottom-8 right-8 w-14 h-14 rounded-full',
        'bg-gradient-to-br from-primary to-primary-dim',
        'text-on-primary shadow-[0_12px_32px_rgba(42,52,55,0.15)]',
        'flex items-center justify-center',
        'transition-all hover:scale-105 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        'cursor-pointer',
        className,
      )}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  )
}
