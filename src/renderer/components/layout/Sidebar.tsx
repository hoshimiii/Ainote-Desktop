import { cn } from '../ui/cn'

interface SidebarProps {
  children: React.ReactNode
  className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-screen w-64 flex-shrink-0 bg-surface-container-low flex flex-col py-8 font-display tracking-tight text-sm',
        className,
      )}
    >
      {children}
    </aside>
  )
}

interface SidebarHeaderProps {
  children: React.ReactNode
}

export function SidebarHeader({ children }: SidebarHeaderProps) {
  return <div className="px-6 mb-8">{children}</div>
}

interface SidebarNavProps {
  children: React.ReactNode
}

export function SidebarNav({ children }: SidebarNavProps) {
  return <nav className="flex-1 space-y-1 px-2">{children}</nav>
}

interface SidebarNavItemProps {
  icon: string
  label: string
  active?: boolean
  onClick?: () => void
}

export function SidebarNavItem({ icon, label, active, onClick }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 py-3 pl-4 rounded-xl transition-colors cursor-pointer',
        active
          ? 'text-on-surface font-semibold bg-surface-container'
          : 'text-on-surface-variant hover:bg-surface-container/50',
      )}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface SidebarFooterProps {
  children: React.ReactNode
}

export function SidebarFooter({ children }: SidebarFooterProps) {
  return (
    <div className="px-6 mt-auto pt-6 border-t border-outline-variant/15">
      {children}
    </div>
  )
}
