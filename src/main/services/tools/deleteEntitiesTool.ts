import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  DELETE_INTENT_PATTERN,
  createQuestionResponse,
  createWritePlan,
  extractDeleteTarget,
  normalizeText,
} from '../AssistantPlannerShared'

export const deleteEntitiesTool: AssistantCapabilityDescriptor = {
  id: 'delete-entities',
  kind: 'tool',
  label: '删除实体',
  description: '为工作区、任务区、看板、任务、子任务和笔记生成删除计划。',
  match: ({ input }) => DELETE_INTENT_PATTERN.test(input)
    ? { score: 96, signals: ['delete'] }
    : null,
  plan: ({ input, snapshot, config }) => {
    const workspaceTitle = extractDeleteTarget(input, '工作区')
    if (workspaceTitle) {
      const workspace = snapshot.workspaces.find((item) => normalizeText(item.name) === normalizeText(workspaceTitle))
      if (!workspace) return createQuestionResponse(`未找到工作区“${workspaceTitle}”。`, ['按名称查找工作区'])
      return createWritePlan(input, `已整理出删除工作区“${workspaceTitle}”的计划。`, [`删除工作区“${workspaceTitle}”及其下属结构`], [{ kind: 'delete_workspace', workspaceId: workspace.id }], config)
    }

    const missionTitle = extractDeleteTarget(input, '任务区')
    if (missionTitle) {
      const mission = Object.values(snapshot.missions).find((item) => normalizeText(item.title) === normalizeText(missionTitle))
      if (!mission) return createQuestionResponse(`未找到任务区“${missionTitle}”。`, ['按名称查找任务区'])
      return createWritePlan(input, `已整理出删除任务区“${missionTitle}”的计划。`, [`删除任务区“${missionTitle}”及其下属结构`], [{ kind: 'delete_mission', missionId: mission.id }], config)
    }

    const boardTitle = extractDeleteTarget(input, '看板')
    if (boardTitle) {
      const board = Object.values(snapshot.boards).find((item) => normalizeText(item.title) === normalizeText(boardTitle))
      if (!board) return createQuestionResponse(`未找到看板“${boardTitle}”。`, ['按名称查找看板'])
      return createWritePlan(input, `已整理出删除看板“${boardTitle}”的计划。`, [`删除看板“${boardTitle}”及其任务`], [{ kind: 'delete_board', boardId: board.id }], config)
    }

    const taskTitle = extractDeleteTarget(input, '任务')
    if (taskTitle) {
      const task = Object.values(snapshot.tasks).find((item) => normalizeText(item.title) === normalizeText(taskTitle))
      if (!task) return createQuestionResponse(`未找到任务“${taskTitle}”。`, ['按名称查找任务'])
      const board = Object.values(snapshot.boards).find((item) => item.taskIds.includes(task.id))
      if (!board) return createQuestionResponse(`无法定位任务“${taskTitle}”所在看板。`, ['读取任务上下文'])
      return createWritePlan(input, `已整理出删除任务“${taskTitle}”的计划。`, [`删除任务“${taskTitle}”`], [{ kind: 'delete_task', boardId: board.id, taskId: task.id }], config)
    }

    const subtaskTitle = extractDeleteTarget(input, '子任务')
    if (subtaskTitle) {
      const task = Object.values(snapshot.tasks).find((item) => item.subtasks.some((subtask) => normalizeText(subtask.title) === normalizeText(subtaskTitle)))
      const subtask = task?.subtasks.find((item) => normalizeText(item.title) === normalizeText(subtaskTitle))
      const board = task ? Object.values(snapshot.boards).find((item) => item.taskIds.includes(task.id)) : undefined
      if (!task || !subtask || !board) return createQuestionResponse(`未找到子任务“${subtaskTitle}”。`, ['按名称查找子任务'])
      return createWritePlan(input, `已整理出删除子任务“${subtaskTitle}”的计划。`, [`删除子任务“${subtaskTitle}”`], [{ kind: 'delete_subtask', boardId: board.id, taskId: task.id, subTaskId: subtask.id }], config)
    }

    const noteTitle = extractDeleteTarget(input, '笔记')
    if (noteTitle) {
      const note = Object.values(snapshot.notes).find((item) => normalizeText(item.title) === normalizeText(noteTitle))
      if (!note) return createQuestionResponse(`未找到笔记“${noteTitle}”。`, ['按名称查找笔记'])
      const mission = Object.values(snapshot.missions).find((item) => item.noteIds.includes(note.id))
      if (!mission) return createQuestionResponse(`无法定位笔记“${noteTitle}”所在任务区。`, ['读取笔记上下文'])
      return createWritePlan(input, `已整理出删除笔记“${noteTitle}”的计划。`, [`删除笔记“${noteTitle}”`], [{ kind: 'delete_note', missionId: mission.id, noteId: note.id }], config)
    }

    return null
  },
}
