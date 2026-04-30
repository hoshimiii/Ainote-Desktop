## Why

当前 Agent 的结构化规划主要覆盖“列出 + 创建”场景，用户在发起查询（如 workspace id/name）、重命名、删除、错题整理等真实流程时，经常落回纯文本聊天，无法稳定触发正式命令写入。与此同时，笔记场景缺少可复用的知识工作流模板，导致“题目整理/学习笔记”无法一键落地为结构化数据。

## What Changes

- 扩展 `AssistantWorkflowPlanner` 的意图覆盖：新增查询（含 ID 输出）、重命名、删除三类规划能力。
- 为 Agent 增加两条可执行知识工作流：
  - 学习笔记链路：workspace → mission → board → task/subtask → note → rewrite_note → link_task_note
  - 错题整理链路：按 7-block 模板生成笔记并落库
- 优化列表与查询反馈格式：返回实体名称 + ID，支持 workspace id/name 查询。
- 新增测试覆盖，确保新增规划最终能进入正式命令执行链路（并在确认模式下可确认执行）。

## Capabilities

### New Capabilities
- `assistant-query-and-crud-workflows`: Agent SHALL 能解析并执行查询（含 ID）、重命名、删除等结构化工作流。
- `assistant-knowledge-note-workflows`: Agent SHALL 能执行学习笔记与错题整理两类模板化笔记工作流，并通过正式命令落库。

### Modified Capabilities
- `<none>`

## Impact

- 主要影响文件：
  - `src/main/services/AssistantWorkflowPlanner.ts`
  - `tests/assistantWorkflowPlanner.test.ts`
- 复用现有正式命令边界：`formalKanbanCommands`、`PlanAndSolveAgentService`、`kanban:plan-solve` IPC。
- 不引入新第三方依赖，不改动数据库 schema。