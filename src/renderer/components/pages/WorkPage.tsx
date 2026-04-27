import { useState, useCallback } from 'react'
import { useKanbanStore, useAuthStore } from '../../store'
import { MissionSidebar } from '../Mission/MissionSidebar'
import { NoteListPanel } from '../Note/NoteListPanel'
import { BoardView } from '../Board/BoardView'
import { NoteView } from '../Note/NoteView'
import { WindowTitlebar } from '../layout/WindowTitlebar'
import { CloudSyncPanel } from '../settings/CloudSyncPanel'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { orderOwnedIds } from '@shared/orderedIds'

export type DndItemType = 'mission' | 'board' | 'board-card' | 'task' | 'subtask' | 'note' | 'block'

/**
 * Main workspace page: 3-column layout — sidebar / center list / right detail.
 * Houses the single top-level DndContext for all drag-and-drop interactions.
 */
export function WorkPage() {
  const activeWorkSpaceId = useKanbanStore((s) => s.activeWorkSpaceId)
  const workspace = useKanbanStore((s) => s.workspaces.find((w) => w.id === activeWorkSpaceId))
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const currentNoteId = useKanbanStore((s) => s.currentNoteId)
  const currentBoardId = useKanbanStore((s) => s.currentBoardId)
  const missions = useKanbanStore((s) => s.missions)
  const boards = useKanbanStore((s) => s.boards)
  const tasks = useKanbanStore((s) => s.tasks)
  const notes = useKanbanStore((s) => s.notes)
  const boardOrder = useKanbanStore((s) => s.boardOrder)
  const missionOrder = useKanbanStore((s) => s.missionOrder)
  const setActiveBoard = useKanbanStore((s) => s.setActiveBoard)
  const setActiveNote = useKanbanStore((s) => s.setActiveNote)
  const createBoard = useKanbanStore((s) => s.createBoard)
  const createNote = useKanbanStore((s) => s.createNote)
  const reorderMissions = useKanbanStore((s) => s.reorderMissions)
  const reorderBoards = useKanbanStore((s) => s.reorderBoards)
  const reorderTasks = useKanbanStore((s) => s.reorderTasks)
  const reorderNotes = useKanbanStore((s) => s.reorderNotes)
  const reorderBlocks = useKanbanStore((s) => s.reorderBlocks)
  const reorderSubtasks = useKanbanStore((s) => s.reorderSubtasks)
  const moveTask = useKanbanStore((s) => s.moveTask)
  const missionPanelCollapsed = useKanbanStore((s) => s.missionPanelCollapsed)
  const listPanelCollapsed = useKanbanStore((s) => s.listPanelCollapsed)
  const rehydrationError = useKanbanStore((s) => s.rehydrationError)
  const clearRehydrationError = useKanbanStore((s) => s.clearRehydrationError)
  const transientRecoveryMessage = useKanbanStore((s) => s.transientRecoveryMessage)
  const dismissTransientRecovery = useKanbanStore((s) => s.dismissTransientRecovery)
  const setWorkSpace = useKanbanStore((s) => s.setWorkSpace)
  const logout = useAuthStore((s) => s.logout)
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<DndItemType | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const type = event.active.data.current?.type as DndItemType | undefined
    setActiveId(String(event.active.id))
    setActiveType(type ?? null)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current
    const overData = over.data.current
    if (!activeData || !overData) return

    // Cross-board task preview: move task to new board on hover
    if (activeData.type === 'task' && overData.type === 'task' && activeData.boardId !== overData.boardId) {
      const fromBoardId = activeData.boardId as string
      const toBoardId = overData.boardId as string
      const targetBoard = boards[toBoardId]
      if (!targetBoard) return
      const overIndex = targetBoard.taskIds.indexOf(String(over.id))
      moveTask(String(active.id), fromBoardId, toBoardId, overIndex >= 0 ? overIndex : undefined)
      // Update active data to reflect new board
      active.data.current = { ...activeData, boardId: toBoardId }
    }
  }, [boards, moveTask])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    setActiveType(null)

    const { active, over } = event
    if (!over || active.id === over.id) return
    const type = active.data.current?.type as DndItemType | undefined
    if (!type) return

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    switch (type) {
      case 'mission': {
        if (!activeWorkSpaceId || !workspace) break
        const ownedMissionIds = workspace.missionIds.filter((id) => missions[id])
        const ids = orderOwnedIds(ownedMissionIds, missionOrder[activeWorkSpaceId] ?? [])
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderMissions(activeWorkSpaceId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
      case 'board': {
        if (!currentMissionId) break
        const ids = boardOrder[currentMissionId] ?? []
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderBoards(currentMissionId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
      case 'board-card': {
        if (!currentMissionId) break
        const ids = boardOrder[currentMissionId] ?? []
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderBoards(currentMissionId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
      case 'task': {
        const boardId = active.data.current?.boardId as string | undefined
        if (!boardId) break
        const board = boards[boardId]
        if (!board) break
        const oldIdx = board.taskIds.indexOf(activeIdStr)
        const newIdx = board.taskIds.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderTasks(boardId, arrayMove(board.taskIds, oldIdx, newIdx))
        }
        break
      }
      case 'subtask': {
        const taskId = active.data.current?.taskId as string | undefined
        if (!taskId) break
        const task = tasks[taskId]
        if (!task) break
        const ids = task.subtasks.map((st) => st.id)
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderSubtasks(taskId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
      case 'note': {
        if (!currentMissionId) break
        const mission = missions[currentMissionId]
        if (!mission) break
        const ids = mission.noteIds
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderNotes(currentMissionId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
      case 'block': {
        if (!currentNoteId) break
        const note = notes[currentNoteId]
        if (!note) break
        const ids = note.blocks.map((b) => b.id)
        const oldIdx = ids.indexOf(activeIdStr)
        const newIdx = ids.indexOf(overIdStr)
        if (oldIdx !== -1 && newIdx !== -1) {
          reorderBlocks(currentNoteId, arrayMove(ids, oldIdx, newIdx))
        }
        break
      }
    }
  }, [activeWorkSpaceId, currentMissionId, currentNoteId, missionOrder, missions, boardOrder, boards, tasks, notes, reorderMissions, reorderBoards, reorderTasks, reorderNotes, reorderBlocks, reorderSubtasks, moveTask])

  if (!workspace) return null

  const handleCreateBoard = () => {
    if (!currentMissionId) return
    const id = crypto.randomUUID()
    createBoard({ id, title: '新看板', taskIds: [] })
    setActiveBoard(id)
  }

  const handleCreateNote = () => {
    if (!currentMissionId) return
    const id = crypto.randomUUID()
    createNote(currentMissionId, { id, title: '新笔记', blocks: [] })
    setActiveNote(currentMissionId, id)
  }

  // Board overview: when mission selected but no board/note chosen
  const mission = currentMissionId ? missions[currentMissionId] : null
  const showBoardOverview = !!currentMissionId && !currentNoteId && !currentBoardId && !!mission
  let overviewBoardIds: string[] = []
  if (showBoardOverview && mission) {
    const ordered = boardOrder[currentMissionId!] ?? []
    overviewBoardIds = ordered.filter((id) => boards[id])
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <WindowTitlebar
        onBack={() => setWorkSpace(null)}
        breadcrumb={workspace.name}
        actions={
          <>
            <button
              className="p-1 rounded hover:bg-surface-container-high"
              onClick={() => setSyncPanelOpen(true)}
              title="云端同步"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">cloud_sync</span>
            </button>
            <button
              className="p-1 rounded hover:bg-surface-container-high"
              onClick={logout}
              title="登出"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">logout</span>
            </button>
          </>
        }
      />

      <CloudSyncPanel open={syncPanelOpen} onClose={() => setSyncPanelOpen(false)} />

      {rehydrationError && (
        <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-700">
          <div>
            <p className="text-sm font-semibold">工作区数据同步异常</p>
            <p className="mt-1 text-xs leading-5">{rehydrationError}</p>
          </div>
          <button
            className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-500/10"
            onClick={clearRehydrationError}
          >
            关闭
          </button>
        </div>
      )}

      {transientRecoveryMessage && (
        <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800">
          <div>
            <p className="text-sm font-semibold">云端数据已按临时模式恢复</p>
            <p className="mt-1 text-xs leading-5">{transientRecoveryMessage}</p>
          </div>
          <button
            className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-amber-800 hover:bg-amber-500/10"
            onClick={dismissTransientRecovery}
          >
            知道了
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Mission sidebar */}
          <div
            className="flex-shrink-0 border-r border-outline-variant bg-surface-container transition-all duration-200 overflow-hidden"
            style={{ width: missionPanelCollapsed ? 40 : 224 }}
          >
            <MissionSidebar />
          </div>

          {/* Center: Note/Board list */}
          <div
            className="flex-shrink-0 border-r border-outline-variant bg-surface-container-low transition-all duration-200 overflow-hidden"
            style={{ width: listPanelCollapsed ? 40 : 288 }}
          >
            <NoteListPanel />
          </div>

          {/* Right: Detail view */}
          <div className="flex-1 flex overflow-hidden">
            {currentNoteId ? (
              <NoteView />
            ) : currentBoardId ? (
              <BoardView />
            ) : showBoardOverview && overviewBoardIds.length > 0 ? (
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-lg font-semibold text-on-surface mb-4">
                {mission!.title} — 看板总览
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overviewBoardIds.map((bid) => {
                  const board = boards[bid]
                  if (!board) return null
                  return (
                    <button
                      key={bid}
                      className="p-4 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors text-left"
                      onClick={() => setActiveBoard(bid)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">view_kanban</span>
                        <span className="font-medium text-sm text-on-surface">{board.title}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{board.taskIds.length} 个任务</p>
                    </button>
                  )
                })}
                {/* Create buttons */}
                <button
                  className="p-4 rounded-xl border border-dashed border-outline-variant hover:bg-surface-container-high transition-colors text-left"
                  onClick={handleCreateBoard}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-on-surface-variant">add</span>
                    <span className="text-sm text-on-surface-variant">新建看板</span>
                  </div>
                </button>
                <button
                  className="p-4 rounded-xl border border-dashed border-outline-variant hover:bg-surface-container-high transition-colors text-left"
                  onClick={handleCreateNote}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-on-surface-variant">add</span>
                    <span className="text-sm text-on-surface-variant">新建笔记</span>
                  </div>
                </button>
              </div>
            </div>
          ) : currentMissionId ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined text-5xl mb-1 block opacity-30">article</span>
                <p className="text-sm">从中间面板选择，或快速创建</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-outline-variant hover:bg-surface-container-high transition-colors"
                    onClick={handleCreateBoard}
                  >
                    <span className="material-symbols-outlined text-base">view_kanban</span>
                    <span className="text-sm">新建看板</span>
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-outline-variant hover:bg-surface-container-high transition-colors"
                    onClick={handleCreateNote}
                  >
                    <span className="material-symbols-outlined text-base">note_add</span>
                    <span className="text-sm">新建笔记</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">dashboard</span>
                <p className="text-sm">从侧边栏选择一个任务</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeId && activeType ? (
          <DragOverlayContent type={activeType} id={activeId} />
        ) : null}
      </DragOverlay>
      </DndContext>
    </div>
  )
}

/** Lightweight overlay shown while dragging */
function DragOverlayContent({ type, id }: { type: DndItemType; id: string }) {
  const missions = useKanbanStore((s) => s.missions)
  const boards = useKanbanStore((s) => s.boards)
  const tasks = useKanbanStore((s) => s.tasks)
  const notes = useKanbanStore((s) => s.notes)

  let label = id
  let icon = 'drag_indicator'

  switch (type) {
    case 'mission':
      label = missions[id]?.title ?? id
      icon = 'folder'
      break
    case 'board':
    case 'board-card':
      label = boards[id]?.title ?? id
      icon = 'view_kanban'
      break
    case 'task':
      label = tasks[id]?.title ?? id
      icon = 'task_alt'
      break
    case 'subtask': {
      // Find subtask across tasks
      for (const task of Object.values(tasks)) {
        const st = task.subtasks.find((s) => s.id === id)
        if (st) { label = st.title; break }
      }
      icon = 'check_circle'
      break
    }
    case 'note':
      label = notes[id]?.title ?? id
      icon = 'description'
      break
    case 'block':
      label = '内容块'
      icon = 'article'
      break
  }

  return (
    <div className="px-3 py-2 rounded-lg bg-surface shadow-lg border border-outline-variant flex items-center gap-2 max-w-xs">
      <span className="material-symbols-outlined text-sm text-on-surface-variant">{icon}</span>
      <span className="text-sm text-on-surface truncate">{label}</span>
    </div>
  )
}
