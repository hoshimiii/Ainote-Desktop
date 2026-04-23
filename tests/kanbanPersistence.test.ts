import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'

test('normalizePersistedKanbanState clears invalid active selections and dangling references', () => {
  const restored = normalizePersistedKanbanState({
    workspaces: [{ id: 'ws-1', name: '工作区', missionIds: ['mission-1', 'ghost-mission'] }],
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区', boardIds: ['board-1', 'ghost-board'], noteIds: ['note-1', 'ghost-note'] },
    },
    boards: {
      'board-1': { id: 'board-1', title: '看板', taskIds: ['task-1', 'ghost-task'] },
    },
    tasks: {
      'task-1': { id: 'task-1', title: '任务', description: '', subtasks: [] },
    },
    notes: {
      'note-1': { id: 'note-1', title: '笔记', blocks: [] },
    },
    missionOrder: { 'ws-1': ['ghost-mission', 'mission-1'] },
    boardOrder: { 'mission-1': ['ghost-board', 'board-1'] },
    activeWorkSpaceId: 'ghost-workspace',
    currentMissionId: 'mission-1',
    currentBoardId: 'board-1',
    currentNoteId: 'note-1',
    centerTab: 'notes',
    previewMissionId: 'ghost-mission',
    missionPanelCollapsed: true,
    listPanelCollapsed: false,
  })

  assert.equal(restored.activeWorkSpaceId, null)
  assert.equal(restored.currentMissionId, null)
  assert.equal(restored.currentBoardId, null)
  assert.equal(restored.currentNoteId, null)
  assert.equal(restored.previewMissionId, null)
  assert.deepEqual(restored.workspaces[0].missionIds, ['mission-1'])
  assert.deepEqual(restored.missionOrder['ws-1'], ['mission-1'])
  assert.deepEqual(restored.missions['mission-1'].boardIds, ['board-1'])
  assert.deepEqual(restored.boardOrder['mission-1'], ['board-1'])
  assert.deepEqual(restored.missions['mission-1'].noteIds, ['note-1'])
  assert.deepEqual(restored.boards['board-1'].taskIds, ['task-1'])
})
