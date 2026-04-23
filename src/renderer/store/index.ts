export { useKanbanStore } from './kanban'
export { useChatbotStore } from './chatbot'
export { useAuthStore } from './auth'

// Setup rehydrate listener for cloud sync pull
import { setupRehydrateListener } from './sqlitePersist'
import { restorePersistedKanbanState } from '@shared/kanbanPersistence'
import { useKanbanStore } from './kanban'
setupRehydrateListener()

let transientRecoveryListenerAttached = false

function setupTransientRecoveryListener() {
	if (transientRecoveryListenerAttached) return
	transientRecoveryListenerAttached = true

	window.electronAPI.sync.onTransientRecovery(({ snapshot, message }) => {
		const restored = restorePersistedKanbanState(snapshot)
		useKanbanStore.getState().applyTransientRecovery(restored as Partial<ReturnType<typeof useKanbanStore.getState>>, message)
	})
}

setupTransientRecoveryListener()
