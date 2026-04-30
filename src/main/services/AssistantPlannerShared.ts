import { randomUUID } from 'crypto'
import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { Block, LLMConfig, Mission, Task, WorkSpace } from '@shared/types'
import type {
  AssistantPendingPlan,
  AssistantWorkflowPlannerResponse,
} from './AssistantPlannerModels'

export type ResolvedWorkspace = { id: string; name: string }
export type ResolvedMission = { id: string; title: string }
export type ResolvedBoard = { id: string; title: string }
export type ResolvedTask = { id: string; title: string }
export type ResolvedSubtask = { id: string; title: string }
export type ResolvedNote = { id: string; title: string; created: boolean }

export const WRITE_INTENT_PATTERN = /创建|新建|生成|添加|建立|关联|link|连接|整理/i
export const LIST_INTENT_PATTERN = /有哪些|列出|查看|显示|当前|现在|上下文/i
export const RENAME_INTENT_PATTERN = /重命名|改名|改为|改成/i
export const DELETE_INTENT_PATTERN = /删除|移除|清除/i
export const KNOWLEDGE_NOTE_PATTERN = /学习笔记|知识整理|知识点|学习主题/i
export const WRONG_ANSWER_PATTERN = /错题|错因|题目整理|错题整理/i
export const CONFIRM_PATTERN = /^(确认|确认执行|执行|执行吧|继续|继续执行|好的执行|yes|ok|okay)$/i
export const CANCEL_PATTERN = /^(取消|取消执行|算了|不用了|停止)$/i

export function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN')
}

export function formatBulletList(title: string, values: string[]): string {
  if (values.length === 0) return `${title}：暂无`
  return `${title}：\n${values.map((value) => `- ${value}`).join('\n')}`
}

export function withId(label: string, id: string): string {
  return `${label} (id: ${id})`
}

export function exactMatch<T>(items: T[], getLabel: (item: T) => string, wanted: string): T | undefined {
  const normalizedWanted = normalizeText(wanted)
  return items.find((item) => normalizeText(getLabel(item)) === normalizedWanted)
}

export function fuzzyMatches<T>(items: T[], getLabel: (item: T) => string, wanted: string): T[] {
  const normalizedWanted = normalizeText(wanted)
  return items.filter((item) => normalizeText(getLabel(item)).includes(normalizedWanted))
}

export function extractValue(input: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = input.match(pattern)
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return undefined
}

export function extractWorkspaceTitle(input: string) {
  return extractValue(input, [
    /(?:工作区|workspace)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:工作区|workspace)\s+([^\s，。,.]+)/i,
  ])
}

export function extractMissionTitle(input: string) {
  return extractValue(input, [
    /(?:任务区|mission)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:任务区|mission)\s+([^\s，。,.]+)/i,
  ])
}

export function extractBoardTitle(input: string) {
  return extractValue(input, [
    /(?:看板|board)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:看板|board)\s+([^\s，。,.]+)/i,
  ])
}

export function extractTaskTitle(input: string) {
  return extractValue(input, [
    /(?:任务(?!区)|task)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:任务(?!区)|task)\s+([^\s，。,.]+)/i,
  ])
}

export function extractSubtaskTitle(input: string) {
  return extractValue(input, [
    /(?:子任务|subtask)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:子任务|subtask)\s+([^\s，。,.]+)/i,
  ])
}

export function extractNoteTitle(input: string) {
  return extractValue(input, [
    /(?:笔记|note)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:创建|新建)\s*(?:笔记|note)\s+([^\s，。,.]+)/i,
  ])
}

export function extractTopic(input: string): string | undefined {
  return extractValue(input, [
    /(?:主题|topic)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:关于|学习)\s*[“"]([^”"]+)[”"]/i,
  ])
}

export function extractWrongAnswerStem(input: string): string | undefined {
  return extractValue(input, [
    /(?:题干|题目描述)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
    /(?:题目)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
  ])
}

export function extractWrongAnswerSolution(input: string): string | undefined {
  return extractValue(input, [
    /(?:解析|解答|答案)\s*(?:为|是|:|：)?\s*[“"]([^”"]+)[”"]/i,
  ])
}

export function extractRenameTarget(
  input: string,
  entity: '工作区' | '任务区' | '看板' | '任务' | '子任务' | '笔记',
) {
  const pattern = new RegExp(`(?:把|将)?${entity}\\s*[“"]([^”"]+)[”"]\\s*(?:重命名|改名|改为|改成)(?:为)?\\s*[“"]([^”"]+)[”"]`, 'i')
  const match = input.match(pattern)
  if (!match?.[1] || !match?.[2]) return null
  return { from: match[1].trim(), to: match[2].trim() }
}

export function extractDeleteTarget(
  input: string,
  entity: '工作区' | '任务区' | '看板' | '任务' | '子任务' | '笔记',
) {
  const pattern = new RegExp(`(?:删除|移除|清除)(?:掉)?${entity}\\s*[“"]([^”"]+)[”"]`, 'i')
  const match = input.match(pattern)
  return match?.[1]?.trim()
}

export function getWorkspace(snapshot: KanbanPersistedState, workspaceId: string | null | undefined): WorkSpace | undefined {
  return workspaceId ? snapshot.workspaces.find((item) => item.id === workspaceId) : undefined
}

export function getMission(snapshot: KanbanPersistedState, missionId: string | null | undefined): Mission | undefined {
  return missionId ? snapshot.missions[missionId] : undefined
}

export function getBoard(snapshot: KanbanPersistedState, boardId: string | null | undefined) {
  return boardId ? snapshot.boards[boardId] : undefined
}

export function summarizeCurrentContext(snapshot: KanbanPersistedState): string {
  const workspace = getWorkspace(snapshot, snapshot.activeWorkSpaceId)
  const mission = getMission(snapshot, snapshot.currentMissionId)
  const board = getBoard(snapshot, snapshot.currentBoardId)
  const note = snapshot.currentNoteId ? snapshot.notes[snapshot.currentNoteId] : undefined

  return [
    workspace ? `当前工作区：${workspace.name}` : '当前工作区：未激活',
    mission ? `当前任务区：${mission.title}` : '当前任务区：未激活',
    board ? `当前看板：${board.title}` : '当前看板：未激活',
    note ? `当前笔记：${note.title}` : '当前笔记：未激活',
  ].join('\n')
}

export function createQuestionResponse(message: string, plan: string[]): AssistantWorkflowPlannerResponse {
  return { handled: true, response: message, plan }
}

export function createWritePlan(
  input: string,
  response: string,
  plan: string[],
  commands: FormalKanbanCommand[],
  config: LLMConfig,
): AssistantWorkflowPlannerResponse {
  if (commands.length === 0) {
    return {
      handled: true,
      response,
      plan,
    }
  }

  if (config.writeConfirmationMode === 'always') {
    const pendingPlan: AssistantPendingPlan = {
      input,
      response,
      plan,
      commands,
    }

    return {
      handled: true,
      response: `${response}\n\n回复“确认”执行以上计划，回复“取消”放弃本次结构化操作。`,
      plan,
      pendingPlan,
    }
  }

  return {
    handled: true,
    response,
    plan,
    commandsToExecute: commands,
  }
}

export function resolveWorkspace(
  snapshot: KanbanPersistedState,
  workspaceTitle: string | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedWorkspace | AssistantWorkflowPlannerResponse {
  if (workspaceTitle) {
    const existing = exactMatch(snapshot.workspaces, (workspace) => workspace.name, workspaceTitle)
    if (existing) {
      plan.push(`复用工作区“${existing.name}”`)
      return { id: existing.id, name: existing.name }
    }

    const workspaceId = randomUUID()
    commands.push({ kind: 'create_workspace', workspaceId, workspaceName: workspaceTitle })
    plan.push(`创建工作区“${workspaceTitle}”`)
    return { id: workspaceId, name: workspaceTitle }
  }

  const active = getWorkspace(snapshot, snapshot.activeWorkSpaceId)
  if (active) {
    plan.push(`使用当前工作区“${active.name}”`)
    return { id: active.id, name: active.name }
  }

  if (snapshot.workspaces.length === 1) {
    plan.push(`复用唯一工作区“${snapshot.workspaces[0].name}”`)
    return { id: snapshot.workspaces[0].id, name: snapshot.workspaces[0].name }
  }

  if (snapshot.workspaces.length > 1) {
    return createQuestionResponse(
      `当前有多个工作区，请先指定要使用的工作区：\n${snapshot.workspaces.map((workspace) => `- ${workspace.name}`).join('\n')}`,
      ['读取工作区列表', '等待用户指定工作区'],
    )
  }

  return createQuestionResponse(
    '当前还没有可用工作区，请在消息中指定工作区标题，例如：创建工作区“个人工作区”。',
    ['发现缺少工作区上下文'],
  )
}

export function resolveMission(
  snapshot: KanbanPersistedState,
  workspace: ResolvedWorkspace,
  missionTitle: string | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedMission | AssistantWorkflowPlannerResponse {
  const workspaceEntity = getWorkspace(snapshot, workspace.id)
  const missions = (workspaceEntity?.missionIds ?? [])
    .map((missionId) => snapshot.missions[missionId])
    .filter(Boolean) as Mission[]

  if (missionTitle) {
    const existing = exactMatch(missions, (mission) => mission.title, missionTitle)
    if (existing) {
      plan.push(`复用任务区“${existing.title}”`)
      return { id: existing.id, title: existing.title }
    }

    const missionId = randomUUID()
    commands.push({ kind: 'create_mission', workspaceId: workspace.id, missionId, title: missionTitle })
    plan.push(`创建任务区“${missionTitle}”`)
    return { id: missionId, title: missionTitle }
  }

  const currentMission = getMission(snapshot, snapshot.currentMissionId)
  if (currentMission && workspaceEntity?.missionIds.includes(currentMission.id)) {
    plan.push(`使用当前任务区“${currentMission.title}”`)
    return { id: currentMission.id, title: currentMission.title }
  }

  if (missions.length === 1) {
    plan.push(`复用唯一任务区“${missions[0].title}”`)
    return { id: missions[0].id, title: missions[0].title }
  }

  if (missions.length > 1) {
    return createQuestionResponse(
      `工作区“${workspace.name}”下有多个任务区，请先指定：\n${missions.map((mission) => `- ${mission.title}`).join('\n')}`,
      [`读取工作区“${workspace.name}”下的任务区`, '等待用户指定任务区'],
    )
  }

  return createQuestionResponse(
    `工作区“${workspace.name}”下还没有任务区，请在消息中指定任务区标题，例如：任务区“收集箱”。`,
    [`工作区“${workspace.name}”下没有任务区`],
  )
}

export function resolveBoard(
  snapshot: KanbanPersistedState,
  mission: ResolvedMission,
  boardTitle: string | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedBoard | AssistantWorkflowPlannerResponse {
  const missionEntity = getMission(snapshot, mission.id)
  const boards = (missionEntity?.boardIds ?? []).map((boardId) => snapshot.boards[boardId]).filter(Boolean)

  if (boardTitle) {
    const existing = exactMatch(boards, (board) => board.title, boardTitle)
    if (existing) {
      plan.push(`复用看板“${existing.title}”`)
      return { id: existing.id, title: existing.title }
    }

    const boardId = randomUUID()
    commands.push({ kind: 'create_board', missionId: mission.id, boardId, title: boardTitle })
    plan.push(`创建看板“${boardTitle}”`)
    return { id: boardId, title: boardTitle }
  }

  const currentBoard = getBoard(snapshot, snapshot.currentBoardId)
  if (currentBoard && missionEntity?.boardIds.includes(currentBoard.id)) {
    plan.push(`使用当前看板“${currentBoard.title}”`)
    return { id: currentBoard.id, title: currentBoard.title }
  }

  if (boards.length === 1) {
    plan.push(`复用唯一看板“${boards[0].title}”`)
    return { id: boards[0].id, title: boards[0].title }
  }

  if (boards.length > 1) {
    return createQuestionResponse(
      `任务区“${mission.title}”下有多个看板，请先指定：\n${boards.map((board) => `- ${board.title}`).join('\n')}`,
      [`读取任务区“${mission.title}”下的看板`, '等待用户指定看板'],
    )
  }

  return createQuestionResponse(
    `任务区“${mission.title}”下还没有看板，请在消息中指定看板标题，例如：看板“待整理”。`,
    [`任务区“${mission.title}”下没有看板`],
  )
}

export function resolveTask(
  snapshot: KanbanPersistedState,
  board: ResolvedBoard,
  taskTitle: string | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedTask | AssistantWorkflowPlannerResponse {
  const boardEntity = getBoard(snapshot, board.id)
  const tasks = (boardEntity?.taskIds ?? []).map((taskId) => snapshot.tasks[taskId]).filter(Boolean) as Task[]

  if (taskTitle) {
    const existing = exactMatch(tasks, (task) => task.title, taskTitle)
    if (existing) {
      plan.push(`复用任务“${existing.title}”`)
      return { id: existing.id, title: existing.title }
    }

    const taskId = randomUUID()
    commands.push({ kind: 'create_task', boardId: board.id, taskId, title: taskTitle })
    plan.push(`创建任务“${taskTitle}”`)
    return { id: taskId, title: taskTitle }
  }

  if (tasks.length === 1) {
    plan.push(`复用唯一任务“${tasks[0].title}”`)
    return { id: tasks[0].id, title: tasks[0].title }
  }

  if (tasks.length > 1) {
    return createQuestionResponse(
      `看板“${board.title}”下有多个任务，请先指定：\n${tasks.map((task) => `- ${task.title}`).join('\n')}`,
      [`读取看板“${board.title}”下的任务`, '等待用户指定任务'],
    )
  }

  return createQuestionResponse('请在消息中指定任务标题，例如：任务“整理会议纪要”。', ['等待用户提供任务标题'])
}

export function resolveSubtask(
  snapshot: KanbanPersistedState,
  board: ResolvedBoard,
  task: ResolvedTask,
  subtaskTitle: string | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedSubtask | undefined | AssistantWorkflowPlannerResponse {
  if (!subtaskTitle) return undefined
  const taskEntity = snapshot.tasks[task.id]
  const existing = exactMatch(taskEntity?.subtasks ?? [], (subtask) => subtask.title, subtaskTitle)
  if (existing) {
    plan.push(`复用子任务“${existing.title}”`)
    return { id: existing.id, title: existing.title }
  }

  const subTaskId = randomUUID()
  commands.push({ kind: 'create_subtask', boardId: board.id, taskId: task.id, subTaskId, title: subtaskTitle })
  plan.push(`创建子任务“${subtaskTitle}”`)
  return { id: subTaskId, title: subtaskTitle }
}

export function buildInitialNoteBlocks(taskTitle: string, noteTitle: string, subtaskTitle?: string): Block[] {
  const lines = [
    `# ${noteTitle}`,
    '',
    `- 关联任务：${taskTitle}`,
    subtaskTitle ? `- 关联子任务：${subtaskTitle}` : '',
    '',
    '## 待补充',
    '',
    '在这里继续记录与该任务相关的结构化笔记。',
  ].filter(Boolean)

  return [{
    id: randomUUID(),
    type: 'markdown',
    content: lines.join('\n'),
  }]
}

export function resolveNote(
  snapshot: KanbanPersistedState,
  mission: ResolvedMission,
  noteTitle: string | undefined,
  task: ResolvedTask,
  subtask: ResolvedSubtask | undefined,
  plan: string[],
  commands: FormalKanbanCommand[],
): ResolvedNote {
  const missionEntity = getMission(snapshot, mission.id)
  const requestedTitle = noteTitle || `${subtask?.title ?? task.title} 笔记`
  const notes = (missionEntity?.noteIds ?? []).map((noteId) => snapshot.notes[noteId]).filter(Boolean)
  const existing = exactMatch(notes, (note) => note.title, requestedTitle)

  if (existing) {
    plan.push(`复用笔记“${existing.title}”`)
    return { id: existing.id, title: existing.title, created: false }
  }

  const noteId = randomUUID()
  commands.push({ kind: 'create_note', missionId: mission.id, noteId, title: requestedTitle })
  commands.push({ kind: 'rewrite_note', noteId, blocks: buildInitialNoteBlocks(task.title, requestedTitle, subtask?.title) })
  plan.push(`创建笔记“${requestedTitle}”并写入初始内容`)
  return { id: noteId, title: requestedTitle, created: true }
}

export function removeRewriteCommand(commands: FormalKanbanCommand[], noteId: string) {
  for (let i = commands.length - 1; i >= 0; i--) {
    const command = commands[i]
    if (command.kind === 'rewrite_note' && command.noteId === noteId) {
      commands.splice(i, 1)
    }
  }
}

export function buildLearningNoteBlocks(topic: string, noteTitle: string): Block[] {
  return [
    { id: randomUUID(), type: 'markdown', content: `# ${noteTitle}` },
    { id: randomUUID(), type: 'markdown', content: `## 学习目标\n\n- 理解 ${topic} 的核心概念\n- 掌握最小可用实践路径` },
    { id: randomUUID(), type: 'markdown', content: `## 核心要点\n\n- 要点 1\n- 要点 2\n- 要点 3` },
    { id: randomUUID(), type: 'markdown', content: `## 实践建议\n\n- 先完成一个最小示例\n- 记录踩坑与修复方式` },
    { id: randomUUID(), type: 'markdown', content: '## 复盘\n\n- 今天学到了什么\n- 下一步行动' },
  ]
}

export function buildWrongAnswerBlocks(topic: string, stem: string, solution: string): Block[] {
  return [
    { id: randomUUID(), type: 'markdown', content: `## 题目：${topic}` },
    { id: randomUUID(), type: 'markdown', content: `## 题干\n\n${stem}` },
    { id: randomUUID(), type: 'markdown', content: `## 解答与解析\n\n${solution}` },
    { id: randomUUID(), type: 'markdown', content: '## 点评 / 常见错误\n\n- 易错点 1\n- 易错点 2' },
    { id: randomUUID(), type: 'markdown', content: '## 知识点总结\n\n- 知识点 A\n- 知识点 B' },
    { id: randomUUID(), type: 'code', language: 'typescript', content: '// 代码示例\nfunction solve() {\n  return true\n}' },
    { id: randomUUID(), type: 'markdown', content: '## 练习题\n\n1. 变式练习 A\n2. 变式练习 B' },
  ]
}
