import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'
import type { Task } from '../src/shared/types'
import {
  executePlannedCommands,
  planAssistantWorkflow,
} from '../src/main/services/AssistantWorkflowPlanner'
import { executeFormalKanbanCommand } from '../src/shared/formalKanbanCommands'

const emptySnapshot = normalizePersistedKanbanState(null)

test('structured workflow planner prepares a confirmable task-note flow with links', async () => {
  const result = await planAssistantWorkflow(
    '在工作区“个人”里创建任务区“收集箱”、看板“待整理”、任务“整理周计划”、子任务“补充细节”、笔记“周计划笔记”并关联',
    emptySnapshot,
    DEFAULT_LLM_CONFIG,
  )

  assert.equal(result.handled, true)
  assert.ok(result.pendingPlan)
  assert.match(result.response, /回复“确认”执行/)
  assert.deepEqual(
    result.pendingPlan?.commands.map((command) => command.kind),
    ['create_workspace', 'create_mission', 'create_board', 'create_task', 'create_subtask', 'create_note', 'rewrite_note', 'link_task_note'],
  )
})

test('executing a planned task-note flow creates linked structures', async () => {
  const planned = await planAssistantWorkflow(
    '在工作区“个人”里创建任务区“收集箱”、看板“待整理”、任务“整理周计划”、子任务“补充细节”、笔记“周计划笔记”并关联',
    emptySnapshot,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )

  assert.ok(planned.commandsToExecute)
  const execution = executePlannedCommands(emptySnapshot, planned.commandsToExecute ?? [])

  assert.equal(execution.success, true)
  const snapshot = execution.snapshot!
  const workspace = snapshot.workspaces[0]
  const mission = snapshot.missions[workspace.missionIds[0]]
  const board = snapshot.boards[mission.boardIds[0]]
  const task = snapshot.tasks[board.taskIds[0]]
  const subtask = task.subtasks[0]
  const note = snapshot.notes[mission.noteIds[0]]

  assert.equal(task.title, '整理周计划')
  assert.equal(subtask.title, '补充细节')
  assert.equal(subtask.noteId, note.id)
  assert.equal(note.title, '周计划笔记')
  assert.match(note.blocks[0].content, /关联子任务：补充细节/)
})

test('confirmation input consumes a pending plan', async () => {
  const planned = await planAssistantWorkflow(
    '创建工作区“个人”',
    emptySnapshot,
    DEFAULT_LLM_CONFIG,
  )

  const confirmation = await planAssistantWorkflow('确认', emptySnapshot, DEFAULT_LLM_CONFIG, planned.pendingPlan)
  assert.equal(confirmation.handled, true)
  assert.equal(confirmation.clearPendingPlan, true)
  assert.ok(confirmation.commandsToExecute)
  assert.match(confirmation.response, /已开始执行待确认的结构化流程/)
})

test('workspace read tool returns workspace name and id', async () => {
  const workspaceFlow = await planAssistantWorkflow(
    '创建工作区“Demo”',
    emptySnapshot,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )
  const created = executePlannedCommands(emptySnapshot, workspaceFlow.commandsToExecute ?? []).snapshot!

  const queried = await planAssistantWorkflow(
    '查询工作区“Demo”的id',
    created,
    DEFAULT_LLM_CONFIG,
  )

  assert.equal(queried.handled, true)
  assert.match(queried.response, /工作区：Demo/)
  assert.match(queried.response, /id:/)
})

test('rename task plan generates rename_task command', async () => {
  let seeded = emptySnapshot
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_workspace', workspaceId: 'ws-r-1', workspaceName: '个人' }).snapshot!
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_mission', workspaceId: 'ws-r-1', missionId: 'm-r-1', title: '收集箱' }).snapshot!
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_board', missionId: 'm-r-1', boardId: 'b-r-1', title: '待整理' }).snapshot!
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_task', boardId: 'b-r-1', taskId: 't-r-1', title: '旧任务' }).snapshot!

  const renameFlow = await planAssistantWorkflow(
    '把任务“旧任务”重命名为“新任务”',
    seeded,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )

  assert.equal(renameFlow.handled, true)
  assert.ok(renameFlow.commandsToExecute)
  assert.deepEqual(renameFlow.commandsToExecute?.map((c) => c.kind), ['rename_task'])

  const renamed = executePlannedCommands(seeded, renameFlow.commandsToExecute ?? []).snapshot!
  const hasRenamedTask = Object.values(renamed.tasks).some((task) => (task as Task).title === '新任务')
  assert.equal(hasRenamedTask, true)
})

test('delete note plan generates delete_note command', async () => {
  let seeded = emptySnapshot
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_workspace', workspaceId: 'ws-1', workspaceName: '个人' }).snapshot!
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_mission', workspaceId: 'ws-1', missionId: 'm-1', title: '收集箱' }).snapshot!
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_note', missionId: 'm-1', noteId: 'n-1', title: '待删笔记' }).snapshot!

  const deleteFlow = await planAssistantWorkflow(
    '删除笔记“待删笔记”',
    seeded,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )

  assert.equal(deleteFlow.handled, true)
  assert.ok(deleteFlow.commandsToExecute)
  assert.deepEqual(deleteFlow.commandsToExecute?.map((c) => c.kind), ['delete_note'])
})

test('learning note workflow respects explicit workspace instead of hard-coded defaults', async () => {
  const flow = await planAssistantWorkflow(
    '请在工作区“个人”里帮我创建学习笔记，主题“TypeScript”',
    emptySnapshot,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )

  assert.equal(flow.handled, true)
  assert.ok(flow.commandsToExecute)
  const executed = executePlannedCommands(emptySnapshot, flow.commandsToExecute ?? []).snapshot!
  assert.equal(executed.workspaces[0].name, '个人')
  const workspace = executed.workspaces[0]
  const mission = executed.missions[workspace.missionIds[0]]
  const note = executed.notes[executed.currentNoteId!]
  assert.match(mission.title, /TypeScript 学习/)
  assert.match(note.title, /TypeScript - 学习笔记/)
})

test('wrong-answer workflow generates exactly seven blocks', async () => {
  const flow = await planAssistantWorkflow(
    '在工作区“错题本”里帮我整理错题，题目“二叉树深度”，题干“给定二叉树求最大深度”，解析“使用递归，空节点返回0”。',
    emptySnapshot,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
  )

  assert.equal(flow.handled, true)
  assert.ok(flow.commandsToExecute)
  const rewrites = flow.commandsToExecute?.filter((command) => command.kind === 'rewrite_note') ?? []
  const rewrite = rewrites[rewrites.length - 1]
  assert.ok(rewrite)
  if (rewrite?.kind === 'rewrite_note') {
    assert.equal(rewrite.blocks.length, 7)
    assert.equal(rewrite.blocks[5].type, 'code')
  }
})

test('intent classifier can override deterministic pattern priority for multi-intent input', async () => {
  let seeded = emptySnapshot
  seeded = executeFormalKanbanCommand(seeded, { kind: 'create_workspace', workspaceId: 'ws-c-1', workspaceName: '个人' }).snapshot!

  const flow = await planAssistantWorkflow(
    '查看当前上下文，并在工作区“个人”里帮我整理错题，题目“二叉树深度”，题干“给定二叉树求最大深度”，解析“使用递归”。',
    seeded,
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    undefined,
    {
      classifyIntent: async () => ({
        orderedCandidateIds: ['wrong-answer-workflow', 'list-entities'],
        source: 'llm',
        reason: '用户的核心目标是整理错题，上下文读取只是辅助信息。',
      }),
    },
  )

  assert.equal(flow.handled, true)
  assert.ok(flow.commandsToExecute)
  assert.match(flow.response, /错题工作流|错题/) 
})
