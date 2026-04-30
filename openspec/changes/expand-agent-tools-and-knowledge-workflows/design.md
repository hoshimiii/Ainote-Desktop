## Context

当前 `AssistantWorkflowPlanner` 已具备确认执行机制和正式命令编排能力，但自然语言入口主要集中在 list/create。重命名、删除、按 ID 查询、错题模板化落库尚未形成统一规划函数，导致 Agent 在用户真实任务下频繁返回纯文本建议而非执行路径。

## Goals / Non-Goals

**Goals:**
- 在不改动数据库 schema 的前提下，扩展 planner 能力到查询（含 ID）、重命名、删除。
- 新增两条模板化知识工作流（学习笔记、错题整理），复用现有正式命令执行链路。
- 保持 `writeConfirmationMode` 语义一致：`always` 先确认，`never` 直接执行。

**Non-Goals:**
- 不引入 LLM 驱动的复杂语义解析（仍以规则解析为主）。
- 不新增 IPC 协议或 DB 表结构。
- 不改动现有 renderer UI 交互。

## Decisions

1. **在 Planner 内新增独立解析函数而非重写主流程**
   - 新增 `queryEntitiesWithIds` / `planRename` / `planDelete` / `planKnowledgeWorkflow` 等函数。
   - 通过 `planAssistantWorkflow` 中的分发顺序接入，避免对既有 create/list 回归风险。

2. **查询结果统一输出“名称 + ID”**
   - 列表、上下文与按名称查询都输出可直接复用的 ID，满足“workspace id/name 查询”等诉求。
   - 不新增 query command 类型，直接在 planner 层读取 snapshot 并响应。

3. **知识工作流采用“模板 blocks + 正式命令落库”**
   - 学习笔记：生成标准 blocks（主题、目标、要点、实践、复盘）。
   - 错题整理：严格 7 blocks（题目标题、题干、解答解析、点评、知识点总结、代码示例、练习题）。
   - 均用 `create_note + rewrite_note + link_task_note` 落库，确保与现有数据结构兼容。

4. **确认与执行机制复用现有 pending plan**
   - 不新增状态机，继续使用 `pendingPlan` + CONFIRM/CANCEL 模式。

## Risks / Trade-offs

- **[Risk] 规则解析歧义（自然语言表达多样）** → 优先支持高频句式；不匹配时返回明确引导。
- **[Risk] 分发顺序变更影响旧行为** → 通过测试覆盖旧用例与新增用例，保持 create/list 回归。
- **[Risk] 错题模板字段缺失** → 采用稳健默认值与兜底 block 文案，保证始终可生成 7 blocks。

## Migration Plan

- 该变更为无 schema 迁移的代码级升级。
- 发布步骤：合并代码 → 运行测试与构建 → 发布桌面包。
- 回滚策略：回滚该 change 的代码提交即可恢复旧 planner 行为。

## Open Questions

- 暂无阻塞性开放问题；后续可按用户反馈迭代更多领域模板（例如会议纪要、实验记录）。