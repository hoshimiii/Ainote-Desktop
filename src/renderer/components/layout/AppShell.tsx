import { Sidebar, SidebarHeader, SidebarNav, SidebarNavItem, SidebarFooter } from './Sidebar'
import { ContentArea } from './ContentArea'

interface AppShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {sidebar}
      <ContentArea>{children}</ContentArea>
    </div>
  )
}

export {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  ContentArea,
}
