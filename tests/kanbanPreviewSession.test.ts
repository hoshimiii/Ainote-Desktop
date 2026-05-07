import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForHydration } from '../src/renderer/store/sqlitePersist'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'

type KanbanModule = typeof import('../src/renderer/store/kanban')

let kanbanModulePromise: Promise<KanbanModule> | null = null

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

async function loadKanbanModule(): Promise<KanbanModule> {
  if (!kanbanModulePromise) {
    ensureWindow()
    kanbanModulePromise = import('../src/renderer/store/kanban').then(async (module) => {
      await waitForHydration('kanban')
      return module
    })
  }

  return kanbanModulePromise
}

async function resetKanbanStore() {
  const { useKanbanStore } = await loadKanbanModule()
  useKanbanStore.setState({
    workspaces: [{ id: 'ws-1', name: '工作区 A', missionIds: ['mission-1'] }],
    activeWorkSpaceId: 'ws-1',
    currentMissionId: 'mission-1',
    currentNoteId: null,
    activeNoteTargetBlockId: null,
    currentBoardId: null,
    centerTab: 'boards',
    previewMissionId: null,
    previewSession: null,
    rehydrationError: null,
    transientRecoveryActive: false,
    transientRecoveryMessage: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区 1', boardIds: [], noteIds: [] },
    },
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: { 'ws-1': ['mission-1'] },
    boardOrder: {},
  })

  return useKanbanStore
}

test('preview-aware workspace navigation keeps canonical selection untouched', async () => {
  const { selectEffectiveActiveWorkspaceId } = await loadKanbanModule()
  const useKanbanStore = await resetKanbanStore()

  useKanbanStore.getState().setPreviewSession({
    pendingPreviewId: 'preview-1',
    summary: 'preview',
    snapshot: normalizePersistedKanbanState({
      workspaces: [
        { id: 'ws-1', name: '工作区 A', missionIds: ['mission-1'] },
        { id: 'ws-preview', name: '预览工作区', missionIds: [] },
      ],
      activeWorkSpaceId: null,
      currentMissionId: null,
    }),
  })

  useKanbanStore.getState().setWorkSpace('ws-preview')

  const state = useKanbanStore.getState()
  assert.equal(state.activeWorkSpaceId, 'ws-1')
  assert.equal(state.previewSession?.snapshot.activeWorkSpaceId, 'ws-preview')
  assert.equal(selectEffectiveActiveWorkspaceId(state), 'ws-preview')
})

test('applyLoadedSnapshot clears preview session during canonical rehydrate', async () => {
  const useKanbanStore = await resetKanbanStore()

  useKanbanStore.getState().setPreviewSession({
    pendingPreviewId: 'preview-1',
    summary: 'preview',
    snapshot: normalizePersistedKanbanState({
      workspaces: [{ id: 'ws-preview', name: '预览工作区', missionIds: [] }],
      activeWorkSpaceId: 'ws-preview',
    }),
  })

  useKanbanStore.getState().applyLoadedSnapshot({
    workspaces: [{ id: 'ws-2', name: '工作区 B', missionIds: [] }],
    activeWorkSpaceId: 'ws-2',
  })

  const state = useKanbanStore.getState()
  assert.equal(state.previewSession, null)
  assert.equal(state.activeWorkSpaceId, 'ws-2')
})
