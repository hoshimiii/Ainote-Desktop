import { useState } from 'react'
import { useKanbanStore } from '../../store'
import { Button } from '../ui'

interface LinkBlockDialogProps {
  noteId: string
  blockId: string
  currentBoardId?: string
  currentTaskId?: string
  currentSubTaskId?: string
  onClose: () => void
}

export function LinkBlockDialog({
  noteId,
  blockId,
  currentBoardId,
  currentTaskId,
  currentSubTaskId,
  onClose,
}: LinkBlockDialogProps) {
  const boards = useKanbanStore((s) => s.boards)
  const tasks = useKanbanStore((s) => s.tasks)
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const boardOrder = useKanbanStore((s) => s.boardOrder)
  const linkBlockToTask = useKanbanStore((s) => s.linkBlockToTask)

  const [selectedBoardId, setSelectedBoardId] = useState(currentBoardId ?? '')
  const [selectedTaskId, setSelectedTaskId] = useState(currentTaskId ?? '')
  const [selectedSubTaskId, setSelectedSubTaskId] = useState(currentSubTaskId ?? '')

  const missionBoardIds = currentMissionId ? (boardOrder[currentMissionId] ?? []) : []
  const selectedBoard = selectedBoardId ? boards[selectedBoardId] : null
  const selectedTask = selectedTaskId ? tasks[selectedTaskId] : null

  const handleSave = () => {
    const link = selectedBoardId
      ? {
          boardId: selectedBoardId || undefined,
          taskId: selectedTaskId || undefined,
          subTaskId: selectedSubTaskId || undefined,
        }
      : null
    linkBlockToTask(noteId, blockId, link)
    onClose()
  }

  const handleClear = () => {
    linkBlockToTask(noteId, blockId, null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface rounded-xl shadow-xl w-80 max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">关联到任务</h3>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Board selector */}
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">看板</label>
            <select
              value={selectedBoardId}
              onChange={(e) => { setSelectedBoardId(e.target.value); setSelectedTaskId(''); setSelectedSubTaskId('') }}
              className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface"
            >
              <option value="">无</option>
              {missionBoardIds.map((id) => {
                const b = boards[id]
                return b ? <option key={id} value={id}>{b.title}</option> : null
              })}
            </select>
          </div>

          {/* Task selector */}
          {selectedBoard && (
            <div>
              <label className="text-xs font-medium text-on-surface-variant mb-1 block">任务</label>
              <select
                value={selectedTaskId}
                onChange={(e) => { setSelectedTaskId(e.target.value); setSelectedSubTaskId('') }}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface"
              >
                <option value="">无</option>
                {selectedBoard.taskIds.map((id) => {
                  const t = tasks[id]
                  return t ? <option key={id} value={id}>{t.title}</option> : null
                })}
              </select>
            </div>
          )}

          {/* SubTask selector */}
          {selectedTask && selectedTask.subtasks.length > 0 && (
            <div>
              <label className="text-xs font-medium text-on-surface-variant mb-1 block">子任务</label>
              <select
                value={selectedSubTaskId}
                onChange={(e) => setSelectedSubTaskId(e.target.value)}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface"
              >
                <option value="">无</option>
                {selectedTask.subtasks.map((st) => (
                  <option key={st.id} value={st.id}>{st.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant flex gap-2 justify-end">
          {(currentBoardId || currentTaskId) && (
            <Button variant="ghost" size="sm" onClick={handleClear}>取消关联</Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSave}>确定</Button>
        </div>
      </div>
    </div>
  )
}
