import { create } from 'zustand'
import { attachSqlitePersist } from './sqlitePersist'
import { pickPersistedKanbanState, restorePersistedKanbanState } from '@shared/kanbanPersistence'
import type {
  WorkSpace,
  Mission,
  Board,
  Task,
  SubTask,
  Note,
  Block,
} from '@shared/types'

// --- Snapshot Types ---

export type CurrentContextSnapshot = {
  activeWorkSpaceId: string | null
  currentMissionId: string | null
  currentMissionTitle: string | null
  currentNoteId: string | null
  currentNoteTitle: string | null
  previewMissionId: string | null
  effectiveMissionId: string | null
}

export type NoteBlockSnapshot = Block & {
  index: number
  preview: string
}

export type NoteSnapshot = {
  missionId: string
  noteId: string
  noteTitle: string
  blocks: NoteBlockSnapshot[]
}

export type MissionSnapshot = {
  missionId: string
  title: string
  boardIds: string[]
  noteIds: string[]
}

// --- Store Interface ---

export type CenterTab = 'notes' | 'boards'

export interface KanbanStore {
  workspaces: WorkSpace[]
  activeWorkSpaceId: string | null
  currentMissionId: string | null
  currentNoteId: string | null
  currentBoardId: string | null
  centerTab: CenterTab
  previewMissionId: string | null
  rehydrationError: string | null
  transientRecoveryActive: boolean
  transientRecoveryMessage: string | null

  // --- UI collapse state ---
  missionPanelCollapsed: boolean
  listPanelCollapsed: boolean

  missions: Record<string, Mission>
  boards: Record<string, Board>
  tasks: Record<string, Task>
  notes: Record<string, Note>

  missionOrder: Record<string, string[]>
  boardOrder: Record<string, string[]>

  // 兼容层：以下持久化敏感写方法仅为迁移期间保留。
  // 新增正式写操作请优先走 main-process formal service boundary（window.electronAPI.kanban / useKanbanService）。

  // --- Workspace ---
  createWorkSpace: (ws: WorkSpace) => void
  setWorkSpace: (id: string | null) => void
  deleteWorkSpace: (id: string) => void
  renameWorkSpace: (id: string, newName: string) => void

  // --- Mission ---
  createMission: (mission: Mission) => void
  setMission: (id: string | null) => void
  setPreviewMission: (id: string | null) => void
  clearPreviewMission: () => void
  deleteMission: (id: string) => void
  renameMission: (id: string, newTitle: string) => void
  reorderMissions: (workspaceId: string, orderedIds: string[]) => void

  // --- Board ---
  createBoard: (board: Board) => void
  deleteBoard: (id: string) => void
  renameBoard: (id: string, newTitle: string) => void
  reorderBoards: (missionId: string, orderedIds: string[]) => void

  // --- Task ---
  createTask: (boardId: string, task: Task) => void
  deleteTask: (boardId: string, taskId: string) => void
  renameTask: (boardId: string, taskId: string, newTitle: string) => void
  moveTask: (taskId: string, sourceBoardId: string, targetBoardId: string, targetIndex?: number) => void
  reorderTasks: (boardId: string, orderedIds: string[]) => void

  // --- SubTask ---
  addSubTask: (taskId: string, subTask: SubTask) => void
  removeSubTask: (taskId: string, subTaskId: string) => void
  toggleSubTask: (taskId: string, subTaskId: string) => void
  reorderSubtasks: (taskId: string, orderedIds: string[]) => void

  // --- UI Panel Toggle ---
  toggleMissionPanel: () => void
  toggleListPanel: () => void
  clearRehydrationError: () => void
  applyLoadedSnapshot: (snapshot: Partial<KanbanStore>) => void
  applyTransientRecovery: (snapshot: Partial<KanbanStore>, message: string) => void
  dismissTransientRecovery: () => void

  // --- Navigation ---
  setCenterTab: (tab: CenterTab) => void
  setActiveBoard: (boardId: string | null) => void

  // --- Note ---
  createNote: (missionId: string, note: Note) => void
  setActiveNote: (missionId: string, noteId: string | null) => void
  deleteNote: (missionId: string, noteId: string) => void
  renameNote: (missionId: string, noteId: string, newTitle: string) => void
  updateNoteBlocks: (noteId: string, blocks: Block[]) => void
  insertBlock: (noteId: string, afterIndex: number, blockType: 'markdown' | 'code') => void
  reorderNotes: (missionId: string, orderedIds: string[]) => void
  reorderBlocks: (noteId: string, orderedBlockIds: string[]) => void

  // --- Linking ---
  linkTaskToNote: (taskId: string, noteId: string | undefined) => void
  linkBlockToTask: (noteId: string, blockId: string, link: { boardId?: string; taskId?: string; subTaskId?: string } | null) => void

  // --- Snapshots ---
  getCurrentContext: () => CurrentContextSnapshot
}

const getBlockPreview = (content: string) => {
  const text = content.replace(/\s+/g, ' ').trim()
  return text.length > 80 ? text.slice(0, 80) : text
}

export const useKanbanStore = create<KanbanStore>()(
  (set, get) => ({
      workspaces: [],
      activeWorkSpaceId: null,
      currentMissionId: null,
      currentNoteId: null,
      currentBoardId: null,
      centerTab: 'boards' as CenterTab,
      previewMissionId: null,
      rehydrationError: null,
      transientRecoveryActive: false,
      transientRecoveryMessage: null,

      missionPanelCollapsed: false,
      listPanelCollapsed: false,

      missions: {},
      boards: {},
      tasks: {},
      notes: {},

      missionOrder: {},
      boardOrder: {},

      // --- Workspace ---
      createWorkSpace: (ws) => {
        set((s) => ({ workspaces: [...s.workspaces, ws] }))
      },
      setWorkSpace: (id) => {
        set({
          activeWorkSpaceId: id,
          currentMissionId: null,
          currentNoteId: null,
          currentBoardId: null,
          previewMissionId: null,
        })
      },
      deleteWorkSpace: (id) => {
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          activeWorkSpaceId: s.activeWorkSpaceId === id ? null : s.activeWorkSpaceId,
          missionOrder: Object.fromEntries(
            Object.entries(s.missionOrder).filter(([k]) => k !== id),
          ),
        }))
      },
      renameWorkSpace: (id, newName) => {
        set((s) => ({
          workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name: newName } : w)),
        }))
      },

      // --- Mission ---
      createMission: (mission) => {
        set((s) => {
          const wsId = s.activeWorkSpaceId
          const prevOrder = wsId ? (s.missionOrder[wsId] ?? []) : []
          return {
            missions: { ...s.missions, [mission.id]: mission },
            currentMissionId: mission.id,
            currentNoteId: null,
            currentBoardId: null,
            previewMissionId: null,
            missionOrder: wsId
              ? { ...s.missionOrder, [wsId]: [...prevOrder, mission.id] }
              : s.missionOrder,
          }
        })
      },
      setMission: (id) => {
        set({ currentMissionId: id, currentNoteId: null, currentBoardId: null, previewMissionId: null })
      },
      setPreviewMission: (id) => {
        set({ previewMissionId: id })
      },
      clearPreviewMission: () => {
        set({ previewMissionId: null })
      },
      deleteMission: (id) => {
        set((s) => {
          const { [id]: _, ...restMissions } = s.missions
          return {
            missions: restMissions,
            currentMissionId: s.currentMissionId === id ? null : s.currentMissionId,
            currentNoteId: s.currentMissionId === id ? null : s.currentNoteId,
            previewMissionId: s.previewMissionId === id ? null : s.previewMissionId,
          }
        })
      },
      renameMission: (id, newTitle) => {
        set((s) => ({
          missions: { ...s.missions, [id]: { ...s.missions[id], title: newTitle } },
        }))
      },
      reorderMissions: (workspaceId, orderedIds) => {
        set((s) => ({
          missionOrder: { ...s.missionOrder, [workspaceId]: orderedIds },
        }))
      },

      // --- Board ---
      createBoard: (board) => {
        set((s) => {
          const missionId = s.currentMissionId
          if (!missionId || !s.missions[missionId]) {
            return { boards: { ...s.boards, [board.id]: board } }
          }
          const mission = s.missions[missionId]
          return {
            boards: { ...s.boards, [board.id]: board },
            missions: {
              ...s.missions,
              [missionId]: { ...mission, boardIds: [...mission.boardIds, board.id] },
            },
            boardOrder: {
              ...s.boardOrder,
              [missionId]: [...(s.boardOrder[missionId] ?? []), board.id],
            },
          }
        })
      },
      deleteBoard: (id) => {
        set((s) => {
          const { [id]: _, ...restBoards } = s.boards
          // Remove from mission.boardIds and boardOrder
          const updatedMissions = { ...s.missions }
          const updatedBoardOrder = { ...s.boardOrder }
          for (const mid of Object.keys(updatedMissions)) {
            const m = updatedMissions[mid]
            if (m.boardIds.includes(id)) {
              updatedMissions[mid] = { ...m, boardIds: m.boardIds.filter((bid) => bid !== id) }
            }
          }
          for (const mid of Object.keys(updatedBoardOrder)) {
            if (updatedBoardOrder[mid]?.includes(id)) {
              updatedBoardOrder[mid] = updatedBoardOrder[mid].filter((bid) => bid !== id)
            }
          }
          return { boards: restBoards, missions: updatedMissions, boardOrder: updatedBoardOrder }
        })
      },
      renameBoard: (id, newTitle) => {
        set((s) => ({
          boards: { ...s.boards, [id]: { ...s.boards[id], title: newTitle } },
        }))
      },
      reorderBoards: (missionId, orderedIds) => {
        set((s) => ({
          boardOrder: { ...s.boardOrder, [missionId]: orderedIds },
        }))
      },

      // --- Task ---
      createTask: (boardId, task) => {
        set((s) => {
          const board = s.boards[boardId]
          return {
            tasks: { ...s.tasks, [task.id]: task },
            boards: {
              ...s.boards,
              [boardId]: { ...board, taskIds: [...board.taskIds, task.id] },
            },
          }
        })
      },
      deleteTask: (boardId, taskId) => {
        set((s) => {
          const board = s.boards[boardId]
          const { [taskId]: _, ...restTasks } = s.tasks
          return {
            tasks: restTasks,
            boards: {
              ...s.boards,
              [boardId]: { ...board, taskIds: board.taskIds.filter((id) => id !== taskId) },
            },
          }
        })
      },
      renameTask: (_boardId, taskId, newTitle) => {
        set((s) => ({
          tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], title: newTitle } },
        }))
      },
      moveTask: (taskId, sourceBoardId, targetBoardId, targetIndex) => {
        set((s) => {
          const sourceBoard = s.boards[sourceBoardId]
          const targetBoard = s.boards[targetBoardId]
          const newSourceTaskIds = sourceBoard.taskIds.filter((id) => id !== taskId)
          const newTargetTaskIds = [...targetBoard.taskIds]
          if (targetIndex !== undefined) {
            newTargetTaskIds.splice(targetIndex, 0, taskId)
          } else {
            newTargetTaskIds.push(taskId)
          }
          return {
            boards: {
              ...s.boards,
              [sourceBoardId]: { ...sourceBoard, taskIds: newSourceTaskIds },
              [targetBoardId]: { ...targetBoard, taskIds: newTargetTaskIds },
            },
          }
        })
      },
      reorderTasks: (boardId, orderedIds) => {
        set((s) => ({
          boards: { ...s.boards, [boardId]: { ...s.boards[boardId], taskIds: orderedIds } },
        }))
      },

      // --- SubTask ---
      addSubTask: (taskId, subTask) => {
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: { ...s.tasks[taskId], subtasks: [...s.tasks[taskId].subtasks, subTask] },
          },
        }))
      },
      removeSubTask: (taskId, subTaskId) => {
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: {
              ...s.tasks[taskId],
              subtasks: s.tasks[taskId].subtasks.filter((st) => st.id !== subTaskId),
            },
          },
        }))
      },
      toggleSubTask: (taskId, subTaskId) => {
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: {
              ...s.tasks[taskId],
              subtasks: s.tasks[taskId].subtasks.map((st) =>
                st.id === subTaskId ? { ...st, done: !st.done } : st,
              ),
            },
          },
        }))
      },
      reorderSubtasks: (taskId, orderedIds) => {
        set((s) => {
          const task = s.tasks[taskId]
          if (!task) return s
          const sorted = orderedIds
            .map((id) => task.subtasks.find((st) => st.id === id))
            .filter(Boolean) as SubTask[]
          return { tasks: { ...s.tasks, [taskId]: { ...task, subtasks: sorted } } }
        })
      },

      // --- UI Panel Toggle ---
      toggleMissionPanel: () => {
        set((s) => ({ missionPanelCollapsed: !s.missionPanelCollapsed }))
      },
      toggleListPanel: () => {
        set((s) => ({ listPanelCollapsed: !s.listPanelCollapsed }))
      },
      clearRehydrationError: () => {
        set({ rehydrationError: null })
      },
      applyLoadedSnapshot: (snapshot) => {
        set({
          ...snapshot,
          rehydrationError: null,
        })
      },
      applyTransientRecovery: (snapshot, message) => {
        set({
          ...snapshot,
          rehydrationError: null,
          transientRecoveryActive: true,
          transientRecoveryMessage: message,
        })
      },
      dismissTransientRecovery: () => {
        set({ transientRecoveryMessage: null })
      },

      // --- Navigation ---
      setCenterTab: (tab) => {
        set({ centerTab: tab })
      },
      setActiveBoard: (boardId) => {
        set({ currentBoardId: boardId, currentNoteId: null })
      },

      // --- Note ---
      createNote: (missionId, note) => {
        set((s) => ({
          notes: { ...s.notes, [note.id]: note },
          missions: {
            ...s.missions,
            [missionId]: {
              ...s.missions[missionId],
              noteIds: [...s.missions[missionId].noteIds, note.id],
            },
          },
        }))
      },
      setActiveNote: (missionId, noteId) => {
        set({
          currentMissionId: missionId,
          currentNoteId: noteId,
          currentBoardId: null,
          previewMissionId: null,
        })
      },
      deleteNote: (missionId, noteId) => {
        set((s) => {
          const { [noteId]: _, ...restNotes } = s.notes
          return {
            notes: restNotes,
            missions: {
              ...s.missions,
              [missionId]: {
                ...s.missions[missionId],
                noteIds: s.missions[missionId].noteIds.filter((id) => id !== noteId),
              },
            },
            currentNoteId: s.currentNoteId === noteId ? null : s.currentNoteId,
          }
        })
      },
      renameNote: (_missionId, noteId, newTitle) => {
        set((s) => ({
          notes: { ...s.notes, [noteId]: { ...s.notes[noteId], title: newTitle } },
        }))
      },
      updateNoteBlocks: (noteId, blocks) => {
        set((s) => ({
          notes: { ...s.notes, [noteId]: { ...s.notes[noteId], blocks } },
        }))
      },
      insertBlock: (noteId, afterIndex, blockType) => {
        set((s) => {
          const note = s.notes[noteId]
          if (!note) return s
          const newBlock: Block = {
            id: crypto.randomUUID(),
            type: blockType,
            content: '',
            ...(blockType === 'code' ? { language: 'javascript' } : {}),
          }
          const blocks = [...note.blocks]
          blocks.splice(afterIndex + 1, 0, newBlock)
          return { notes: { ...s.notes, [noteId]: { ...note, blocks } } }
        })
      },

      reorderNotes: (missionId, orderedIds) => {
        set((s) => {
          const mission = s.missions[missionId]
          if (!mission) return s
          return {
            missions: {
              ...s.missions,
              [missionId]: { ...mission, noteIds: orderedIds },
            },
          }
        })
      },

      reorderBlocks: (noteId, orderedBlockIds) => {
        set((s) => {
          const note = s.notes[noteId]
          if (!note) return s
          const blockMap = new Map(note.blocks.map((b) => [b.id, b]))
          const reordered = orderedBlockIds.map((id) => blockMap.get(id)!).filter(Boolean)
          return { notes: { ...s.notes, [noteId]: { ...note, blocks: reordered } } }
        })
      },

      // --- Linking ---
      linkTaskToNote: (taskId, noteId) => {
        set((s) => {
          const task = s.tasks[taskId]
          if (!task) return s
          return { tasks: { ...s.tasks, [taskId]: { ...task, linkedNoteId: noteId } } }
        })
      },

      linkBlockToTask: (noteId, blockId, link) => {
        set((s) => {
          const note = s.notes[noteId]
          if (!note) return s
          const blocks = note.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  linkedBoardId: link?.boardId,
                  linkedTaskId: link?.taskId,
                  linkedSubTaskId: link?.subTaskId,
                }
              : b,
          )
          return { notes: { ...s.notes, [noteId]: { ...note, blocks } } }
        })
      },

      // --- Snapshots ---
      getCurrentContext: () => {
        const s = get()
        const mission = s.currentMissionId ? s.missions[s.currentMissionId] : null
        const note = s.currentNoteId ? s.notes[s.currentNoteId] : null
        return {
          activeWorkSpaceId: s.activeWorkSpaceId,
          currentMissionId: s.currentMissionId,
          currentMissionTitle: mission?.title ?? null,
          currentNoteId: s.currentNoteId,
          currentNoteTitle: note?.title ?? null,
          previewMissionId: s.previewMissionId,
          effectiveMissionId: s.previewMissionId ?? s.currentMissionId,
        }
      },
    }),
)

// Attach SQLite persistence
attachSqlitePersist(useKanbanStore, {
  name: 'kanban',
  debounceMs: 500,
  serialize: (state) => pickPersistedKanbanState(state),
  restore: (persisted) => ({
    ...(restorePersistedKanbanState(persisted) as Partial<KanbanStore>),
    rehydrationError: null,
    transientRecoveryActive: false,
    transientRecoveryMessage: null,
  }),
  shouldPersist: (state) => !state.transientRecoveryActive,
  onError: (store, error, phase) => {
    const message = error instanceof Error ? error.message : String(error)
    store.setState({
      rehydrationError: phase === 'hydrate'
        ? `本地工作区数据加载失败：${message}。如需恢复，可重置本地数据后重新从云端拉取。`
        : `云端工作区数据重新加载失败：${message}。请稍后重试，或重置本地数据后重新拉取。`,
    } as Partial<KanbanStore>)
  },
})

// Prevent Vite HMR from triggering a full page reload when this module changes
if (import.meta.hot) import.meta.hot.accept()
