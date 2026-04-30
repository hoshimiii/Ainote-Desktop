## Why

当前 Agent 的结构化能力依然建立在单文件规则匹配之上：它只能从快照里做有限查询，遇到包含“工作区”等关键词的复杂请求时容易被固定 pattern 抢占，忽略同一句话里的其他任务要求；与此同时，`planAndSolve` 的执行结果虽然可能已经落到主进程存储，却没有走统一的同步链路，导致助手声称“已改动”但前端页面没有任何变化。现在需要把 Agent 从“规则分支 + 快照内变更”升级为“可注册工具/工作流 + 意图识别 + 计划/执行 + 持久化同步”的完整闭环。

## What Changes

- 将当前单体 `AssistantWorkflowPlanner` 重构为“工具注册器 + 工作流注册器”模式：每个工具与工作流都拥有独立文件，并通过统一注册器暴露给 Agent。
- 为 Agent 增加工作区读取能力，支持把工作区读取作为显式工具参与规划，而不是仅靠快照中的硬编码分支。
- 将当前 pattern 直接触发固定行为的方式改为“pattern/规则提供候选线索 + LLM 意图识别 + 计划/执行”流程，使同一条用户输入能够同时保留工作区上下文与真实任务意图。
- 统一 Agent 执行后的持久化与同步链路，确保执行结果不仅更新主进程快照，也会回写前端缓存并触发页面刷新。
- 补充针对工具注册、意图路由、工作区读取和执行后同步的测试，保持既有 formal command 行为兼容。

## Capabilities

### New Capabilities
- `assistant-tool-registry`: Agent SHALL 通过统一注册器发现和调用独立定义的工具与工作流，并提供可复用的工作区读取工具能力。
- `assistant-intent-plan-execute`: Agent SHALL 基于意图识别结果在候选工具和工作流之间进行规划，再执行生成的结构化计划，而不是由单个 pattern 直接绑定固定行为。
- `assistant-execution-state-sync`: Agent SHALL 在执行结构化改动后将结果持久化到主存储，并触发 renderer 侧缓存重载与页面同步。

### Modified Capabilities
- `<none>`

## Impact

- 主要影响文件：
  - `src/main/services/AssistantWorkflowPlanner.ts`
  - `src/main/services/PlanAndSolveAgentService.ts`
  - `src/main/services/KanbanFormalService.ts`
  - `src/main/services/LLMService.ts`
  - `src/main/ipc/index.ts`
  - `src/preload/index.ts`
  - `src/renderer/store/chatbot.ts`
  - `src/renderer/store/kanban.ts`
  - `tests/assistantWorkflowPlanner.test.ts`
- 预计新增目录：
  - `src/main/services/tools/`
  - `src/main/services/workflows/`
- 继续复用现有正式命令边界：`formalKanbanCommands`、`kanban:plan-solve` IPC、`store-rehydrate` 机制。
- 不计划引入新的数据库表结构；若需要 LLM 意图识别，将优先复用现有 OpenAI-compatible 调用能力。