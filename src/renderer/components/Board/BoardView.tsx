import { useKanbanStore } from '../../store'
import { CreateDialog } from '../items/CreateDialog'
import { DeleteDialog } from '../items/DeleteDialog'
import { RenameDialog } from '../items/RenameDialog'
import { Button, Card, ScrollArea, cn } from '../ui'
import type { SubTask } from '@shared/types'
import { useCallback, useState } from 'react'
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../dnd/SortableItem'
import {
  getLinkedNoteTitle,
  isModifierNoteNavigation,
  resolveLinkedNoteTarget,
} from './noteNavigation'

export function BoardView() {
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const missions = useKanbanStore((s) => s.missions)
  const boards = useKanbanStore((s) => s.boards)
  const tasks = useKanbanStore((s) => s.tasks)
  const notes = useKanbanStore((s) => s.notes)
  const boardOrder = useKanbanStore((s) => s.boardOrder)
  const createBoard = useKanbanStore((s) => s.createBoard)
  const deleteBoard = useKanbanStore((s) => s.deleteBoard)
  const renameBoard = useKanbanStore((s) => s.renameBoard)
  const createTask = useKanbanStore((s) => s.createTask)
  const deleteTask = useKanbanStore((s) => s.deleteTask)
  const renameTask = useKanbanStore((s) => s.renameTask)
  const addSubTask = useKanbanStore((s) => s.addSubTask)
  const removeSubTask = useKanbanStore((s) => s.removeSubTask)
  const toggleSubTask = useKanbanStore((s) => s.toggleSubTask)
  const createNote = useKanbanStore((s) => s.createNote)
  const setActiveNote = useKanbanStore((s) => s.setActiveNote)
  const setCenterTab = useKanbanStore((s) => s.setCenterTab)

  if (!currentMissionId) return null
  const mission = missions[currentMissionId]
  if (!mission) return null

  // Get ordered boards for THIS mission only
  const orderedBoardIds = boardOrder[currentMissionId] ?? []
  const displayBoardIds = orderedBoardIds.filter((id) => boards[id])

  const resolveNoteTitle = useCallback(
    (noteId?: string) => getLinkedNoteTitle(noteId, notes),
    [notes],
  )

  const openLinkedNote = useCallback(
    (noteId?: string, blockId?: string) => {
      const target = resolveLinkedNoteTarget(noteId, blockId, currentMissionId, missions, notes)
      if (!target) return
      setCenterTab('notes')
      setActiveNote(target.missionId, target.noteId, target.blockId)
    },
    [currentMissionId, missions, notes, setActiveNote, setCenterTab],
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mission header */}
      <div className="flex items-center justify-between p-4 border-b border-outline-variant">
        <h2 className="text-lg font-semibold text-on-surface">{mission.title}</h2>
        <div className="flex gap-2">
          <CreateDialog
            title="新建看板"
            onConfirm={(name) => {
              const boardId = crypto.randomUUID()
              createBoard({ id: boardId, title: name, taskIds: [] })
            }}
            trigger={
              <Button variant="secondary" size="sm">
                <span className="material-symbols-outlined text-sm">view_column</span>
                新建看板
              </Button>
            }
          />
          <CreateDialog
            title="新建笔记"
            onConfirm={(name) => {
              const noteId = crypto.randomUUID()
              createNote(currentMissionId, {
                id: noteId,
                title: name,
                blocks: [],
              })
              setActiveNote(currentMissionId, noteId)
            }}
            trigger={
              <Button size="sm">
                <span className="material-symbols-outlined text-sm">note_add</span>
                新建笔记
              </Button>
            }
          />
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto">
        <SortableContext items={displayBoardIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 p-4 h-full min-w-max">
              {displayBoardIds.map((boardId) => {
                const board = boards[boardId]
                if (!board) return null

                return (
                  <SortableItem key={boardId} id={boardId} data={{ type: 'board' }}>
                    <BoardColumn
                      boardId={boardId}
                      title={board.title}
                      taskIds={board.taskIds}
                      tasks={tasks}
                      onRename={(newName) => renameBoard(boardId, newName)}
                      onDelete={() => deleteBoard(boardId)}
                      onCreateTask={(name) => {
                        createTask(boardId, {
                          id: crypto.randomUUID(),
                          title: name,
                          description: '',
                          subtasks: [],
                        })
                      }}
                      onDeleteTask={(taskId) => deleteTask(boardId, taskId)}
                      onRenameTask={(taskId, newName) => renameTask(boardId, taskId, newName)}
                      onAddSubTask={addSubTask}
                      onRemoveSubTask={removeSubTask}
                      onToggleSubTask={toggleSubTask}
                      getLinkedNoteTitle={resolveNoteTitle}
                      onOpenLinkedNote={openLinkedNote}
                    />
                  </SortableItem>
                )
              })}

              {displayBoardIds.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-on-surface-variant">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">view_kanban</span>
                    <p className="text-sm">暂无看板，创建一个来管理任务</p>
                  </div>
                </div>
              )}
            </div>
        </SortableContext>
      </div>

      {/* Notes list at bottom */}
      {mission.noteIds.length > 0 && (
        <NotesList missionId={currentMissionId} noteIds={mission.noteIds} />
      )}
    </div>
  )
}

// --- Board Column ---
function BoardColumn({
  boardId,
  title,
  taskIds,
  tasks,
  onRename,
  onDelete,
  onCreateTask,
  onDeleteTask,
  onRenameTask,
  onAddSubTask,
  onRemoveSubTask,
  onToggleSubTask,
  getLinkedNoteTitle,
  onOpenLinkedNote,
}: {
  boardId: string
  title: string
  taskIds: string[]
  tasks: Record<string, import('@shared/types').Task>
  onRename: (name: string) => void
  onDelete: () => void
  onCreateTask: (name: string) => void
  onDeleteTask: (taskId: string) => void
  onRenameTask: (taskId: string, name: string) => void
  onAddSubTask: (taskId: string, st: SubTask) => void
  onRemoveSubTask: (taskId: string, stId: string) => void
  onToggleSubTask: (taskId: string, stId: string) => void
  getLinkedNoteTitle: (noteId?: string) => string | null
  onOpenLinkedNote: (noteId?: string, blockId?: string) => void
}) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-surface-container">
      {/* Column header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-on-surface truncate">{title}</h3>
          <span className="text-xs text-on-surface-variant bg-surface-container-high rounded-full px-2 py-0.5">
            {taskIds.length}
          </span>
        </div>
        <div className="flex gap-0.5">
          <RenameDialog initialName={title} onConfirm={onRename} trigger={
            <button className="p-1 rounded hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-xs">edit</span>
            </button>
          } />
          <DeleteDialog title="删除看板" description={`确定删除 "${title}" 吗？`} onConfirm={onDelete} trigger={
            <button className="p-1 rounded hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-xs">delete</span>
            </button>
          } />
        </div>
      </div>

      {/* Tasks */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {taskIds.map((taskId) => {
              const task = tasks[taskId]
              if (!task) return null
              return (
                <SortableItem key={taskId} id={taskId} data={{ type: 'task', boardId }}>
                  <TaskCard
                    task={task}
                    onRename={(name) => onRenameTask(taskId, name)}
                    onDelete={() => onDeleteTask(taskId)}
                    onAddSubTask={(st) => onAddSubTask(taskId, st)}
                    onRemoveSubTask={(stId) => onRemoveSubTask(taskId, stId)}
                    onToggleSubTask={(stId) => onToggleSubTask(taskId, stId)}
                    getLinkedNoteTitle={getLinkedNoteTitle}
                    onOpenLinkedNote={onOpenLinkedNote}
                  />
                </SortableItem>
              )
            })}
        </SortableContext>
      </ScrollArea>

      {/* Add task */}
      <div className="p-2">
        <CreateDialog
          title="新建任务"
          onConfirm={onCreateTask}
          trigger={
            <button className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              添加任务
            </button>
          }
        />
      </div>
    </div>
  )
}

// --- Task Card ---
function TaskCard({
  task,
  onRename,
  onDelete,
  onAddSubTask,
  onRemoveSubTask,
  onToggleSubTask,
  getLinkedNoteTitle,
  onOpenLinkedNote,
}: {
  task: import('@shared/types').Task
  onRename: (name: string) => void
  onDelete: () => void
  onAddSubTask: (st: SubTask) => void
  onRemoveSubTask: (stId: string) => void
  onToggleSubTask: (stId: string) => void
  getLinkedNoteTitle: (noteId?: string) => string | null
  onOpenLinkedNote: (noteId?: string, blockId?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const completedCount = task.subtasks.filter((st) => st.done).length
  const taskLinkedNoteTitle = getLinkedNoteTitle(task.linkedNoteId)

  return (
    <Card className="mb-2 group" elevation={1}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center flex-1 min-w-0">
          <button
            className="p-0.5 rounded hover:bg-surface-container-high flex-shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              {expanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
          <button
            className="flex-1 text-left text-sm font-medium text-on-surface truncate"
            title={taskLinkedNoteTitle ? 'Ctrl/Cmd + 点击打开关联笔记' : undefined}
            onClick={(event) => {
              if (task.linkedNoteId && taskLinkedNoteTitle && isModifierNoteNavigation(event)) {
                event.preventDefault()
                event.stopPropagation()
                onOpenLinkedNote(task.linkedNoteId)
                return
              }
              setExpanded(!expanded)
            }}
          >
            {task.title}
          </button>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <RenameDialog initialName={task.title} onConfirm={onRename} trigger={
            <button className="p-0.5 rounded hover:bg-surface-container-highest">
              <span className="material-symbols-outlined text-xs">edit</span>
            </button>
          } />
          <DeleteDialog title="删除任务" description={`确定删除 "${task.title}" 吗？`} onConfirm={onDelete} trigger={
            <button className="p-0.5 rounded hover:bg-surface-container-highest">
              <span className="material-symbols-outlined text-xs">delete</span>
            </button>
          } />
        </div>
      </div>

      {/* Subtask count */}
      {task.subtasks.length > 0 && (
        <div className="mt-1 text-xs text-on-surface-variant">
          {completedCount}/{task.subtasks.length} 子任务
        </div>
      )}

      {/* Linked note indicator */}
      {task.linkedNoteId && taskLinkedNoteTitle && (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/15"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onOpenLinkedNote(task.linkedNoteId)
          }}
        >
          <span className="material-symbols-outlined text-[10px]">description</span>
          {taskLinkedNoteTitle}
        </button>
      )}

      {/* Expanded subtasks */}
      {expanded && (
        <div className="mt-2 space-y-1">
          <SortableContext items={task.subtasks.map((st) => st.id)} strategy={verticalListSortingStrategy}>
            {task.subtasks.map((st) => (
              <SortableItem key={st.id} id={st.id} data={{ type: 'subtask', taskId: task.id }}>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={st.done}
                    onChange={() => onToggleSubTask(st.id)}
                    className="rounded"
                  />
                  <button
                    type="button"
                    className={cn(
                      'flex-1 min-w-0 text-left',
                      st.done && 'line-through text-on-surface-variant',
                    )}
                    title={st.noteId ? 'Ctrl/Cmd + 点击打开关联笔记' : undefined}
                    onPointerDown={(event) => {
                      if (st.noteId) event.stopPropagation()
                    }}
                    onClick={(event) => {
                      if (st.noteId && isModifierNoteNavigation(event)) {
                        event.preventDefault()
                        event.stopPropagation()
                        onOpenLinkedNote(st.noteId, st.blockId)
                      }
                    }}
                  >
                    <span className="truncate">{st.title}</span>
                  </button>
                  {st.noteId && getLinkedNoteTitle(st.noteId) && (
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary transition-colors hover:bg-primary/15"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenLinkedNote(st.noteId, st.blockId)
                      }}
                    >
                      <span className="material-symbols-outlined text-[10px]">description</span>
                      {getLinkedNoteTitle(st.noteId)}
                    </button>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-container-highest"
                    onClick={() => onRemoveSubTask(st.id)}
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              </SortableItem>
            ))}
          </SortableContext>
          <CreateDialog
            title="新建子任务"
            onConfirm={(name) =>
              onAddSubTask({ id: crypto.randomUUID(), title: name, done: false })
            }
            trigger={
              <button className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-xs">add</span>
                添加子任务
              </button>
            }
          />
        </div>
      )}
    </Card>
  )
}

// --- Notes List (bottom bar) ---
function NotesList({ missionId, noteIds }: { missionId: string; noteIds: string[] }) {
  const notes = useKanbanStore((s) => s.notes)
  const setActiveNote = useKanbanStore((s) => s.setActiveNote)
  const deleteNote = useKanbanStore((s) => s.deleteNote)

  return (
    <div className="border-t border-outline-variant bg-surface-container p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-sm text-on-surface-variant">description</span>
        <span className="text-xs font-semibold text-on-surface-variant">笔记</span>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {noteIds.map((noteId) => {
          const note = notes[noteId]
          if (!note) return null
          return (
            <button
              key={noteId}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-surface-container-high text-sm text-on-surface hover:bg-surface-container-highest transition-colors"
              onClick={() => setActiveNote(missionId, noteId)}
            >
              {note.title || 'Untitled'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
