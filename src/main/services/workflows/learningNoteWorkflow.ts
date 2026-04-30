import type { FormalKanbanCommand } from '@shared/formalKanbanCommands'
import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  KNOWLEDGE_NOTE_PATTERN,
  WRITE_INTENT_PATTERN,
  buildLearningNoteBlocks,
  createWritePlan,
  extractBoardTitle,
  extractMissionTitle,
  extractNoteTitle,
  extractTaskTitle,
  extractTopic,
  extractWorkspaceTitle,
  removeRewriteCommand,
  resolveBoard,
  resolveMission,
  resolveNote,
  resolveTask,
  resolveWorkspace,
} from '../AssistantPlannerShared'

export const learningNoteWorkflow: AssistantCapabilityDescriptor = {
  id: 'learning-note-workflow',
  kind: 'workflow',
  label: '学习笔记工作流',
  description: '围绕用户主题创建或复用结构化层级，并写入学习笔记模板。',
  match: ({ input }) => {
    if (!WRITE_INTENT_PATTERN.test(input) || !KNOWLEDGE_NOTE_PATTERN.test(input)) return null
    return { score: 94, signals: ['learning-note'] }
  },
  plan: ({ input, snapshot, config }) => {
    const topic = extractTopic(input) ?? extractNoteTitle(input) ?? '通用主题'
    const plan: string[] = ['读取当前 kanban 上下文']
    const commands: FormalKanbanCommand[] = []

    const workspace = resolveWorkspace(snapshot, extractWorkspaceTitle(input), plan, commands)
    if ('handled' in workspace) return workspace

    const mission = resolveMission(snapshot, workspace, extractMissionTitle(input) ?? `${topic} 学习`, plan, commands)
    if ('handled' in mission) return mission

    const board = resolveBoard(snapshot, mission, extractBoardTitle(input) ?? '知识整理', plan, commands)
    if ('handled' in board) return board

    const task = resolveTask(snapshot, board, extractTaskTitle(input) ?? `学习：${topic}`, plan, commands)
    if ('handled' in task) return task

    const note = resolveNote(snapshot, mission, extractNoteTitle(input) ?? `${topic} - 学习笔记`, task, undefined, plan, commands)
    removeRewriteCommand(commands, note.id)
    commands.push({ kind: 'rewrite_note', noteId: note.id, blocks: buildLearningNoteBlocks(topic, note.title) })
    plan.push(`写入学习笔记模板（${note.title}）`)
    commands.push({ kind: 'link_task_note', taskId: task.id, noteId: note.id })
    plan.push(`关联任务“${task.title}”与笔记“${note.title}”`)

    return createWritePlan(
      input,
      `已整理出学习笔记工作流：${workspace.name} / ${mission.title} / ${board.title} / ${task.title} / ${note.title}`,
      plan,
      commands,
      config,
    )
  },
}
