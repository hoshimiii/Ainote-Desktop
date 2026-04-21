import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CloudSnapshotIntegrityError,
  cloudToDesktop,
  cloudToDesktopWithFallback,
  formatCloudRepairSummary,
  type CloudSnapshot,
  type CloudRepairSummary,
} from '../src/shared/cloudSnapshot'

test('cloudToDesktop normalizes legacy relations when there is a single safe parent', () => {
  const snapshot: CloudSnapshot = {
    workspaces: [{ workspaceId: 'ws-1', workspaceName: '工作区 1' }],
    missions: {
      'mission-1': {
        MissionId: 'mission-1',
        title: '任务区 1',
        Notes: [{ noteId: 'note-1', noteTitle: '笔记 1', blocks: [] }],
      },
    },
    boards: {
      'board-1': {
        BoardId: 'board-1',
        title: '看板 1',
        Tasks: [
          {
            TaskId: 'task-1',
            title: '任务 1',
            subTasks: [{ subTaskId: 'sub-1', title: '子任务 1', completed: false }],
          },
        ],
      },
    },
    tasks: {},
    missionOrder: {},
    boardOrder: {},
    activeWorkSpaceId: 'ws-1',
    currentMissionId: 'mission-1',
    currentNoteId: 'note-1',
  }

  const restored = cloudToDesktop(snapshot)

  assert.deepEqual(restored.workspaces[0].missionIds, ['mission-1'])
  assert.deepEqual(restored.missions['mission-1'].boardIds, ['board-1'])
  assert.deepEqual(restored.missions['mission-1'].noteIds, ['note-1'])
  assert.equal(restored.boards['board-1'].taskIds[0], 'task-1')
})

test('cloudToDesktop rejects unsafe legacy missions when multiple workspaces exist', () => {
  const snapshot: CloudSnapshot = {
    workspaces: [
      { workspaceId: 'ws-1', workspaceName: '工作区 1' },
      { workspaceId: 'ws-2', workspaceName: '工作区 2' },
    ],
    missions: {
      'mission-1': {
        MissionId: 'mission-1',
        title: '任务区 1',
        Notes: [],
      },
    },
    boards: {},
    tasks: {},
    missionOrder: {},
    boardOrder: {},
  }

  assert.throws(
    () => cloudToDesktop(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof CloudSnapshotIntegrityError)
      assert.match(error.message, /关系校验失败/)
      assert.match(error.details.join('；'), /缺少 WorkSpaceId/)
      return true
    },
  )
})

test('cloudToDesktop rejects empty snapshots to avoid accidental local data loss', () => {
  const snapshot: CloudSnapshot = {
    workspaces: [],
    missions: {},
    boards: {},
    tasks: {},
    missionOrder: {},
    boardOrder: {},
  }

  assert.throws(
    () => cloudToDesktop(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof CloudSnapshotIntegrityError)
      assert.match(error.message, /云端快照为空/)
      return true
    },
  )
})

test('cloudToDesktopWithFallback derives a transient legal subset from orphan entities', () => {
  const snapshot: CloudSnapshot = {
    workspaces: [{ workspaceId: 'ws-1', workspaceName: '工作区 1' }],
    missions: {
      'mission-valid': {
        MissionId: 'mission-valid',
        WorkSpaceId: 'ws-1',
        title: '保留任务区',
        Notes: [],
      },
      'mission-orphan': {
        MissionId: 'mission-orphan',
        WorkSpaceId: 'missing-ws',
        title: '孤儿任务区',
        Notes: [],
      },
    },
    boards: {
      'board-valid': {
        BoardId: 'board-valid',
        MissionId: 'mission-valid',
        title: '看板 1',
        Tasks: [],
      },
    },
    tasks: {},
    missionOrder: { 'ws-1': ['mission-orphan', 'mission-valid'] },
    boardOrder: { 'mission-valid': ['board-valid'] },
  }

  const result = cloudToDesktopWithFallback(snapshot)
  assert.equal(result.persistent, null)
  assert.ok(result.transient)
  assert.equal(result.diagnostics.status, 'transient')
  assert.deepEqual(result.transient?.workspaces[0].missionIds, ['mission-valid'])
  assert.match(result.diagnostics.message ?? '', /临时数据/)
})

test('cloudToDesktopWithFallback still rejects snapshots with no legal subset', () => {
  const snapshot: CloudSnapshot = {
    workspaces: [],
    missions: {
      'mission-1': {
        MissionId: 'mission-1',
        WorkSpaceId: 'missing-ws',
        title: '孤儿任务区',
        Notes: [],
      },
    },
    boards: {},
    tasks: {},
    missionOrder: {},
    boardOrder: {},
  }

  const result = cloudToDesktopWithFallback(snapshot)
  assert.equal(result.persistent, null)
  assert.equal(result.transient, null)
  assert.equal(result.diagnostics.status, 'rejected')
})

test('formatCloudRepairSummary renders readable chinese diagnostics', () => {
  const summary: CloudRepairSummary = {
    status: 'safe_repair',
    droppedEntityCounts: {
      missions: 1,
      boards: 2,
      tasks: 0,
      invalidReferences: 3,
      missionOrderEntries: 1,
      boardOrderEntries: 0,
    },
    issues: ['Mission mission-1 引用了不存在的 WorkSpaceId: ws-x'],
  }

  assert.match(formatCloudRepairSummary(summary) ?? '', /云端快照已自动修复/)
  assert.match(formatCloudRepairSummary(summary) ?? '', /任务区 1 个/)
})
