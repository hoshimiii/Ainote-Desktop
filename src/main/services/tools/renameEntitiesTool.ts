import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  RENAME_INTENT_PATTERN,
  createQuestionResponse,
  createWritePlan,
  extractRenameTarget,
  normalizeText,
} from '../AssistantPlannerShared'

export const renameEntitiesTool: AssistantCapabilityDescriptor = {
  id: 'rename-entities',
  kind: 'tool',
  label: '重命名实体',
  description: '为工作区、任务区、看板、任务、子任务和笔记生成重命名计划。',
  match: ({ input }) => RENAME_INTENT_PATTERN.test(input)
    ? { score: 96, signals: ['rename'] }
    : null,
  plan: ({ input, snapshot, config }) => {
    const workspaceRename = extractRenameTarget(input, '工作区')
    if (workspaceRename) {
      const workspace = snapshot.workspaces.find((item) => normalizeText(item.name) === normalizeText(workspaceRename.from))
      if (!workspace) return createQuestionResponse(`未找到工作区“${workspaceRename.from}”。`, ['按名称查找工作区'])
      return createWritePlan(input, `已整理出重命名工作区“${workspaceRename.from}”为“${workspaceRename.to}”的计划。`, [`重命名工作区“${workspaceRename.from}”为“${workspaceRename.to}”`], [{ kind: 'rename_workspace', workspaceId: workspace.id, newName: workspaceRename.to }], config)
    }

    const missionRename = extractRenameTarget(input, '任务区')
    if (missionRename) {
      const mission = Object.values(snapshot.missions).find((item) => normalizeText(item.title) === normalizeText(missionRename.from))
      if (!mission) return createQuestionResponse(`未找到任务区“${missionRename.from}”。`, ['按名称查找任务区'])
      return createWritePlan(input, `已整理出重命名任务区“${missionRename.from}”为“${missionRename.to}”的计划。`, [`重命名任务区“${missionRename.from}”为“${missionRename.to}”`], [{ kind: 'rename_mission', missionId: mission.id, newTitle: missionRename.to }], config)
    }

    const boardRename = extractRenameTarget(input, '看板')
    if (boardRename) {
      const board = Object.values(snapshot.boards).find((item) => normalizeText(item.title) === normalizeText(boardRename.from))
      if (!board) return createQuestionResponse(`未找到看板“${boardRename.from}”。`, ['按名称查找看板'])
      return createWritePlan(input, `已整理出重命名看板“${boardRename.from}”为“${boardRename.to}”的计划。`, [`重命名看板“${boardRename.from}”为“${boardRename.to}”`], [{ kind: 'rename_board', boardId: board.id, newTitle: boardRename.to }], config)
    }

    const taskRename = extractRenameTarget(input, '任务')
    if (taskRename) {
      const task = Object.values(snapshot.tasks).find((item) => normalizeText(item.title) === normalizeText(taskRename.from))
      if (!task) return createQuestionResponse(`未找到任务“${taskRename.from}”。`, ['按名称查找任务'])
      const board = Object.values(snapshot.boards).find((item) => item.taskIds.includes(task.id))
      if (!board) return createQuestionResponse(`无法定位任务“${taskRename.from}”所在看板。`, ['读取任务上下文'])
      return createWritePlan(input, `已整理出重命名任务“${taskRename.from}”为“${taskRename.to}”的计划。`, [`重命名任务“${taskRename.from}”为“${taskRename.to}”`], [{ kind: 'rename_task', boardId: board.id, taskId: task.id, newTitle: taskRename.to }], config)
    }

    const subtaskRename = extractRenameTarget(input, '子任务')
    if (subtaskRename) {
      const task = Object.values(snapshot.tasks).find((item) => item.subtasks.some((subtask) => normalizeText(subtask.title) === normalizeText(subtaskRename.from)))
      const subtask = task?.subtasks.find((item) => normalizeText(item.title) === normalizeText(subtaskRename.from))
      const board = task ? Object.values(snapshot.boards).find((item) => item.taskIds.includes(task.id)) : undefined
      if (!task || !subtask || !board) return createQuestionResponse(`未找到子任务“${subtaskRename.from}”。`, ['按名称查找子任务'])
      return createWritePlan(input, `已整理出重命名子任务“${subtaskRename.from}”为“${subtaskRename.to}”的计划。`, [`重命名子任务“${subtaskRename.from}”为“${subtaskRename.to}”`], [{ kind: 'rename_subtask', boardId: board.id, taskId: task.id, subTaskId: subtask.id, newTitle: subtaskRename.to }], config)
    }

    const noteRename = extractRenameTarget(input, '笔记')
    if (noteRename) {
      const note = Object.values(snapshot.notes).find((item) => normalizeText(item.title) === normalizeText(noteRename.from))
      if (!note) return createQuestionResponse(`未找到笔记“${noteRename.from}”。`, ['按名称查找笔记'])
      const mission = Object.values(snapshot.missions).find((item) => item.noteIds.includes(note.id))
      if (!mission) return createQuestionResponse(`无法定位笔记“${noteRename.from}”所在任务区。`, ['读取笔记上下文'])
      return createWritePlan(input, `已整理出重命名笔记“${noteRename.from}”为“${noteRename.to}”的计划。`, [`重命名笔记“${noteRename.from}”为“${noteRename.to}”`], [{ kind: 'rename_note', missionId: mission.id, noteId: note.id, newTitle: noteRename.to }], config)
    }

    return null
  },
}
