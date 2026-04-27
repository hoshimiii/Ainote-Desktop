import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePersistedKanbanState,
  restorePersistedKanbanStateWithRecovery,
} from '../src/shared/kanbanPersistence'

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

test('normalizePersistedKanbanState recovers an orphan mission with a unique workspace order owner', () => {
  const restored = normalizePersistedKanbanState({
    workspaces: [
      { id: 'ws-1', name: '工作区 A', missionIds: ['mission-1'] },
      { id: 'ws-2', name: '工作区 B', missionIds: ['mission-2'] },
    ],
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区 1', boardIds: [], noteIds: [] },
      'mission-2': { id: 'mission-2', title: '任务区 2', boardIds: [], noteIds: [] },
      'mission-orphan': { id: 'mission-orphan', title: '孤儿任务区', boardIds: [], noteIds: [] },
    },
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: {
      'ws-1': ['mission-1', 'mission-orphan'],
      'ws-2': ['mission-2'],
    },
    boardOrder: {},
    activeWorkSpaceId: 'ws-1',
    currentMissionId: 'mission-orphan',
    currentBoardId: null,
    currentNoteId: null,
    centerTab: 'boards',
    previewMissionId: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
  })

  assert.deepEqual(restored.workspaces[0].missionIds, ['mission-1', 'mission-orphan'])
  assert.deepEqual(restored.missionOrder['ws-1'], ['mission-1', 'mission-orphan'])
  assert.equal(restored.currentMissionId, 'mission-orphan')
})

test('restorePersistedKanbanStateWithRecovery excludes ambiguous orphan missions and reports recovery message', () => {
  const restored = restorePersistedKanbanStateWithRecovery({
    workspaces: [
      { id: 'ws-1', name: '工作区 A', missionIds: ['mission-1'] },
      { id: 'ws-2', name: '工作区 B', missionIds: ['mission-2'] },
    ],
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区 1', boardIds: [], noteIds: [] },
      'mission-2': { id: 'mission-2', title: '任务区 2', boardIds: [], noteIds: [] },
      'mission-orphan': { id: 'mission-orphan', title: '孤儿任务区', boardIds: [], noteIds: [] },
    },
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: {
      'ws-1': ['mission-1', 'mission-orphan'],
      'ws-2': ['mission-2', 'mission-orphan'],
    },
    boardOrder: {},
    activeWorkSpaceId: 'ws-1',
    currentMissionId: 'mission-orphan',
    currentBoardId: null,
    currentNoteId: null,
    centerTab: 'boards',
    previewMissionId: 'mission-orphan',
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
  })

  assert.deepEqual(restored.state.workspaces[0].missionIds, ['mission-1'])
  assert.deepEqual(restored.state.workspaces[1].missionIds, ['mission-2'])
  assert.deepEqual(restored.state.missionOrder['ws-1'], ['mission-1'])
  assert.deepEqual(restored.state.missionOrder['ws-2'], ['mission-2'])
  assert.equal(restored.state.currentMissionId, null)
  assert.equal(restored.recoveredOrphanMissionIds.length, 0)
  assert.deepEqual(restored.unresolvedOrphanMissionIds, ['mission-orphan'])
  assert.match(restored.transientRecoveryMessage ?? '', /任务区归属异常/)
})

test('normalizePersistedKanbanState keeps mission ordering scoped to workspace-owned missions', () => {
  const restored = normalizePersistedKanbanState({
    workspaces: [
      { id: 'ws-1', name: '工作区 A', missionIds: ['mission-1', 'mission-2'] },
      { id: 'ws-2', name: '工作区 B', missionIds: ['mission-3'] },
    ],
    missions: {
      'mission-1': { id: 'mission-1', title: '任务区 1', boardIds: [], noteIds: [] },
      'mission-2': { id: 'mission-2', title: '任务区 2', boardIds: [], noteIds: [] },
      'mission-3': { id: 'mission-3', title: '任务区 3', boardIds: [], noteIds: [] },
    },
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: {
      'ws-1': ['mission-3', 'mission-2'],
      'ws-2': ['mission-3'],
    },
    boardOrder: {},
    activeWorkSpaceId: 'ws-1',
    currentMissionId: 'mission-2',
    currentBoardId: null,
    currentNoteId: null,
    centerTab: 'boards',
    previewMissionId: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
  })

  assert.deepEqual(restored.missionOrder['ws-1'], ['mission-2', 'mission-1'])
  assert.deepEqual(restored.missionOrder['ws-2'], ['mission-3'])
})
