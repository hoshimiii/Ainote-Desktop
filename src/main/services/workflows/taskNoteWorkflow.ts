import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  WRITE_INTENT_PATTERN,
  createWritePlan,
  extractBoardTitle,
  extractMissionTitle,
  extractNoteTitle,
  extractSubtaskTitle,
  extractTaskTitle,
  extractWorkspaceTitle,
  resolveBoard,
  resolveMission,
  resolveNote,
  resolveSubtask,
  resolveTask,
  resolveWorkspace,
} from '../AssistantPlannerShared'

export const taskNoteWorkflow: AssistantCapabilityDescriptor = {
  id: 'task-note-workflow',
  kind: 'workflow',
  label: '任务与笔记关联工作流',
  description: '创建或复用 workspace / mission / board / task / subtask / note，并建立任务与笔记链接。',
  match: ({ input }) => {
    const wantsNote = /笔记|note/i.test(input)
    const wantsTask = /任务(?!区)|task|子任务|subtask/i.test(input)
    const wantsLink = /关联|link|连接/i.test(input) || (wantsNote && wantsTask)
    if (!WRITE_INTENT_PATTERN.test(input) || !wantsNote || !wantsTask || !wantsLink) {
      return null
    }
    return { score: 92, signals: ['task-note-link'] }
  },
  plan: ({ input, snapshot, config }) => {
    const plan: string[] = ['读取当前 kanban 上下文']
    const commands: FormalKanbanCommand[] = []

    const workspace = resolveWorkspace(snapshot, extractWorkspaceTitle(input), plan, commands)
    if ('handled' in workspace) return workspace

    const mission = resolveMission(snapshot, workspace, extractMissionTitle(input), plan, commands)
    if ('handled' in mission) return mission

    const board = resolveBoard(snapshot, mission, extractBoardTitle(input), plan, commands)
    if ('handled' in board) return board

    const task = resolveTask(snapshot, board, extractTaskTitle(input), plan, commands)
    if ('handled' in task) return task

    const subtask = resolveSubtask(snapshot, board, task, extractSubtaskTitle(input), plan, commands)
    if (subtask && 'handled' in subtask) return subtask

    const note = resolveNote(snapshot, mission, extractNoteTitle(input), task, subtask, plan, commands)
    commands.push({ kind: 'link_task_note', taskId: task.id, noteId: note.id, subTaskId: subtask?.id })
    plan.push(subtask
      ? `关联子任务“${subtask.title}”与笔记“${note.title}”`
      : `关联任务“${task.title}”与笔记“${note.title}”`)

    return createWritePlan(
      input,
      `已为你整理出一条结构化任务建链流程：${workspace.name} / ${mission.title} / ${board.title} / ${task.title}${subtask ? ` / ${subtask.title}` : ''} / ${note.title}`,
      plan,
      commands,
      config,
    )
  },
}
