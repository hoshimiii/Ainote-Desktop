import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  LIST_INTENT_PATTERN,
  formatBulletList,
  getBoard,
  getMission,
  summarizeCurrentContext,
  withId,
} from '../AssistantPlannerShared'

export const listEntitiesTool: AssistantCapabilityDescriptor = {
  id: 'list-entities',
  kind: 'tool',
  label: '列出结构化实体',
  description: '列出当前上下文中的任务区、看板、任务、子任务和笔记。',
  match: ({ input }) => {
    if (!LIST_INTENT_PATTERN.test(input)) return null
    if (/工作区|workspace/i.test(input)) return null
    if (/上下文|当前在哪|现在在哪/i.test(input)) {
      return { score: 98, signals: ['current-context'] }
    }
    if (/(任务区|mission|看板|board|子任务|subtask|任务(?!区)|task|笔记|note)/i.test(input)) {
      return { score: 88, signals: ['entity-list'] }
    }
    return null
  },
  plan: ({ input, snapshot }) => {
    if (/上下文|当前在哪|现在在哪/i.test(input)) {
      return {
        handled: true,
        response: summarizeCurrentContext(snapshot),
        plan: ['读取当前上下文', '返回已激活的工作区 / 任务区 / 看板 / 笔记'],
      }
    }

    if (/任务区|mission/i.test(input)) {
      const workspace = snapshot.activeWorkSpaceId
        ? snapshot.workspaces.find((item) => item.id === snapshot.activeWorkSpaceId)
        : snapshot.workspaces[0]
      const missions = workspace
        ? workspace.missionIds
          .map((missionId) => snapshot.missions[missionId])
          .filter(Boolean)
          .map((mission) => withId(mission.title, mission.id))
        : []
      return {
        handled: true,
        response: formatBulletList(workspace ? `工作区“${workspace.name}”下的任务区` : '任务区', missions),
        plan: ['读取任务区列表'],
      }
    }

    if (/看板|board/i.test(input)) {
      const mission = getMission(snapshot, snapshot.currentMissionId)
      const boards = mission
        ? mission.boardIds
          .map((boardId) => snapshot.boards[boardId])
          .filter(Boolean)
          .map((board) => withId(board.title, board.id))
        : []
      return {
        handled: true,
        response: formatBulletList(mission ? `任务区“${mission.title}”下的看板` : '看板', boards),
        plan: ['读取看板列表'],
      }
    }

    if (/子任务|subtask/i.test(input)) {
      const board = getBoard(snapshot, snapshot.currentBoardId)
      const subtasks = board
        ? board.taskIds.flatMap((taskId) => snapshot.tasks[taskId]?.subtasks.map((subtask) => `${snapshot.tasks[taskId]?.title} / ${withId(subtask.title, subtask.id)}`) ?? [])
        : []
      return {
        handled: true,
        response: formatBulletList(board ? `看板“${board.title}”下的子任务` : '子任务', subtasks),
        plan: ['读取子任务列表'],
      }
    }

    if (/任务(?!区)|task/i.test(input)) {
      const board = getBoard(snapshot, snapshot.currentBoardId)
      const tasks = board
        ? board.taskIds
          .map((taskId) => snapshot.tasks[taskId])
          .filter(Boolean)
          .map((task) => withId(task.title, task.id))
        : []
      return {
        handled: true,
        response: formatBulletList(board ? `看板“${board.title}”下的任务` : '任务', tasks),
        plan: ['读取任务列表'],
      }
    }

    if (/笔记|note/i.test(input)) {
      const mission = getMission(snapshot, snapshot.currentMissionId)
      const notes = mission
        ? mission.noteIds
          .map((noteId) => snapshot.notes[noteId])
          .filter(Boolean)
          .map((note) => withId(note.title, note.id))
        : []
      return {
        handled: true,
        response: formatBulletList(mission ? `任务区“${mission.title}”下的笔记` : '笔记', notes),
        plan: ['读取笔记列表'],
      }
    }

    return null
  },
}
