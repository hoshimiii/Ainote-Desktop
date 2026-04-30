import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  WRONG_ANSWER_PATTERN,
  WRITE_INTENT_PATTERN,
  buildWrongAnswerBlocks,
  createWritePlan,
  extractBoardTitle,
  extractMissionTitle,
  extractNoteTitle,
  extractTaskTitle,
  extractTopic,
  extractWorkspaceTitle,
  extractWrongAnswerSolution,
  extractWrongAnswerStem,
  removeRewriteCommand,
  resolveBoard,
  resolveMission,
  resolveNote,
  resolveTask,
  resolveWorkspace,
} from '../AssistantPlannerShared'

export const wrongAnswerWorkflow: AssistantCapabilityDescriptor = {
  id: 'wrong-answer-workflow',
  kind: 'workflow',
  label: '错题整理工作流',
  description: '围绕题目、题干与解析生成 7-block 错题整理笔记，并链接到任务。',
  match: ({ input }) => {
    if (!WRITE_INTENT_PATTERN.test(input) || !WRONG_ANSWER_PATTERN.test(input)) return null
    return { score: 95, signals: ['wrong-answer'] }
  },
  plan: ({ input, snapshot, config }) => {
    const topic = extractNoteTitle(input) ?? extractTopic(input) ?? '未命名错题'
    const stem = extractWrongAnswerStem(input) ?? '请补充题干。'
    const solution = extractWrongAnswerSolution(input) ?? '请补充解答与解析。'
    const plan: string[] = ['读取当前 kanban 上下文']
    const commands: FormalKanbanCommand[] = []

    const workspace = resolveWorkspace(snapshot, extractWorkspaceTitle(input), plan, commands)
    if ('handled' in workspace) return workspace

    const mission = resolveMission(snapshot, workspace, extractMissionTitle(input) ?? '题目整理', plan, commands)
    if ('handled' in mission) return mission

    const board = resolveBoard(snapshot, mission, extractBoardTitle(input) ?? '错题看板', plan, commands)
    if ('handled' in board) return board

    const task = resolveTask(snapshot, board, extractTaskTitle(input) ?? `${topic} 错题整理`, plan, commands)
    if ('handled' in task) return task

    const note = resolveNote(snapshot, mission, extractNoteTitle(input) ?? `${topic} - 错题解析`, task, undefined, plan, commands)
    removeRewriteCommand(commands, note.id)
    commands.push({ kind: 'rewrite_note', noteId: note.id, blocks: buildWrongAnswerBlocks(topic, stem, solution) })
    commands.push({ kind: 'link_task_note', taskId: task.id, noteId: note.id })
    plan.push(`按 7-block 模板整理错题笔记“${note.title}”`)
    plan.push(`关联任务“${task.title}”与笔记“${note.title}”`)

    return createWritePlan(
      input,
      `已整理出错题工作流：${workspace.name} / ${mission.title} / ${board.title} / ${task.title} / ${note.title}`,
      plan,
      commands,
      config,
    )
  },
}
