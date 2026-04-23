import { cn } from '../ui/cn'

interface ContentAreaProps {
  children: React.ReactNode
  className?: string
}

export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <main className={cn('flex-1 flex overflow-hidden', className)}>
      {children}
    </main>
  )
}
