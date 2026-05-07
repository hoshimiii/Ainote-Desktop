## Context

当前 AI 助手配置通过 `LLMConfig` 持久化 provider preset、base URL、model、API key 等字段，设置面板 `AgentSettingsPanel` 则同时承担草稿编辑、测试连接和保存配置的职责。现有实现中，provider preset 与 base URL 的关系并不够稳定：当 base URL 为空、配置被旧值回填，或保存/重开过程中发生 provider 与 base URL 漂移时，`normalizeLLMConfig` 会退回到 OpenAI 默认地址，而不是当前 provider 对应的默认根路径。结果就是用户以为自己在用 Moonshot / Kimi，实际请求却仍打到 `https://api.openai.com/v1/chat/completions`。

云端同步的“临时恢复”黄色提示当前保存在 kanban store 的 `transientRecoveryMessage` 中，但它被 `WorkPage` 和 `WorkspacesPage` 直接渲染为主界面提示条。这个提示本质上描述的是一次同步恢复结果，属于同步上下文反馈，不应该在主工作界面里长期占据视觉注意力。

## Goals / Non-Goals

**Goals:**
- 保证 AI 助手配置在 provider preset、base URL、保存与重开之间保持一致，避免 Moonshot / Kimi 等 provider 被静默回退到 OpenAI 默认地址。
- 让测试连接与正式聊天链路对同一份有效 provider/base URL 配置达成一致。
- 将“临时恢复”黄色提示收口到 `CloudSyncPanel`，不再在工作区页和工作台页直接展示。
- 为配置归一化与同步提示范围补充可回归的验证。

**Non-Goals:**
- 不新增新的模型 provider 协议，也不改动现有 OpenAI-compatible 请求格式。
- 不重构整套 AI 设置 UI，只修正 provider/base URL 一致性与提示展示范围。
- 不改变临时恢复消息的生成逻辑，只调整它的展示位置与消费方式。

## Decisions

### 1. 让 provider preset 成为 base URL 默认值的真实来源，而不是一律退回 OpenAI

`normalizeLLMConfig` 需要基于当前 `providerPreset` 决定默认 base URL，而不是在 base URL 为空时一律回退到 `DEFAULT_LLM_CONFIG.baseurl`。此外，对于明显的陈旧回退值（例如 provider 已是 `moonshot`，但 base URL 仍是 OpenAI 默认地址），归一化阶段应优先修正为当前 provider 的默认根路径。

这样做的原因是：当前 bug 的根源不是请求层不会发 token，而是配置层允许 provider 和 base URL 漂移。相比在请求发出时做特殊兜底，在配置归一化阶段修正更容易保持测试连接、保存重开、实际聊天三条链路的一致性。

备选方案：仅在 `LLMService` 里根据 model 名称猜 provider 并改写 URL。未采用，因为这会把配置错误隐藏到请求层，且 model 命名不稳定，不如显式 provider preset 可靠。

### 2. provider 切换时继续保留“显式改写草稿 base URL”的交互，但只修正明显错误的持久化值

设置面板在切换 provider preset 时，继续像现在一样用对应 provider 的默认根路径更新草稿 `baseurl`。同时，保存或重开时的归一化只修正“空值”或“明显沿用了 OpenAI 默认值的陈旧配置”，不强行覆盖用户手动输入的自定义兼容地址。

这样做的原因是：我们既要修掉“Moonshot 却走 OpenAI”的错误，又不能破坏用户有意输入的自定义 gateway / proxy / OpenAI-compatible 地址。

备选方案：每次切换 provider 都无条件覆盖 base URL。未采用，因为这会吞掉用户的自定义服务地址。

### 3. 保持黄色同步提示的状态来源不变，只收口渲染位置

`transientRecoveryMessage` 继续保留在 kanban store 中，由同步恢复链路写入；但主界面页面组件不再直接渲染该提示，而改由 `CloudSyncPanel` 在打开时展示，并提供关闭/确认入口来消费该消息。

这样做的原因是：消息的生命周期和业务来源本来就是同步流程，真正需要被打断和提醒的也是正在查看同步状态的用户，而不是所有进入主界面的用户。

备选方案：把提示彻底改成 toast。未采用，因为当前已有同步面板和 dismiss 行为，收口到面板是更小且更稳妥的改动。

## Risks / Trade-offs

- [provider 归一化过于激进，误覆盖用户自定义 base URL] → 仅在空值或明显的 OpenAI 陈旧默认值场景下自动修正，保留其他显式输入。
- [同步黄色提示只在面板中显示后，用户可能错过一次恢复信息] → 在同步面板打开时明确展示并保留 dismiss 操作，同时不让主界面持续被干扰。
- [当前 `AgentSettingsPanel` 最近有用户侧调整，修复时可能覆盖现有布局细节] → 仅对 provider/base URL 与结果文案相关逻辑做最小修改，先读取最新文件再改动。

## Migration Plan

- 无需数据库 schema 迁移；继续复用现有 `store:chatbot` 和 kanban store 持久化结构。
- 更新 provider 归一化后，旧配置在下次打开设置或恢复 store 时即可按新规则修正。
- 将主页面上的 `transientRecoveryMessage` 渲染移除，并在 `CloudSyncPanel` 中接入同一份 store 状态与 dismiss 行为。
- 通过现有测试命令补充回归验证，并重新运行 `pnpm test` / `pnpm build`。

## Open Questions

- 是否还需要在 AI 设置 UI 中增加更显眼的“当前请求将发往哪个 provider 根路径”的只读提示？本次先不扩范围，实现最小修复。
- 是否要在未来把同步恢复提示做成 sync 面板内的历史记录而不是一次性 inline 信息？本次不展开。
