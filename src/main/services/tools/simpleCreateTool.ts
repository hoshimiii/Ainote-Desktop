import { randomUUID } from 'crypto'
import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  WRITE_INTENT_PATTERN,
  createQuestionResponse,
  createWritePlan,
  extractBoardTitle,
  extractMissionTitle,
  extractNoteTitle,
  extractSubtaskTitle,
  extractTaskTitle,
  extractWorkspaceTitle,
  buildInitialNoteBlocks,
  resolveBoard,
  resolveMission,
  resolveTask,
  resolveWorkspace,
} from '../AssistantPlannerShared'

export const simpleCreateTool: AssistantCapabilityDescriptor = {
  id: 'simple-create',
  kind: 'tool',
  label: '简单创建',
  description: '为单一的创建类请求生成正式命令计划，例如创建工作区、任务区、看板、任务、子任务或笔记。',
  match: ({ input }) => {
    if (!WRITE_INTENT_PATTERN.test(input)) return null
    if (/(创建|新建)(工作区|任务区|看板|任务(?!区)|子任务|笔记)/i.test(input)) {
      return { score: 84, signals: ['simple-create'] }
    }
    return null
  },
  plan: ({ input, snapshot, config }) => {
    const workspaceTitle = extractWorkspaceTitle(input)
    if (/创建工作区|新建工作区/i.test(input) && workspaceTitle) {
      return createWritePlan(
        input,
        `已整理出创建工作区“${workspaceTitle}”的计划。`,
        [`创建工作区“${workspaceTitle}”`],
        [{ kind: 'create_workspace', workspaceId: randomUUID(), workspaceName: workspaceTitle }],
        config,
      )
    }

    const quotedMission = extractMissionTitle(input)
    if (/创建任务区|新建任务区/i.test(input)) {
      const plan = ['读取工作区上下文']
      const commands: FormalKanbanCommand[] = []
      const workspace = resolveWorkspace(snapshot, workspaceTitle, plan, commands)
      if ('handled' in workspace) return workspace
      if (!quotedMission) return createQuestionResponse('请在消息中指定任务区标题，例如：任务区“收集箱”。', ['等待用户提供任务区标题'])
      return createWritePlan(
        input,
        `已整理出创建任务区“${quotedMission}”的计划。`,
        [...plan, `创建任务区“${quotedMission}”`],
        [...commands, { kind: 'create_mission', workspaceId: workspace.id, missionId: randomUUID(), title: quotedMission }],
        config,
      )
    }

    const quotedBoard = extractBoardTitle(input)
    if (/创建看板|新建看板/i.test(input)) {
      const plan = ['读取工作区与任务区上下文']
      const commands: FormalKanbanCommand[] = []
      const workspace = resolveWorkspace(snapshot, workspaceTitle, plan, commands)
      if ('handled' in workspace) return workspace
      const mission = resolveMission(snapshot, workspace, quotedMission, plan, commands)
      if ('handled' in mission) return mission
      if (!quotedBoard) return createQuestionResponse('请在消息中指定看板标题，例如：看板“待处理”。', ['等待用户提供看板标题'])
      return createWritePlan(
        input,
        `已整理出创建看板“${quotedBoard}”的计划。`,
        [...plan, `创建看板“${quotedBoard}”`],
        [...commands, { kind: 'create_board', missionId: mission.id, boardId: randomUUID(), title: quotedBoard }],
        config,
      )
    }

    const quotedTask = extractTaskTitle(input)
    if (/创建任务|新建任务/i.test(input)) {
      const plan = ['读取工作区、任务区与看板上下文']
      const commands: FormalKanbanCommand[] = []
      const workspace = resolveWorkspace(snapshot, workspaceTitle, plan, commands)
      if ('handled' in workspace) return workspace
      const mission = resolveMission(snapshot, workspace, quotedMission, plan, commands)
      if ('handled' in mission) return mission
      const board = resolveBoard(snapshot, mission, quotedBoard, plan, commands)
      if ('handled' in board) return board
      if (!quotedTask) return createQuestionResponse('请在消息中指定任务标题，例如：任务“整理本周计划”。', ['等待用户提供任务标题'])
      return createWritePlan(
        input,
        `已整理出创建任务“${quotedTask}”的计划。`,
        [...plan, `创建任务“${quotedTask}”`],
        [...commands, { kind: 'create_task', boardId: board.id, taskId: randomUUID(), title: quotedTask }],
        config,
      )
    }

    const quotedSubtask = extractSubtaskTitle(input)
    if (/创建子任务|新建子任务/i.test(input)) {
      const plan = ['读取工作区、任务区、看板与任务上下文']
      const commands: FormalKanbanCommand[] = []
      const workspace = resolveWorkspace(snapshot, workspaceTitle, plan, commands)
      if ('handled' in workspace) return workspace
      const mission = resolveMission(snapshot, workspace, quotedMission, plan, commands)
      if ('handled' in mission) return mission
      const board = resolveBoard(snapshot, mission, quotedBoard, plan, commands)
      if ('handled' in board) return board
      const task = resolveTask(snapshot, board, quotedTask, plan, commands)
      if ('handled' in task) return task
      if (!quotedSubtask) return createQuestionResponse('请在消息中指定子任务标题，例如：子任务“整理待办列表”。', ['等待用户提供子任务标题'])
      return createWritePlan(
        input,
        `已整理出创建子任务“${quotedSubtask}”的计划。`,
        [...plan, `创建子任务“${quotedSubtask}”`],
        [...commands, { kind: 'create_subtask', boardId: board.id, taskId: task.id, subTaskId: randomUUID(), title: quotedSubtask }],
        config,
      )
    }

    const quotedNote = extractNoteTitle(input)
    if (/创建笔记|新建笔记/i.test(input)) {
      const plan = ['读取工作区与任务区上下文']
      const commands: FormalKanbanCommand[] = []
      const workspace = resolveWorkspace(snapshot, workspaceTitle, plan, commands)
      if ('handled' in workspace) return workspace
      const mission = resolveMission(snapshot, workspace, quotedMission, plan, commands)
      if ('handled' in mission) return mission
      if (!quotedNote) return createQuestionResponse('请在消息中指定笔记标题，例如：笔记“周会纪要”。', ['等待用户提供笔记标题'])
      const noteId = randomUUID()
      return createWritePlan(
        input,
        `已整理出创建笔记“${quotedNote}”的计划。`,
        [...plan, `创建笔记“${quotedNote}”并写入初始标题块`],
        [
          ...commands,
          { kind: 'create_note', missionId: mission.id, noteId, title: quotedNote },
          { kind: 'rewrite_note', noteId, blocks: buildInitialNoteBlocks(quotedNote, quotedNote) },
        ],
        config,
      )
    }

    return null
  },
}
