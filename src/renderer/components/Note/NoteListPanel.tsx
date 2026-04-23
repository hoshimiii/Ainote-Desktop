import { useEffect, useState } from 'react'
import { useKanbanStore } from '../../store'
import type { CenterTab } from '../../store/kanban'
import { CreateDialog } from '../items/CreateDialog'
import { DeleteDialog } from '../items/DeleteDialog'
import { RenameDialog } from '../items/RenameDialog'
import { Button, ScrollArea, cn, useContextMenu } from '../ui'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../dnd/SortableItem'

export function NoteListPanel() {
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const missions = useKanbanStore((s) => s.missions)
  const notes = useKanbanStore((s) => s.notes)
  const boards = useKanbanStore((s) => s.boards)
  const boardOrder = useKanbanStore((s) => s.boardOrder)
  const currentNoteId = useKanbanStore((s) => s.currentNoteId)
  const currentBoardId = useKanbanStore((s) => s.currentBoardId)
  const centerTab = useKanbanStore((s) => s.centerTab)
  const setCenterTab = useKanbanStore((s) => s.setCenterTab)
  const setActiveNote = useKanbanStore((s) => s.setActiveNote)
  const setActiveBoard = useKanbanStore((s) => s.setActiveBoard)
  const createNote = useKanbanStore((s) => s.createNote)
  const deleteNote = useKanbanStore((s) => s.deleteNote)
  const createBoard = useKanbanStore((s) => s.createBoard)
  const deleteBoard = useKanbanStore((s) => s.deleteBoard)
  const renameNote = useKanbanStore((s) => s.renameNote)
  const renameBoard = useKanbanStore((s) => s.renameBoard)
  const reorderNotes = useKanbanStore((s) => s.reorderNotes)
  const reorderBoards = useKanbanStore((s) => s.reorderBoards)
  const collapsed = useKanbanStore((s) => s.listPanelCollapsed)
  const toggleListPanel = useKanbanStore((s) => s.toggleListPanel)

  // Compute before early returns so hooks are always called in the same order
  const orderedBoardIds = currentMissionId ? (boardOrder[currentMissionId] ?? []) : []
  const hasBoardsInMission = orderedBoardIds.some((id) => boards[id])

  // Fallback: if on boards tab but mission has no boards, switch to notes
  // Must be defined before any early return to satisfy Rules of Hooks
  useEffect(() => {
    if (!currentMissionId) return
    if (centerTab === 'boards' && !hasBoardsInMission) {
      setCenterTab('notes')
    }
  }, [currentMissionId, centerTab, hasBoardsInMission, setCenterTab])

  if (!currentMissionId) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 flex items-center justify-end">
          <Button variant="ghost" size="icon" onClick={toggleListPanel}>
            <span className="material-symbols-outlined text-sm">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </Button>
        </div>
        {!collapsed && (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            <p className="text-sm">选择一个任务</p>
          </div>
        )}
      </div>
    )
  }

  const mission = missions[currentMissionId]
  if (!mission) return null

  const tabs: { key: CenterTab; label: string }[] = [
    { key: 'notes', label: '笔记' },
    { key: 'boards', label: '看板' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Toggle button row */}
      <div className="flex items-center border-b border-outline-variant">
        {!collapsed && tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              centerTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
            onClick={() => setCenterTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <Button variant="ghost" size="icon" className="mx-1 flex-shrink-0" onClick={toggleListPanel}>
          <span className="material-symbols-outlined text-sm">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </Button>
      </div>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          {centerTab === 'notes' ? (
            <NoteCards
              missionId={currentMissionId}
              noteIds={mission.noteIds}
              notes={notes}
              currentNoteId={currentNoteId}
              onSelect={(noteId) => setActiveNote(currentMissionId, noteId)}
              onCreate={(name) => {
                const noteId = crypto.randomUUID()
                createNote(currentMissionId, { id: noteId, title: name, blocks: [] })
                setActiveNote(currentMissionId, noteId)
              }}
              onDelete={(noteId) => deleteNote(currentMissionId, noteId)}
              onRename={(noteId, newTitle) => renameNote(currentMissionId, noteId, newTitle)}
              onReorder={(orderedIds) => reorderNotes(currentMissionId, orderedIds)}
            />
          ) : (
            <BoardCards
              missionId={currentMissionId}
              boardOrder={boardOrder}
              boards={boards}
              currentBoardId={currentBoardId}
              onSelect={(boardId) => setActiveBoard(boardId)}
              onCreate={(name) => {
                const boardId = crypto.randomUUID()
                createBoard({ id: boardId, title: name, taskIds: [] })
                setActiveBoard(boardId)
              }}
              onDelete={(boardId) => deleteBoard(boardId)}
              onRename={(boardId, newTitle) => renameBoard(boardId, newTitle)}
              onReorder={(orderedIds) => reorderBoards(currentMissionId, orderedIds)}
            />
          )}
        </ScrollArea>
      )}
    </div>
  )
}

function NoteCards({
  missionId,
  noteIds,
  notes,
  currentNoteId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onReorder,
}: {
  missionId: string
  noteIds: string[]
  notes: Record<string, import('@shared/types').Note>
  currentNoteId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const { show: showContextMenu } = useContextMenu()
  const [ctxRenameId, setCtxRenameId] = useState<string | null>(null)
  const [ctxDeleteId, setCtxDeleteId] = useState<string | null>(null)

  return (
    <div className="p-2 space-y-1">
      {/* Create button */}
      <CreateDialog
        title="新建笔记"
        onConfirm={onCreate}
        trigger={
          <button className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            新建笔记
          </button>
        }
      />

      <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
          {noteIds.map((noteId) => {
            const note = notes[noteId]
            if (!note) return null
            const preview = note.blocks
              .filter((b) => b.type === 'markdown')
              .map((b) => b.content)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 80)
            const isActive = noteId === currentNoteId

            return (
              <SortableItem key={noteId} id={noteId} data={{ type: 'note' }}>
                <div
                  className={cn(
                    'group relative p-3 rounded-lg cursor-pointer transition-colors',
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-surface-container-high',
                  )}
                  onClick={() => onSelect(noteId)}
                  onContextMenu={(e) => showContextMenu(e, [
                    { label: '重命名', icon: 'edit', onClick: () => setCtxRenameId(noteId) },
                    { label: '删除', icon: 'delete', onClick: () => setCtxDeleteId(noteId) },
                  ])}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-on-surface truncate flex-1">
                      {note.title || '无标题'}
                    </h4>
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RenameDialog
                        title="重命名笔记"
                        initialName={note.title}
                        onConfirm={(newName) => onRename(noteId, newName)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                        }
                      />
                      <DeleteDialog
                        title="删除笔记"
                        description={`确定删除 "${note.title}" 吗？`}
                        onConfirm={() => onDelete(noteId)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        }
                      />
                    </div>
                  </div>
                  {preview && (
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{preview}</p>
                  )}
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    {note.blocks.length} 个块
                  </p>
                </div>
              </SortableItem>
            )
          })}
      </SortableContext>

      {noteIds.length === 0 && (
        <p className="text-xs text-on-surface-variant text-center py-4">暂无笔记</p>
      )}

      {/* Context-menu triggered dialogs */}
      {ctxRenameId && notes[ctxRenameId] && (
        <RenameDialog
          initialName={notes[ctxRenameId].title}
          title="重命名笔记"
          onConfirm={(newName) => { onRename(ctxRenameId, newName); setCtxRenameId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxRenameId(null) }}
        />
      )}
      {ctxDeleteId && notes[ctxDeleteId] && (
        <DeleteDialog
          title="删除笔记"
          description={`确定删除 "${notes[ctxDeleteId].title}" 吗？`}
          onConfirm={() => { onDelete(ctxDeleteId); setCtxDeleteId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxDeleteId(null) }}
        />
      )}
    </div>
  )
}

function BoardCards({
  missionId,
  boardOrder,
  boards,
  currentBoardId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onReorder,
}: {
  missionId: string
  boardOrder: Record<string, string[]>
  boards: Record<string, import('@shared/types').Board>
  currentBoardId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const { show: showContextMenu } = useContextMenu()
  const [ctxRenameId, setCtxRenameId] = useState<string | null>(null)
  const [ctxDeleteId, setCtxDeleteId] = useState<string | null>(null)
  const orderedIds = boardOrder[missionId] ?? []
  const displayIds = orderedIds.filter((id) => boards[id])

  return (
    <div className="p-2 space-y-1">
      <CreateDialog
        title="新建看板"
        onConfirm={onCreate}
        trigger={
          <button className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            新建看板
          </button>
        }
      />

      <SortableContext items={displayIds} strategy={verticalListSortingStrategy}>
          {displayIds.map((boardId) => {
            const board = boards[boardId]
            if (!board) return null
            const isActive = boardId === currentBoardId

            return (
              <SortableItem key={boardId} id={boardId} data={{ type: 'board-card' }}>
                <div
                  className={cn(
                    'group relative p-3 rounded-lg cursor-pointer transition-colors',
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-surface-container-high',
                  )}
                  onClick={() => onSelect(boardId)}
                  onContextMenu={(e) => showContextMenu(e, [
                    { label: '重命名', icon: 'edit', onClick: () => setCtxRenameId(boardId) },
                    { label: '删除', icon: 'delete', onClick: () => setCtxDeleteId(boardId) },
                  ])}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">view_kanban</span>
                      <h4 className="text-sm font-medium text-on-surface truncate">{board.title}</h4>
                    </div>
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RenameDialog
                        title="重命名看板"
                        initialName={board.title}
                        onConfirm={(newName) => onRename(boardId, newName)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                        }
                      />
                      <DeleteDialog
                        title="删除看板"
                        description={`确定删除 "${board.title}" 吗？`}
                        onConfirm={() => onDelete(boardId)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {board.taskIds.length} 个任务
                  </p>
                </div>
              </SortableItem>
            )
          })}
      </SortableContext>

      {displayIds.length === 0 && (
        <p className="text-xs text-on-surface-variant text-center py-4">暂无看板</p>
      )}

      {/* Context-menu triggered dialogs */}
      {ctxRenameId && boards[ctxRenameId] && (
        <RenameDialog
          initialName={boards[ctxRenameId].title}
          title="重命名看板"
          onConfirm={(newName) => { onRename(ctxRenameId, newName); setCtxRenameId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxRenameId(null) }}
        />
      )}
      {ctxDeleteId && boards[ctxDeleteId] && (
        <DeleteDialog
          title="删除看板"
          description={`确定删除 "${boards[ctxDeleteId].title}" 吗？`}
          onConfirm={() => { onDelete(ctxDeleteId); setCtxDeleteId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxDeleteId(null) }}
        />
      )}
    </div>
  )
}
