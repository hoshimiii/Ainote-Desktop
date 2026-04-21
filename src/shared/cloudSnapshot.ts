import type { Board, Mission, Note, Task, WorkSpace } from './types'
import type { KanbanPersistedState } from './kanbanPersistence'

interface DesktopStateLike extends Record<string, unknown> {
  workspaces?: Array<Record<string, unknown>>
  missions?: Record<string, Record<string, unknown>>
  boards?: Record<string, Record<string, unknown>>
  tasks?: Record<string, Record<string, unknown>>
  notes?: Record<string, Record<string, unknown>>
  missionOrder?: Record<string, string[]>
  boardOrder?: Record<string, string[]>
  activeWorkSpaceId?: string | null
  currentMissionId?: string | null
  currentNoteId?: string | null
}

export interface CloudBlock {
  blockId: string
  blockType: string
  blockContent: string
  language?: string
  executionOutput?: string
  executionError?: string
  executionExitCode?: number
  linkedBoardId?: string
  linkedTaskId?: string
  linkedSubTaskId?: string
}

export interface CloudNote {
  noteId: string
  noteTitle: string
  noteContent?: string
  blocks: CloudBlock[]
  relatedTaskId?: string
}

export interface CloudSubTask {
  subTaskId: string
  title: string
  completed: boolean
  linkedNoteId?: string
  linkedBlockId?: string
}

export interface CloudTask {
  TaskId: string
  title: string
  description?: string
  linkedNoteIds?: string
  subTasks: CloudSubTask[]
}

export interface CloudBoard {
  BoardId: string
  MissionId?: string
  title: string
  Tasks: CloudTask[]
}

export interface CloudMission {
  MissionId: string
  WorkSpaceId?: string
  title: string
  Notes: CloudNote[]
  activeNoteId?: string | null
}

export interface CloudWorkSpace {
  workspaceId: string
  workspaceName: string
}

export interface CloudSnapshot {
  workspaces: CloudWorkSpace[]
  missions: Record<string, CloudMission>
  boards: Record<string, CloudBoard>
  tasks: Record<string, CloudTask>
  missionOrder: Record<string, string[]>
  boardOrder: Record<string, string[]>
  activeWorkSpaceId?: string | null
  currentMissionId?: string | null
  currentNoteId?: string | null
}

export interface CloudRepairSummary {
  status: 'clean' | 'safe_repair' | 'rejected'
  droppedEntityCounts: {
    missions: number
    boards: number
    tasks: number
    invalidReferences: number
    missionOrderEntries: number
    boardOrderEntries: number
  }
  issues: string[]
}

export interface CloudDesktopImportResult {
  persistent: KanbanPersistedState | null
  transient: KanbanPersistedState | null
  diagnostics: {
    status: 'clean' | 'transient' | 'rejected'
    message: string | null
    repairSummary?: CloudRepairSummary | null
  }
}

export class CloudSnapshotIntegrityError extends Error {
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'CloudSnapshotIntegrityError'
    this.details = details
  }
}

function normalizeOrder(ids: string[], preferredOrder: string[]): string[] {
  const ordered = preferredOrder.filter((id) => ids.includes(id))
  const missing = ids.filter((id) => !ordered.includes(id))
  return [...ordered, ...missing]
}

function createEmptyRepairSummary(status: CloudRepairSummary['status']): CloudRepairSummary {
  return {
    status,
    droppedEntityCounts: {
      missions: 0,
      boards: 0,
      tasks: 0,
      invalidReferences: 0,
      missionOrderEntries: 0,
      boardOrderEntries: 0,
    },
    issues: [],
  }
}

export function formatCloudRepairSummary(summary?: CloudRepairSummary | null): string | null {
  if (!summary || summary.status === 'clean') return null
  const counts = summary.droppedEntityCounts
  const parts: string[] = []
  if (counts.missions > 0) parts.push(`任务区 ${counts.missions} 个`)
  if (counts.boards > 0) parts.push(`看板 ${counts.boards} 个`)
  if (counts.tasks > 0) parts.push(`任务 ${counts.tasks} 个`)
  if (counts.invalidReferences > 0) parts.push(`无效关联 ${counts.invalidReferences} 处`)
  if (counts.missionOrderEntries > 0) parts.push(`任务区排序 ${counts.missionOrderEntries} 处`)
  if (counts.boardOrderEntries > 0) parts.push(`看板排序 ${counts.boardOrderEntries} 处`)
  const detail = parts.length > 0 ? `：已处理 ${parts.join('、')}` : ''
  const issueText = summary.issues.length > 0 ? `（${summary.issues.join('；')}）` : ''
  if (summary.status === 'rejected') {
    return `云端快照关系校验失败，无法安全应用${issueText}`
  }
  return `云端快照已自动修复${detail}${issueText}`
}

export function desktopToCloud(desktop: DesktopStateLike): CloudSnapshot {
  const workspaces = (desktop.workspaces ?? []).map((ws) => ({
    workspaceId: ws.id as string,
    workspaceName: ws.name as string,
  }))

  const desktopNotes = (desktop.notes ?? {}) as Record<string, Record<string, unknown>>
  const desktopTasks = (desktop.tasks ?? {}) as Record<string, Record<string, unknown>>
  const desktopBoards = (desktop.boards ?? {}) as Record<string, Record<string, unknown>>
  const desktopMissions = (desktop.missions ?? {}) as Record<string, Record<string, unknown>>

  const missionToWorkspace = new Map<string, string>()
  for (const ws of desktop.workspaces ?? []) {
    for (const missionId of ((ws.missionIds as string[] | undefined) ?? [])) {
      missionToWorkspace.set(missionId, ws.id as string)
    }
  }

  const boardToMission = new Map<string, string>()
  for (const [missionId, mission] of Object.entries(desktopMissions)) {
    for (const boardId of ((mission.boardIds as string[] | undefined) ?? [])) {
      boardToMission.set(boardId, missionId)
    }
  }

  const tasks: Record<string, CloudTask> = {}
  for (const [taskId, task] of Object.entries(desktopTasks)) {
    tasks[taskId] = {
      TaskId: task.id as string,
      title: task.title as string,
      description: task.description as string | undefined,
      subTasks: ((task.subtasks as Array<Record<string, unknown>> | undefined) ?? []).map((subtask) => ({
        subTaskId: subtask.id as string,
        title: subtask.title as string,
        completed: !!subtask.done,
        linkedNoteId: subtask.noteId as string | undefined,
        linkedBlockId: subtask.blockId as string | undefined,
      })),
    }
  }

  const boards: Record<string, CloudBoard> = {}
  for (const [boardId, board] of Object.entries(desktopBoards)) {
    boards[boardId] = {
      BoardId: board.id as string,
      MissionId: boardToMission.get(boardId),
      title: board.title as string,
      Tasks: ((board.taskIds as string[] | undefined) ?? []).map((taskId) => tasks[taskId]).filter(Boolean),
    }
  }

  const missions: Record<string, CloudMission> = {}
  for (const [missionId, mission] of Object.entries(desktopMissions)) {
    missions[missionId] = {
      MissionId: mission.id as string,
      WorkSpaceId: missionToWorkspace.get(missionId),
      title: mission.title as string,
      Notes: ((mission.noteIds as string[] | undefined) ?? [])
        .map((noteId) => {
          const note = desktopNotes[noteId]
          if (!note) return null
          return {
            noteId: note.id as string,
            noteTitle: note.title as string,
            blocks: ((note.blocks as Array<Record<string, unknown>> | undefined) ?? []).map((block) => ({
              blockId: block.id as string,
              blockType: block.type as string,
              blockContent: block.content as string,
              language: block.language as string | undefined,
              executionOutput: block.lastOutput as string | undefined,
              executionExitCode: block.lastExitCode as number | undefined,
              linkedBoardId: block.linkedBoardId as string | undefined,
              linkedTaskId: block.linkedTaskId as string | undefined,
              linkedSubTaskId: block.linkedSubTaskId as string | undefined,
            })),
          }
        })
        .filter(Boolean) as CloudNote[],
      activeNoteId: null,
    }
  }

  return {
    workspaces,
    missions,
    boards,
    tasks,
    missionOrder: (desktop.missionOrder ?? {}) as Record<string, string[]>,
    boardOrder: (desktop.boardOrder ?? {}) as Record<string, string[]>,
    activeWorkSpaceId: (desktop.activeWorkSpaceId as string | null | undefined) ?? null,
    currentMissionId: (desktop.currentMissionId as string | null | undefined) ?? null,
    currentNoteId: (desktop.currentNoteId as string | null | undefined) ?? null,
  }
}

function normalizeMissionWorkspaceIds(cloud: CloudSnapshot): { missions: Record<string, CloudMission>; issues: string[] } {
  const workspaceIds = new Set((cloud.workspaces ?? []).map((workspace) => workspace.workspaceId))
  const soleWorkspaceId = cloud.workspaces.length === 1 ? cloud.workspaces[0]?.workspaceId : undefined
  const issues: string[] = []
  const missions = Object.fromEntries(
    Object.entries(cloud.missions ?? {}).map(([missionId, mission]) => {
      let workspaceId = mission.WorkSpaceId
      if (!workspaceId) {
        if (soleWorkspaceId) {
          workspaceId = soleWorkspaceId
        } else {
          issues.push(`Mission ${missionId} 缺少 WorkSpaceId，且无法安全推断归属。`)
        }
      } else if (!workspaceIds.has(workspaceId)) {
        issues.push(`Mission ${missionId} 引用了不存在的 WorkSpaceId: ${workspaceId}`)
      }
      return [missionId, { ...mission, WorkSpaceId: workspaceId }]
    }),
  ) as Record<string, CloudMission>

  return { missions, issues }
}

function normalizeBoardMissionIds(
  cloud: CloudSnapshot,
  missions: Record<string, CloudMission>,
): { boards: Record<string, CloudBoard>; issues: string[] } {
  const missionIds = new Set(Object.keys(missions))
  const soleMissionId = missionIds.size === 1 ? Array.from(missionIds)[0] : undefined
  const issues: string[] = []
  const boards = Object.fromEntries(
    Object.entries(cloud.boards ?? {}).map(([boardId, board]) => {
      let missionId = board.MissionId
      if (!missionId) {
        if (soleMissionId) {
          missionId = soleMissionId
        } else {
          issues.push(`Board ${boardId} 缺少 MissionId，且无法安全推断归属。`)
        }
      } else if (!missionIds.has(missionId)) {
        issues.push(`Board ${boardId} 引用了不存在的 MissionId: ${missionId}`)
      }
      return [boardId, { ...board, MissionId: missionId }]
    }),
  ) as Record<string, CloudBoard>

  return { boards, issues }
}

export function cloudToDesktop(cloud: CloudSnapshot): KanbanPersistedState {
  const isEmptySnapshot = (cloud.workspaces ?? []).length === 0
    && Object.keys(cloud.missions ?? {}).length === 0
    && Object.keys(cloud.boards ?? {}).length === 0
    && Object.keys(cloud.tasks ?? {}).length === 0

  if (isEmptySnapshot) {
    throw new CloudSnapshotIntegrityError('云端快照为空，已拒绝应用该快照以防止本地数据被意外清空。', [
      '请先确认云端账户下是否存在数据。',
      '如需恢复，可先检查云端状态，再决定是否重置本地数据后重新拉取。',
    ])
  }

  const missionResult = normalizeMissionWorkspaceIds(cloud)
  const boardResult = normalizeBoardMissionIds(cloud, missionResult.missions)
  const issues = [...missionResult.issues, ...boardResult.issues]
  if (issues.length > 0) {
    throw new CloudSnapshotIntegrityError('云端快照关系校验失败，已拒绝应用该快照。', issues)
  }

  const workspaces: WorkSpace[] = (cloud.workspaces ?? []).map((workspace) => {
    const missionIds = Object.values(missionResult.missions)
      .filter((mission) => mission.WorkSpaceId === workspace.workspaceId)
      .map((mission) => mission.MissionId)

    return {
      id: workspace.workspaceId,
      name: workspace.workspaceName,
      missionIds,
    }
  })

  const notes: Record<string, Note> = {}
  for (const mission of Object.values(missionResult.missions)) {
    for (const note of mission.Notes ?? []) {
      notes[note.noteId] = {
        id: note.noteId,
        title: note.noteTitle,
        blocks: (note.blocks ?? []).map((block) => ({
          id: block.blockId,
          type: block.blockType === 'code' ? 'code' : 'markdown',
          content: block.blockContent,
          language: block.language,
          lastOutput: block.executionOutput,
          lastExitCode: block.executionExitCode ?? null,
          linkedBoardId: block.linkedBoardId,
          linkedTaskId: block.linkedTaskId,
          linkedSubTaskId: block.linkedSubTaskId,
        })),
      }
    }
  }

  const tasks: Record<string, Task> = {}
  for (const board of Object.values(boardResult.boards)) {
    for (const task of board.Tasks ?? []) {
      tasks[task.TaskId] = {
        id: task.TaskId,
        title: task.title,
        description: task.description ?? '',
        subtasks: (task.subTasks ?? []).map((subtask) => ({
          id: subtask.subTaskId,
          title: subtask.title,
          done: subtask.completed,
          noteId: subtask.linkedNoteId,
          blockId: subtask.linkedBlockId,
        })),
      }
    }
  }

  const boards: Record<string, Board> = Object.fromEntries(
    Object.entries(boardResult.boards).map(([boardId, board]) => [
      boardId,
      {
        id: board.BoardId,
        title: board.title,
        taskIds: (board.Tasks ?? []).map((task) => task.TaskId).filter((taskId) => !!tasks[taskId]),
      },
    ]),
  )

  const missions: Record<string, Mission> = Object.fromEntries(
    Object.entries(missionResult.missions).map(([missionId, mission]) => {
      const boardIds = Object.values(boardResult.boards)
        .filter((board) => board.MissionId === mission.MissionId)
        .map((board) => board.BoardId)
        .filter((boardId) => !!boards[boardId])
      const noteIds = (mission.Notes ?? []).map((note) => note.noteId).filter((noteId) => !!notes[noteId])
      return [missionId, {
        id: mission.MissionId,
        title: mission.title,
        boardIds,
        noteIds,
      }]
    }),
  )

  const missionOrder = Object.fromEntries(
    workspaces.map((workspace) => [
      workspace.id,
      normalizeOrder(workspace.missionIds, cloud.missionOrder?.[workspace.id] ?? []),
    ]),
  ) as Record<string, string[]>

  const boardOrder = Object.fromEntries(
    Object.values(missions).map((mission) => [
      mission.id,
      normalizeOrder(mission.boardIds, cloud.boardOrder?.[mission.id] ?? []),
    ]),
  ) as Record<string, string[]>

  return {
    workspaces,
    missions,
    boards,
    tasks,
    notes,
    missionOrder,
    boardOrder,
    activeWorkSpaceId: cloud.activeWorkSpaceId ?? null,
    currentMissionId: cloud.currentMissionId ?? null,
    currentNoteId: cloud.currentNoteId ?? null,
    currentBoardId: null,
    centerTab: 'notes',
    previewMissionId: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
  }
}

function sanitizeCloudSnapshotForFallback(cloud: CloudSnapshot): { snapshot: CloudSnapshot | null; repairSummary: CloudRepairSummary } {
  const repairSummary = createEmptyRepairSummary('safe_repair')
  const workspaces = (cloud.workspaces ?? []).filter(
    (workspace): workspace is CloudWorkSpace => !!workspace?.workspaceId && !!workspace?.workspaceName,
  )
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.workspaceId))
  const soleWorkspaceId = workspaces.length === 1 ? workspaces[0]?.workspaceId : undefined

  const missions = Object.fromEntries(
    Object.entries(cloud.missions ?? {}).flatMap(([missionId, mission]) => {
      let workspaceId = mission.WorkSpaceId
      if (!workspaceId) {
        if (!soleWorkspaceId) {
          repairSummary.droppedEntityCounts.missions += 1
          repairSummary.issues.push(`Mission ${missionId} 缺少 WorkSpaceId，已在临时恢复中忽略。`)
          return []
        }
        workspaceId = soleWorkspaceId
        repairSummary.droppedEntityCounts.invalidReferences += 1
        repairSummary.issues.push(`Mission ${missionId} 缺少 WorkSpaceId，已按唯一工作区临时归属。`)
      }
      if (!workspaceIds.has(workspaceId)) {
        repairSummary.droppedEntityCounts.missions += 1
        repairSummary.issues.push(`Mission ${missionId} 引用了不存在的 WorkSpaceId: ${workspaceId}`)
        return []
      }
      return [[missionId, { ...mission, WorkSpaceId: workspaceId }]]
    }),
  ) as Record<string, CloudMission>

  const missionIds = new Set(Object.keys(missions))
  const soleMissionId = missionIds.size === 1 ? Array.from(missionIds)[0] : undefined
  const boards = Object.fromEntries(
    Object.entries(cloud.boards ?? {}).flatMap(([boardId, board]) => {
      let missionId = board.MissionId
      if (!missionId) {
        if (!soleMissionId) {
          repairSummary.droppedEntityCounts.boards += 1
          repairSummary.issues.push(`Board ${boardId} 缺少 MissionId，已在临时恢复中忽略。`)
          return []
        }
        missionId = soleMissionId
        repairSummary.droppedEntityCounts.invalidReferences += 1
        repairSummary.issues.push(`Board ${boardId} 缺少 MissionId，已按唯一任务区临时归属。`)
      }
      if (!missionIds.has(missionId)) {
        repairSummary.droppedEntityCounts.boards += 1
        repairSummary.issues.push(`Board ${boardId} 引用了不存在的 MissionId: ${missionId}`)
        return []
      }
      return [[boardId, { ...board, MissionId: missionId }]]
    }),
  ) as Record<string, CloudBoard>

  const missionOrder = Object.fromEntries(
    workspaces.map((workspace) => {
      const missionIdsForWorkspace = Object.values(missions)
        .filter((mission) => mission.WorkSpaceId === workspace.workspaceId)
        .map((mission) => mission.MissionId)
      const preferred = cloud.missionOrder?.[workspace.workspaceId] ?? []
      const normalized = normalizeOrder(missionIdsForWorkspace, preferred)
      repairSummary.droppedEntityCounts.missionOrderEntries += preferred.length - normalized.length
      return [workspace.workspaceId, normalized]
    }),
  ) as Record<string, string[]>

  const boardOrder = Object.fromEntries(
    Object.values(missions).map((mission) => {
      const boardIdsForMission = Object.values(boards)
        .filter((board) => board.MissionId === mission.MissionId)
        .map((board) => board.BoardId)
      const preferred = cloud.boardOrder?.[mission.MissionId] ?? []
      const normalized = normalizeOrder(boardIdsForMission, preferred)
      repairSummary.droppedEntityCounts.boardOrderEntries += preferred.length - normalized.length
      return [mission.MissionId, normalized]
    }),
  ) as Record<string, string[]>

  const snapshot: CloudSnapshot = {
    ...cloud,
    workspaces,
    missions,
    boards,
    missionOrder,
    boardOrder,
  }

  const emptySnapshot = workspaces.length === 0
    && Object.keys(missions).length === 0
    && Object.keys(boards).length === 0
    && Object.keys(cloud.tasks ?? {}).length === 0
  if (emptySnapshot) {
    return {
      snapshot: null,
      repairSummary: {
        ...repairSummary,
        status: 'rejected',
        issues: repairSummary.issues.length > 0
          ? repairSummary.issues
          : ['临时恢复后已无任何合法实体，无法继续展示云端数据。'],
      },
    }
  }

  return { snapshot, repairSummary }
}

export function cloudToDesktopWithFallback(
  cloud: CloudSnapshot,
  repairSummary?: CloudRepairSummary | null,
): CloudDesktopImportResult {
  try {
    const persistent = cloudToDesktop(cloud)
    return {
      persistent,
      transient: null,
      diagnostics: {
        status: 'clean',
        message: formatCloudRepairSummary(repairSummary),
        repairSummary: repairSummary ?? null,
      },
    }
  } catch (error) {
    if (!(error instanceof CloudSnapshotIntegrityError)) throw error

    const fallback = sanitizeCloudSnapshotForFallback(cloud)
    if (!fallback.snapshot) {
      return {
        persistent: null,
        transient: null,
        diagnostics: {
          status: 'rejected',
          message: formatCloudRepairSummary(fallback.repairSummary) ?? `${error.message}：${error.details.join('；')}`,
          repairSummary: fallback.repairSummary,
        },
      }
    }

    try {
      const transient = cloudToDesktop(fallback.snapshot)
      return {
        persistent: null,
        transient,
        diagnostics: {
          status: 'transient',
          message: `检测到云端快照包含非法关系，已仅恢复合法子集，本地不会持久化这份临时数据。${formatCloudRepairSummary(fallback.repairSummary) ? ` ${formatCloudRepairSummary(fallback.repairSummary)}` : ''}`,
          repairSummary: fallback.repairSummary,
        },
      }
    } catch {
      return {
        persistent: null,
        transient: null,
        diagnostics: {
          status: 'rejected',
          message: `${error.message}：${error.details.join('；')}`,
          repairSummary: fallback.repairSummary,
        },
      }
    }
  }
}
