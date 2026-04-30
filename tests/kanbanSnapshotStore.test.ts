import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'
import { loadKanbanSnapshot, saveKanbanSnapshot } from '../src/main/services/KanbanSnapshotStore'

test('saveKanbanSnapshot writes store state and broadcasts rehydrate', () => {
  const snapshot = normalizePersistedKanbanState(null)
  let writtenKey = ''
  let writtenValue = ''
  let broadcastCount = 0

  saveKanbanSnapshot(snapshot, {
    setRaw: (key, value) => {
      writtenKey = key
      writtenValue = value
    },
    broadcastRehydrate: () => {
      broadcastCount += 1
    },
  })

  assert.equal(writtenKey, 'store:kanban')
  assert.ok(writtenValue.includes('"workspaces"'))
  assert.equal(broadcastCount, 1)
})

test('loadKanbanSnapshot falls back to an empty normalized snapshot for invalid data', () => {
  const snapshot = loadKanbanSnapshot({
    getRaw: () => '{invalid json',
  })

  assert.deepEqual(snapshot.workspaces, [])
  assert.equal(snapshot.activeWorkSpaceId, null)
})
