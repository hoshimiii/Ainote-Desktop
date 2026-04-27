import { orderOwnedIds } from './orderedIds'
import type { Board, Mission, Note, Task, WorkSpace } from './types'

export type PersistedCenterTab = 'notes' | 'boards'

export interface KanbanPersistedState {
  workspaces: WorkSpace[]
  activeWorkSpaceId: string | null
  currentMissionId: string | null
  currentNoteId: string | null
  currentBoardId: string | null
  centerTab: PersistedCenterTab
  previewMissionId: string | null
  missionPanelCollapsed: boolean
  listPanelCollapsed: boolean
  missions: Record<string, Mission>
  boards: Record<string, Board>
  tasks: Record<string, Task>
  notes: Record<string, Note>
  missionOrder: Record<string, string[]>
  boardOrder: Record<string, string[]>
}

export const KANBAN_PERSISTED_KEYS = [
  'workspaces',
  'activeWorkSpaceId',
  'currentMissionId',
  'currentNoteId',
  'currentBoardId',
  'centerTab',
  'previewMissionId',
  'missionPanelCollapsed',
  'listPanelCollapsed',
  'missions',
  'boards',
  'tasks',
  'notes',
  'missionOrder',
  'boardOrder',
] as const

const DEFAULT_STATE: KanbanPersistedState = {
  workspaces: [],
  activeWorkSpaceId: null,
  currentMissionId: null,
  currentNoteId: null,
  currentBoardId: null,
  centerTab: 'boards',
  previewMissionId: null,
  missionPanelCollapsed: false,
  listPanelCollapsed: false,
  missions: {},
  boards: {},
  tasks: {},
  notes: {},
  missionOrder: {},
  boardOrder: {},
}

export interface PersistedKanbanRestoreResult {
  state: KanbanPersistedState
  transientRecoveryMessage: string | null
  recoveredOrphanMissionIds: string[]
  unresolvedOrphanMissionIds: string[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asRecord<T>(value: unknown): Record<string, T> {
  return isObject(value) ? (value as Record<string, T>) : {}
}

function normalizeRecordOfStringArrays(value: unknown): Record<string, string[]> {
  const source = asRecord<unknown>(value)
  return Object.fromEntries(Object.entries(source).map(([key, ids]) => [key, asStringArray(ids)]))
}

function normalizeWorkspace(value: unknown): WorkSpace | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }
  return {
    id: value.id,
    name: value.name,
    missionIds: asStringArray(value.missionIds),
  }
}

function normalizeMission(value: unknown): Mission | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null
  }
  return {
    id: value.id,
    title: value.title,
    boardIds: asStringArray(value.boardIds),
    noteIds: asStringArray(value.noteIds),
  }
}

function normalizeBoard(value: unknown): Board | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null
  }
  return {
    id: value.id,
    title: value.title,
    taskIds: asStringArray(value.taskIds),
  }
}

function normalizeTask(value: unknown): Task | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null
  }
  return {
    id: value.id,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : '',
    linkedNoteId: typeof value.linkedNoteId === 'string' ? value.linkedNoteId : undefined,
    subtasks: Array.isArray(value.subtasks)
      ? value.subtasks
          .filter(isObject)
          .filter((subtask) => typeof subtask.id === 'string' && typeof subtask.title === 'string')
          .map((subtask) => ({
            id: subtask.id as string,
            title: subtask.title as string,
            done: !!subtask.done,
            noteId: typeof subtask.noteId === 'string' ? subtask.noteId : undefined,
            blockId: typeof subtask.blockId === 'string' ? subtask.blockId : undefined,
          }))
      : [],
  }
}

function normalizeNote(value: unknown): Note | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null
  }
  return {
    id: value.id,
    title: value.title,
    blocks: Array.isArray(value.blocks)
      ? value.blocks
          .filter(isObject)
          .filter((block) => typeof block.id === 'string' && typeof block.type === 'string' && typeof block.content === 'string')
          .map((block) => ({
            id: block.id as string,
            type: block.type === 'code' ? 'code' : 'markdown',
            content: block.content as string,
            language: typeof block.language === 'string' ? block.language : undefined,
            lastOutput: typeof block.lastOutput === 'string' ? block.lastOutput : undefined,
            lastExitCode: typeof block.lastExitCode === 'number' || block.lastExitCode === null
              ? (block.lastExitCode as number | null)
              : undefined,
            linkedBoardId: typeof block.linkedBoardId === 'string' ? block.linkedBoardId : undefined,
            linkedTaskId: typeof block.linkedTaskId === 'string' ? block.linkedTaskId : undefined,
            linkedSubTaskId: typeof block.linkedSubTaskId === 'string' ? block.linkedSubTaskId : undefined,
          }))
      : [],
  }
}

function normalizeEntityRecord<T>(
  value: unknown,
  normalizeItem: (item: unknown) => T | null,
): Record<string, T> {
  const source = asRecord<unknown>(value)
  const entries: Array<[string, T]> = []
  for (const [key, item] of Object.entries(source)) {
    const normalized = normalizeItem(item)
    if (normalized) entries.push([key, normalized])
  }
  return Object.fromEntries(entries)
}

function buildMissionRecoveryMessage(recoveredCount: number, unresolvedCount: number): string | null {
  if (unresolvedCount === 0) return null

  const parts: string[] = []
  if (recoveredCount > 0) {
    parts.push(`已恢复 ${recoveredCount} 个可识别归属的任务区`)
  }
  parts.push(`${unresolvedCount} 个任务区因无法确定工作区归属已暂时隐藏`)
  return `本地工作区数据存在历史任务区归属异常：${parts.join('；')}。`
}

export function pickPersistedKanbanState(state: KanbanPersistedState): KanbanPersistedState {
  return {
    workspaces: state.workspaces,
    activeWorkSpaceId: state.activeWorkSpaceId,
    currentMissionId: state.currentMissionId,
    currentNoteId: state.currentNoteId,
    currentBoardId: state.currentBoardId,
    centerTab: state.centerTab,
    previewMissionId: state.previewMissionId,
    missionPanelCollapsed: state.missionPanelCollapsed,
    listPanelCollapsed: state.listPanelCollapsed,
    missions: state.missions,
    boards: state.boards,
    tasks: state.tasks,
    notes: state.notes,
    missionOrder: state.missionOrder,
    boardOrder: state.boardOrder,
  }
}

export function restorePersistedKanbanStateWithRecovery(persisted: unknown): PersistedKanbanRestoreResult {
  if (!isObject(persisted)) {
    return {
      state: { ...DEFAULT_STATE },
      transientRecoveryMessage: null,
      recoveredOrphanMissionIds: [],
      unresolvedOrphanMissionIds: [],
    }
  }

  const workspaces = Array.isArray(persisted.workspaces)
    ? persisted.workspaces.map(normalizeWorkspace).filter((value): value is WorkSpace => value !== null)
    : []
  const missions = normalizeEntityRecord(persisted.missions, normalizeMission)
  const boards = normalizeEntityRecord(persisted.boards, normalizeBoard)
  const tasks = normalizeEntityRecord(persisted.tasks, normalizeTask)
  const normalizedNotes = normalizeEntityRecord(persisted.notes, normalizeNote)

  const missionIds = new Set(Object.keys(missions))
  const boardIds = new Set(Object.keys(boards))
  const taskIds = new Set(Object.keys(tasks))
  const noteIds = new Set(Object.keys(normalizedNotes))

  let normalizedWorkspaces = workspaces.map((workspace) => ({
    ...workspace,
    missionIds: workspace.missionIds.filter((id) => missionIds.has(id)),
  }))

  const recoveredOrphanMissionIds: string[] = []
  const unresolvedOrphanMissionIds: string[] = []
  const ownedMissionIds = new Set(normalizedWorkspaces.flatMap((workspace) => workspace.missionIds))

  const normalizedMissions = Object.fromEntries(
    Object.entries(missions).map(([id, mission]) => [
      id,
      {
        ...mission,
        boardIds: mission.boardIds.filter((boardId) => boardIds.has(boardId)),
        noteIds: mission.noteIds.filter((noteId) => noteIds.has(noteId)),
      },
    ]),
  ) as Record<string, Mission>

  const normalizedBoards = Object.fromEntries(
    Object.entries(boards).map(([id, board]) => [
      id,
      {
        ...board,
        taskIds: board.taskIds.filter((taskId) => taskIds.has(taskId)),
      },
    ]),
  ) as Record<string, Board>

  const missionOrderInput = normalizeRecordOfStringArrays(persisted.missionOrder)
  const boardOrderInput = normalizeRecordOfStringArrays(persisted.boardOrder)

  for (const missionId of Object.keys(normalizedMissions)) {
    if (ownedMissionIds.has(missionId)) continue

    const candidateWorkspaceIds = normalizedWorkspaces
      .filter((workspace) => (missionOrderInput[workspace.id] ?? []).includes(missionId))
      .map((workspace) => workspace.id)

    if (candidateWorkspaceIds.length === 1) {
      const recoveredWorkspaceId = candidateWorkspaceIds[0]
      normalizedWorkspaces = normalizedWorkspaces.map((workspace) => (
        workspace.id === recoveredWorkspaceId
          ? { ...workspace, missionIds: [...workspace.missionIds, missionId] }
          : workspace
      ))
      ownedMissionIds.add(missionId)
      recoveredOrphanMissionIds.push(missionId)
      continue
    }

    unresolvedOrphanMissionIds.push(missionId)
  }

  const missionOrder = Object.fromEntries(
    normalizedWorkspaces.map((workspace) => [
      workspace.id,
      orderOwnedIds(workspace.missionIds, missionOrderInput[workspace.id] ?? []),
    ]),
  ) as Record<string, string[]>

  const boardOrder = Object.fromEntries(
    Object.values(normalizedMissions).map((mission) => [
      mission.id,
      orderOwnedIds(mission.boardIds, boardOrderInput[mission.id] ?? []),
    ]),
  ) as Record<string, string[]>

  const workspaceIdSet = new Set(normalizedWorkspaces.map((workspace) => workspace.id))

  let activeWorkSpaceId = typeof persisted.activeWorkSpaceId === 'string' ? persisted.activeWorkSpaceId : null
  if (activeWorkSpaceId && !workspaceIdSet.has(activeWorkSpaceId)) {
    activeWorkSpaceId = null
  }

  let currentMissionId = typeof persisted.currentMissionId === 'string' ? persisted.currentMissionId : null
  if (currentMissionId && !normalizedMissions[currentMissionId]) {
    currentMissionId = null
  }
  if (activeWorkSpaceId && currentMissionId) {
    const activeWorkspace = normalizedWorkspaces.find((workspace) => workspace.id === activeWorkSpaceId)
    if (!activeWorkspace?.missionIds.includes(currentMissionId)) {
      currentMissionId = null
    }
  }
  if (!activeWorkSpaceId) {
    currentMissionId = null
  }

  let currentBoardId = typeof persisted.currentBoardId === 'string' ? persisted.currentBoardId : null
  if (
    currentBoardId
    && (!normalizedBoards[currentBoardId]
      || !currentMissionId
      || !normalizedMissions[currentMissionId]?.boardIds.includes(currentBoardId))
  ) {
    currentBoardId = null
  }

  let currentNoteId = typeof persisted.currentNoteId === 'string' ? persisted.currentNoteId : null
  if (
    currentNoteId
    && (!normalizedNotes[currentNoteId]
      || !currentMissionId
      || !normalizedMissions[currentMissionId]?.noteIds.includes(currentNoteId))
  ) {
    currentNoteId = null
  }

  if (currentNoteId) currentBoardId = null

  let previewMissionId = typeof persisted.previewMissionId === 'string' ? persisted.previewMissionId : null
  if (previewMissionId && !normalizedMissions[previewMissionId]) {
    previewMissionId = null
  }

  const centerTab = persisted.centerTab === 'notes' ? 'notes' : 'boards'

  return {
    state: {
      workspaces: normalizedWorkspaces,
      activeWorkSpaceId,
      currentMissionId,
      currentNoteId,
      currentBoardId,
      centerTab,
      previewMissionId,
      missionPanelCollapsed: !!persisted.missionPanelCollapsed,
      listPanelCollapsed: !!persisted.listPanelCollapsed,
      missions: normalizedMissions,
      boards: normalizedBoards,
      tasks,
      notes: normalizedNotes,
      missionOrder,
      boardOrder,
    },
    transientRecoveryMessage: buildMissionRecoveryMessage(
      recoveredOrphanMissionIds.length,
      unresolvedOrphanMissionIds.length,
    ),
    recoveredOrphanMissionIds,
    unresolvedOrphanMissionIds,
  }
}

export function normalizePersistedKanbanState(persisted: unknown): KanbanPersistedState {
  return restorePersistedKanbanStateWithRecovery(persisted).state
}

export function restorePersistedKanbanState(persisted: unknown): Partial<KanbanPersistedState> {
  return normalizePersistedKanbanState(persisted)
}
