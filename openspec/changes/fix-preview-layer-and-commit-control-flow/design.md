## Context

当前结构化助手已经能在 main 侧生成 `preview.snapshot` 与 `pendingPreviewId`，但 renderer 并没有把该快照接入主界面状态：`chatbot` store 只把 preview 摘要挂到聊天消息的 `previewAction` 上，导致用户必须先点击一次“接受更改”才进入后续流程，却仍然看不到真实预览。与此同时，预览提交仍通过 `sendMessage('确认')` / `sendMessage('取消')` 伪装成普通聊天输入，一旦 `pendingPreview` 未命中，结构化路由器只能看到孤立的“确认”，于是回落为澄清问题并把内部 trace 打到用户消息里。

本次变更需要同时触达 main 侧结构化执行链路、renderer 聊天状态、kanban 展示状态以及 IPC 类型定义。设计还必须避免新的维护陷阱：如果单独再造一份 preview 专用实体结构，未来每次修改 `KanbanPersistedState` 都要同步维护 preview 数据模型，容易再次造成状态分叉。

## Goals / Non-Goals

**Goals:**
- 让 `preview.snapshot` 在生成后立即驱动主界面进入预览态。
- 在现有 kanban store 中增加一段非持久化 preview session 状态，并复用 canonical kanban snapshot 类型，避免并行维护两套实体模型。
- 将“保存更改 / 放弃预览”改为直接控制动作，而不是聊天消息。
- 将用户可见步骤与内部 trace 分离，避免内部路由阶段泄露到聊天正文。
- 对手动输入“确认 / 取消”提供确定性兜底，不再在无活动预览时回落到 LLM 追问。
- 保持正式提交仍通过 main 侧 canonical snapshot save + `store-rehydrate` 完成，确保 preview 永不提前落盘。

**Non-Goals:**
- 不在本次变更中重做整套聊天持久化模型。
- 不支持多个并行 preview session；同一时刻只允许一个活动预览。
- 不在本次变更中引入复杂的多端并发解决方案。
- 不改变 formal command 的领域语义，只调整 preview/commit 的界面与控制流。

## Decisions

### 1. 预览层复用现有 kanban store，并作为非持久化子状态存在

**Decision**
- 在现有 `useKanbanStore` 中新增一段仅会话期存在的 preview session 子状态，并确保其不进入 `pickPersistedKanbanState` / restore 路径。
- 该子状态只保存预览期临时数据，例如：
  - `pendingPreviewId`
  - `previewSnapshot: KanbanPersistedState | null`
  - `summary`
  - `status`（idle / previewing / committing）
  - 可选的 `baseSnapshotFingerprint`
- 预览层不再定义单独的 workspace / mission / board / task / note 平行结构；界面读取时优先消费同一 store 中的 `previewSnapshot`，否则回退到 store 内原有的 canonical persisted state。

**Why**
- 这满足“使用相同 store、但 preview 不落盘”的目标，同时把维护成本压到最低：preview 使用与正式 kanban 完全相同的 snapshot 类型，而不是复制一套 preview schema。
- 未来若 `KanbanPersistedState` 变更，只需要在同一 store 中继续承接该 canonical 类型，而不需要维护跨 store 的并行实体模型。

**Alternatives considered**
- **新增独立 preview store**：隔离感更强，但要维护跨 store 的状态同步、清理和选择器切换；对当前仓库来说维护复杂度高于收益。
- **定义 preview 专用实体模型**：语义更“独立”，但会形成第二套 schema；每次改 kanban 数据结构都要同步维护 preview 结构，长期成本最高。

### 2. 预览保存/放弃改为 direct control action，聊天只负责展示

**Decision**
- ChatBot 按钮不再调用 `sendMessage('确认')` / `sendMessage('取消')`。
- renderer 通过显式 action 触发 main 侧预览解析，例如统一的 `resolvePreview(action, pendingPreviewId)` IPC 或扩展现有 `planAndSolve` 返回与消费方式。
- 手动输入“确认 / 取消”仅作为兜底交互：
  1. 若存在活动 preview session，则映射到同一 direct action。
  2. 若不存在活动 preview / pending plan，则返回确定性提示，不进入 LLM 路由。

**Why**
- “保存更改”是控制动作，不是自然语言意图。将其继续表示为聊天消息，会把控制流错误地交给模型推理。
- direct action 让 preview session 成为唯一权威来源，避免“消息里看起来有上下文，但执行链路不读聊天历史”的错位。

**Alternatives considered**
- **继续发送“确认/取消”消息**：复用现有聊天入口最省改动，但会持续依赖 `pendingPreview` 与自然语言正则命中，仍可能掉回“你要确认什么”。
- **把更多聊天历史喂给结构化路由器**：能缓解失忆感，但本质上仍在让模型推断控制动作，稳定性差于显式控制通道。

### 3. 用户可见反馈与内部 trace 分层

**Decision**
- 结构化结果模型需要区分：
  - `response`：用户正文
  - `visiblePlan`（或保留 `plan` 但仅存用户可见步骤）
  - `internalTrace`：调试/路由阶段信息，不渲染到聊天 UI
- 澄清问题只显示用户需要补充的内容，不显示“LLM 识别工具调用意图”“等待用户补充必要参数”等内部阶段。

**Why**
- 当前的 `plan` 同时承担“可向用户展示的步骤说明”和“内部状态 trace”，语义混杂，renderer 无法正确决定什么该显示。
- 把 trace 隐藏后，聊天文本会恢复为人类可读的产品反馈，而不是执行流水账。

**Alternatives considered**
- **保留单一 `plan`，在 renderer 用字符串 heuristics 过滤内部项**：短期可做，但规则脆弱，而且每新增内部 trace 文本都要同步维护过滤器。

### 4. 首次实现不把指纹校验作为强制提交门槛，但保留扩展位

**Decision**
- 预览会话可预留 `baseSnapshotFingerprint` 字段，但首版不要求提交时必须通过指纹校验。
- main 侧提交仍以 `pendingPreviewId` + 重新基于最新 persisted snapshot 执行 pending tool calls 为准。

**Why**
- 当前应用主要是单机桌面体验，成功提交后会立即 canonical save + rehydrate；在这一前提下，`pendingPreviewId` 已能支撑正确的 direct commit 流程。
- 强制指纹校验虽然能防止“用户看到的预览与最终提交基线不一致”，但也会引入更多 regeneration/冲突提示，削弱本次想优先解决的顺滑体验。

**Fingerprint validation 的优点**
- 能检测 preview 生成后底层 snapshot 是否已变化，减少“保存的不是我看到的那个预览”的风险。
- 对未来多窗口、云同步或外部 mutation 更有价值。

**Fingerprint validation 的缺点**
- 需要定义稳定的 canonical hash / fingerprint 规则，并在 snapshot 结构变化时持续维护。
- 会带来更多“预览已过期，请重新生成”的用户中断。
- 如果 main 侧仍选择重新执行 pending tool calls，指纹只能作为前置守卫，收益低于实现复杂度。

**Alternatives considered**
- **强制指纹一致才能提交**：安全性更高，但会明显增加交互摩擦；适合作为未来多窗口/云同步增强，而不是本次首要目标。
- **完全不保留扩展位**：当前最简单，但会让后续并发保护升级成本更高。

### 5. 最终确认/取消反馈由 main 生成，renderer 负责展示与状态过渡

**Decision**
- preview commit / discard 的最终用户反馈文案由 main 返回，renderer 只负责：
  - 触发 direct action
  - 在提交中展示 loading / disabled 状态
  - 将 main 返回的最终结果追加为 assistant 消息
  - 清空同一 store 内的 preview 子状态

**Why**
- main 才掌握真正的提交结果：是否重新执行成功、是否完成 canonical save、是否广播 rehydrate。
- main 生成可避免 renderer 乐观拼装“已保存更改”，却与真实执行结果不一致。
- 这样主聊天窗、迷你助手、未来其他 renderer 容器都能共享同一套最终反馈语义。

**Renderer 生成反馈的优点**
- 实现更轻量，可以快速给出固定文案。
- 适合纯本地、无失败分支的乐观 UI。

**Renderer 生成反馈的缺点**
- 容易与真实提交结果脱节，例如 main 实际失败但 renderer 已经显示成功。
- 不同界面可能拼出不同文案，削弱一致性。

## Risks / Trade-offs

- **[预览 snapshot 仍与正式 snapshot 共用同一类型]** → 这减少了 schema 漂移，但要求所有读取预览的 selector 明确区分 preview 来源与正式来源；通过集中式 selector/helper 降低分散访问。
- **[同一 store 同时承载持久化字段与非持久化 preview 字段]** → 若序列化边界处理不严，可能误把 preview 落盘；通过显式持久化白名单和 hydrate/rehydrate 时清空 preview 子状态降低风险。
- **[首版不强制指纹校验]** → 在极少数基线变化场景下，用户看到的 preview 与最终提交结果可能有偏差；通过 main 侧重新执行和后续可选 fingerprint 扩展降低风险。
- **[main 生成最终反馈]** → renderer 需要多一次等待主进程响应；通过预览按钮 loading 状态与即时 UI 禁用降低延迟感。

## Migration Plan

1. 在现有 kanban store 中新增 preview 子状态与相关类型，并将其排除在持久化白名单之外。
2. main 扩展 preview resolve 接口，保持现有 pending preview 数据模型兼容。
3. renderer 改为在 preview 返回时立即写入同一 store 的 preview 子状态，并让主要 kanban 展示组件读取 effective snapshot。
4. 将 ChatBot 按钮从 `sendMessage` 切换到 direct action；保留手动输入确认/取消的 deterministic fallback。
5. 清理聊天正文中的内部 trace 输出，并补充测试。

## Open Questions

- 首版是否需要把同一 store 内 preview effective snapshot 的读取封装成统一 selector/hook，还是允许个别页面先局部接入？
- `resolvePreview` IPC 是独立新接口更清晰，还是复用 `kanban:plan-solve` 扩展 action 类型更稳妥？
- 是否需要在 preview session 中保留 `baseSnapshotFingerprint` 作为日志字段，即便首版不强制校验？
