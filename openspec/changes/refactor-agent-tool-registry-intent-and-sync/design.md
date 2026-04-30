## Context

当前 `AssistantWorkflowPlanner` 以单文件规则分发为中心：`list/query/create/rename/delete/knowledge workflow` 全部通过正则顺序判断直接命中对应函数。这个结构虽然在简单句式下可用，但会带来三个问题：其一，Agent 对工作区的读取能力只存在于快照读取和精确匹配逻辑里，无法把“读取工作区”当作可组合的工具参与规划；其二，pattern 一旦匹配到固定工作流，就会吞掉同一条消息中的其他目标，缺少真正的意图路由；其三，`runPlanAndSolveAgent()` 在主进程内执行完 snapshot 变更后直接 `settingsDao.set()`，没有复用现有的“保存并广播 rehydrate”边界，导致 renderer 看不到更新。

本次改动横跨 main service、IPC、shared contract、renderer store 和测试层，属于典型的架构级调整。约束包括：保持现有 formal command 数据结构兼容、不引入新的数据库 schema、尽量复用现有 OpenAI-compatible LLM 能力，并保持 `kanban:plan-solve` IPC 边界对 renderer 基本透明。

## Goals / Non-Goals

**Goals:**
- 将 Agent 的工具与工作流拆分为独立文件，并通过统一 registry 管理，降低 `AssistantWorkflowPlanner.ts` 的耦合度。
- 为 Agent 增加可组合的工作区读取工具，使“读取工作区”成为计划阶段可选择的工具能力，而不是硬编码分支副作用。
- 引入“候选工具/工作流生成 → LLM 意图识别 → plan → execute”的混合式路由，让 pattern 只负责提供线索，不再直接绑定固定行为。
- 将 Agent 执行结果统一走“保存快照 + 广播 rehydrate”的 canonical 路径，确保主进程、renderer 缓存和页面表现一致。
- 尽量保留现有 `planAssistantWorkflow()` / `runPlanAndSolveAgent()` 对外接口与测试习惯，采用渐进式迁移。

**Non-Goals:**
- 不替换现有 `FormalKanbanCommand` 协议，也不重做 note/task/workspace 的底层数据模型。
- 不引入新的云端同步协议、数据库表结构或 renderer 页面布局改造。
- 不追求一次性把所有自然语言理解都交给 LLM；简单确认、取消和明确 CRUD 仍允许保留确定性快速路径。
- 不实现任意 SQL/数据库探索型 Agent 能力，工作区读取范围限定在 kanban 持久化状态及其显式工具返回。

## Decisions

1. **采用“显式注册器 + 独立模块导出”而非文件系统动态发现**
   - 新增 `src/main/services/tools/index.ts` 与 `src/main/services/workflows/index.ts`，由它们显式导出所有可用工具/工作流。
   - 每个工具/工作流使用单独文件，暴露标准化 descriptor（如 `id`、`description`、`matchSignals`、`plan`、`execute` 或 `buildPlan`）。
   - 备选方案是运行时扫描目录自动注册，但在 Electron main 进程和测试环境中会引入不必要的打包与可测试性复杂度；显式索引更稳定、可控，也更适合逐步迁移。

2. **保留 `AssistantWorkflowPlanner.ts` 作为编排门面，但把具体能力外移到 registry**
   - `AssistantWorkflowPlanner.ts` 在本次重构后只负责：pending plan 处理、快速路径判断、收集候选工具/工作流、调用意图分类器、组装规划结果、触发执行。
   - 原来的 `listEntities`、`planRename`、`planDelete`、`planKnowledgeWorkflow` 等逻辑会被拆分为 registry 中的工具或工作流模块。
   - 这样可以保持现有调用方与测试入口基本不变，避免一次性修改 IPC/renderer 协议。

3. **使用“混合式路由”：规则负责产生候选项，LLM 负责意图排序与补全**
   - 对确认/取消、明确的精确 CRUD 句式，保留确定性快速路径，减少网络开销与不可预测性。
   - 对多目标输入（如同时包含工作区、查询、整理、创建等意图）与复杂自然语言，先由 registry 的 `matchSignals` 和轻量规则生成候选工具/工作流，再调用新的意图分类器服务，让 LLM 输出结构化 JSON（包含候选排序、参数提取、是否需要澄清）。
   - 如果 LLM 配置不可用、请求失败或返回无效 JSON，则退回到 deterministic fallback：根据候选优先级执行，或给出澄清问题，但不得因为“命中某个 pattern”就直接丢弃其他需求。
   - 纯 regex 方案不足以处理组合式输入；纯 LLM 方案则会影响稳定性与测试可控性，因此采用混合式。

4. **将工作区读取实现为独立只读工具，并作为其他工作流的前置工具**
   - 新增 `workspace-read` 工具，负责读取当前工作区、列出全部工作区、按名称/别名过滤工作区，并返回结构化结果供 planner 和 workflow 使用。
   - 工作流不再在内部硬编码“创建/切换学习工作区”作为第一步，而是先显式请求 `workspace-read`，再基于结果决定复用、提问或创建。
   - 这既满足“Agent 能读取工作区”的需求，也为后续更多 read tool（mission-read、board-read、note-read）提供统一模式。

5. **抽取统一的 snapshot persistence helper，复用保存与广播逻辑**
   - 从当前 `KanbanFormalService` 中抽取 canonical 的 `loadSnapshot()` / `saveSnapshot()` 能力到共享模块（例如 `KanbanSnapshotStore.ts`），由 `KanbanFormalService` 与 `PlanAndSolveAgentService` 共同使用。
   - `saveSnapshot()` 必须同时完成：写入 `settingsDao` 的 `store:kanban`、向所有窗口广播 `store-rehydrate`。
   - 这样可以消除“formal execute 会刷新，planAndSolve 不会刷新”的分叉行为，确保 agent 执行与手工正式命令执行表现一致。

6. **renderer 侧继续复用现有 rehydrate 机制，不新增重型同步协议**
   - `attachSqlitePersist` 已具备监听 `store-rehydrate` 并重新拉取 `store:*` 的能力，因此 renderer 侧主改动应尽量小。
   - `chatbot` store 只需要继续展示结构化执行结果；状态刷新应由 `kanban` store 的 rehydrate 通道负责，而不是让聊天组件直接手工修改 kanban 状态。
   - 这样可以最大化复用已有基础设施，并减少主/渲染双写带来的状态漂移。

## Risks / Trade-offs

- **[Risk] LLM 意图识别增加延迟或受配置影响** → 通过快速路径与 deterministic fallback 降低对网络与模型输出稳定性的依赖。
- **[Risk] 将单文件 planner 拆成多个模块后，回归面扩大** → 使用注册器索引文件、补齐单元测试与集成测试，并保留原有入口函数以限制调用面变化。
- **[Risk] save-and-broadcast 统一后可能触发 renderer 覆盖本地未落盘修改** → 继续依赖现有 `cancelPendingWrites()` + rehydrate 机制，优先让主进程持久化状态成为单一真相源。
- **[Risk] 旧 workflow 拆分过程中行为产生偏差** → 采取“先复制出模块并接入 registry，再逐步删掉旧分支”的迁移顺序，确保每一步都有测试兜底。

## Migration Plan

1. 新增 registry 基础类型与共享 snapshot persistence helper，保持旧 planner 行为不变。
2. 提取 `workspace-read` 等首批工具与现有知识/任务工作流到 `tools/`、`workflows/` 目录，并由 registry 对外暴露。
3. 在 `AssistantWorkflowPlanner.ts` 中接入候选项收集与意图分类器，将旧 pattern 分支改成“候选生成器 + fallback”。
4. 将 `PlanAndSolveAgentService` 改为使用 canonical `saveSnapshot()`，确保执行后广播 `store-rehydrate`。
5. 补齐测试后再删除冗余旧分支，最后运行构建与测试。

回滚策略：若任一步骤出现回归，可回退到旧的 `AssistantWorkflowPlanner` 分支式实现，并保留共享 snapshot 保存逻辑；由于本次不涉及 schema 迁移，代码回滚即可恢复。

## Open Questions

- 意图分类器返回的 JSON schema 是否需要单独暴露到 shared 层，供后续更多 planner / workflow 复用？该问题不阻塞本次实现，可在编码时根据测试便利性决定。
- 首批 registry 中迁移哪些工具最合适：仅迁移当前实际用到的能力，还是同时预留更多 read/write tool descriptor？本次优先以前者为准，避免为了“好看”过度空架构化。