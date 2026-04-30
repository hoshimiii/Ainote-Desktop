import { BrowserWindow } from 'electron'
import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import { normalizeFormalCommandSnapshot } from '@shared/formalKanbanCommands'
import { settingsDao } from '../database'

const STORE_KEY = 'store:kanban'

export type KanbanSnapshotStoreDependencies = {
  getRaw?: (key: string) => string | null | undefined
  setRaw?: (key: string, value: string) => void
  broadcastRehydrate?: () => void
}

function defaultBroadcastRehydrate() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('store-rehydrate')
  }
}

export function loadKanbanSnapshot(deps: KanbanSnapshotStoreDependencies = {}): KanbanPersistedState {
  const getRaw = deps.getRaw ?? ((key: string) => settingsDao.get(key))
  const raw = getRaw(STORE_KEY)
  if (!raw) return normalizeFormalCommandSnapshot(null)
  try {
    return normalizeFormalCommandSnapshot(JSON.parse(raw))
  } catch {
    return normalizeFormalCommandSnapshot(null)
  }
}

export function saveKanbanSnapshot(
  snapshot: KanbanPersistedState,
  deps: KanbanSnapshotStoreDependencies = {},
): void {
  const setRaw = deps.setRaw ?? ((key: string, value: string) => settingsDao.set(key, value))
  const broadcastRehydrate = deps.broadcastRehydrate ?? defaultBroadcastRehydrate
  setRaw(STORE_KEY, JSON.stringify(snapshot))
  broadcastRehydrate()
}

export { STORE_KEY as KANBAN_SNAPSHOT_STORE_KEY }
