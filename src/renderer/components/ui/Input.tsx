import { cn } from './cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** "Invisible" style for note titles - no visible border */
  invisible?: boolean
}

export function Input({ className, invisible, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/50 transition-all focus:outline-none',
        invisible
          ? 'border-none text-lg font-bold font-display focus:ring-0'
          : 'bg-surface-container-highest/50 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary/20',
        className,
      )}
      {...props}
    />
  )
}
