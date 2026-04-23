import { useKanbanStore, useAuthStore } from './store'
import { HydrationGate } from './components/HydrationGate'
import { WorkspacesPage } from './components/pages/WorkspacesPage'
import { WorkPage } from './components/pages/WorkPage'
import { LoginPage } from './components/pages/LoginPage'
import { ChatBotWindow } from './components/ChatBot'
import { MiniDialog } from './pages/MiniDialog'
import { ContextMenuProvider } from './components/ui'

export default function App() {
  // If loaded as mini-dialog window, render MiniDialog only
  const isMiniDialog = window.location.hash === '#/mini-dialog'

  if (isMiniDialog) {
    return (
      <HydrationGate>
        <MiniDialog />
      </HydrationGate>
    )
  }

  return (
    <HydrationGate>
      <ContextMenuProvider>
        <AppShell />
      </ContextMenuProvider>
    </HydrationGate>
  )
}

function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppContent />
}

function AppContent() {
  const activeWorkSpaceId = useKanbanStore((s) => s.activeWorkSpaceId)

  return (
    <>
      {activeWorkSpaceId ? <WorkPage /> : <WorkspacesPage />}
      <ChatBotWindow />
    </>
  )
}
