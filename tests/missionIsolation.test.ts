import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForHydration } from '../src/renderer/store/sqlitePersist'
import { orderOwnedIds } from '../src/shared/orderedIds'

type KanbanHook = typeof import('../src/renderer/store/kanban').useKanbanStore

let useKanbanStorePromise: Promise<KanbanHook> | null = null

function ensureWindow() {
  ;(globalThis as { window?: unknown }).window = {
    electronAPI: ({
      store: {
        get: async () => undefined,
        set: async () => {},
        reset: async () => {},
        onRehydrate: () => () => {},
      },
    } as unknown as Window['electronAPI']),
  }
}

async function loadKanbanStore(): Promise<KanbanHook> {
  if (!useKanbanStorePromise) {
    ensureWindow()
    useKanbanStorePromise = import('../src/renderer/store/kanban').then(async (module) => {
      await waitForHydration('kanban')
      return module.useKanbanStore
    })
  }

  return useKanbanStorePromise
}

async function resetKanbanStore() {
  const useKanbanStore = await loadKanbanStore()
  useKanbanStore.setState({
    workspaces: [
      { id: 'ws-1', name: '工作区 A', missionIds: ['mission-1', 'mission-2'] },
      { id: 'ws-2', name: '工作区 B', missionIds: ['mission-3'] },
    ],
    activeWorkSpaceId: 'ws-1',
    currentMissionId: null,
    currentNoteId: null,
    currentBoardId: null,
    centerTab: 'boards',
    previewMissionId: null,
    rehydrationError: null,
    transientRecoveryActive: false,
    transientRecoveryMessage: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区 1', boardIds: [], noteIds: [] },
      'mission-2': { id: 'mission-2', title: '任务区 2', boardIds: [], noteIds: [] },
      'mission-3': { id: 'mission-3', title: '任务区 3', boardIds: [], noteIds: [] },
    },
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: {
      'ws-1': ['mission-2'],
      'ws-2': ['mission-3'],
    },
    boardOrder: {},
  })

  return useKanbanStore
}

test('orderOwnedIds keeps sidebar mission list isolated to the active workspace', () => {
  const displayIds = orderOwnedIds(['mission-1', 'mission-2'], ['mission-3', 'mission-2'])
  assert.deepEqual(displayIds, ['mission-2', 'mission-1'])
})

test('reorderMissions does not introduce foreign mission ids into the active workspace order', async () => {
  const useKanbanStore = await resetKanbanStore()

  useKanbanStore.getState().reorderMissions('ws-1', ['mission-3', 'mission-2'])

  assert.deepEqual(useKanbanStore.getState().missionOrder['ws-1'], ['mission-2', 'mission-1'])
  assert.deepEqual(useKanbanStore.getState().missionOrder['ws-2'], ['mission-3'])
})

test('createMission and deleteMission keep workspace ownership synchronized', async () => {
  const useKanbanStore = await resetKanbanStore()
  const missionId = 'mission-4'

  useKanbanStore.getState().createMission({
    id: missionId,
    title: '任务区 4',
    boardIds: [],
    noteIds: [],
  })

  assert.deepEqual(useKanbanStore.getState().workspaces[0].missionIds, ['mission-1', 'mission-2', missionId])
  assert.deepEqual(useKanbanStore.getState().missionOrder['ws-1'], ['mission-2', missionId, 'mission-1'])

  useKanbanStore.getState().deleteMission(missionId)

  assert.deepEqual(useKanbanStore.getState().workspaces[0].missionIds, ['mission-1', 'mission-2'])
  assert.deepEqual(useKanbanStore.getState().missionOrder['ws-1'], ['mission-2', 'mission-1'])
})