## Context

当前 AI 助手的实现是一个轻量的两段式链路：renderer 侧 `useChatbotStore.sendMessage` 先尝试 `kanban.planAndSolve`，如果规则式处理器未命中，再直接把对话消息发送给 OpenAI-compatible `/chat/completions` 接口。这个结构已经能支撑简单命令和普通聊天，但缺少三个关键层：其一是持久化的 assistant profile（系统提示词、workflow preset、工具策略、provider 配置）；其二是围绕 workspace / mission / board / task / subtask / note 的查询与编排能力；其三是对写操作的确认、执行与回执规范。

同时，迷你助手窗口是单独的 `BrowserWindow`，其全局快捷键在主进程中以 `Shift+Alt+Space` 硬编码注册。当前没有启用开关、没有可自定义快捷键、没有注册失败反馈，托盘菜单文案也不会跟随实际配置变化。用户反馈的 404 已明确是模型请求链路上的 B 类问题，因此本次设计还需要处理 AI provider endpoint 的规范化和诊断能力。

## Goals / Non-Goals

**Goals:**

- 为 AI 助手建立持久化的 assistant profile，支持系统提示词、workflow preset、formal tool 开关、写操作确认策略与更稳健的 provider/base URL 配置。
- 在现有 formal kanban command 边界之上补充查询与编排能力，使 AI 助手能按 AiNote 的结构化流程引导和执行“选择/创建 workspace → mission → board → task → subtask → note → link”。
- 修复常见 OpenAI-compatible base URL 配置下的 `/chat/completions` 404 类问题，并在 UI 中提供更明确的配置与错误反馈。
- 为迷你助手窗口提供启用开关、自定义快捷键、注册失败反馈，以及和托盘菜单一致的注册状态。

**Non-Goals:**

- 不引入完整的通用 MCP/tool-calling 协议，也不在本次实现中支持任意第三方工具生态。
- 不改动数据库 schema 或云同步协议；assistant profile 和快捷键设置优先复用现有 SQLite-backed settings/store 持久化能力。
- 不重做迷你窗口的视觉设计；本次只提升其入口控制与 AI 配置可用性。
- 不把所有自然语言理解都替换为复杂 agent framework；仍允许保留简单命令直达路径作为快速通道。

## Decisions

### 1. 引入 Assistant Profile 作为聊天与迷你窗口共享的配置源

聊天主窗与迷你窗口继续共享同一个 `chatbot` store，但 `LLMConfig` 将升级为更完整的 assistant profile，除模型连接参数外还包含系统提示词、workflow preset、formal tool 开关、写操作确认策略与可能的 provider 预设。设置面板继续从 renderer 侧编辑这份状态，并通过现有 SQLite persistence 保证重启后可恢复。

选择原因：当前两个入口已经共用同一 store，沿着这条线扩展可以最小化状态分叉，并让主窗/迷你窗在能力上保持一致。

备选方案：把迷你窗口配置与主聊天配置拆成两套。未采用，因为会带来双份设置、用户心智负担和额外同步问题。

### 2. 在 formal command 之上增加“读取上下文 + 编排执行”的 assistant orchestration 层

现有 `planAndSolve` 只适合处理少量规则命令，本次将把它升级为面向 workflow 的 orchestration service：先读取当前 kanban snapshot 与可用 contract，必要时列出候选 workspace/mission/board/task/note，再由助手按策略生成下一步建议或待确认动作。对最终落库的操作仍复用 formal kanban command 执行，以保持验证路径和状态更新一致。

选择原因：formal command 已经能稳定承担写操作，但缺少查询与编排层。新增 orchestration 层可以让“读上下文”和“写命令”各司其职，避免把复杂流程硬塞进 prompt 或正则分支里。

备选方案：只补 system prompt，不补 orchestration。未采用，因为模型没有稳定读取当前工作区结构的能力时，prompt 再详细也只能“会说不会做”。

### 3. 继续保留轻量直达路径，但将其纳入统一响应协议

对于非常明确的简单命令（例如已有上下文下的新建单个实体），仍允许短路径直接命中执行；但其响应格式、确认行为和错误处理将对齐新的 assistant orchestration，避免出现一部分消息走规则引擎、一部分消息走 agent 输出而用户体验完全割裂。

选择原因：现有规则路径响应快、实现成本低，完全移除没有必要；统一协议即可降低分叉复杂度。

备选方案：删除原有 `planAndSolve`，全部改走单一路径。未采用，因为会增加回归风险，也不利于小命令快速响应。

### 4. 对 OpenAI-compatible endpoint 做归一化，而不是要求用户永远手填标准 base URL

`LLMService` 目前无条件把 `baseURL` 拼接为 `${baseURL}/chat/completions`。本次会增加 endpoint normalization：接受以 `/v1` 结尾的 base URL，必要时清理末尾重复的 `/chat/completions`，并在测试连接/实际调用失败时返回更明确的错误信息。UI 层会给出更清楚的 placeholder、说明或 provider preset，减少配置踩坑。

选择原因：用户已经遇到 B 类 404，说明现状对“OpenAI-compatible”输入过于脆弱。把容错做在服务层比要求用户记住精确 URL 更稳妥。

备选方案：只在设置面板加提示文本。未采用，因为真正的错误仍会在运行时发生，且迷你窗口不会自动获得额外保护。

### 5. 把迷你窗口快捷键管理抽成可重注册的主进程能力

主进程不再在 `whenReady` 时仅硬编码注册一次快捷键，而是读取持久化设置决定是否注册、注册什么组合键，并在设置变化时执行 unregister/register。注册结果（成功、失败、被占用、已禁用）通过 IPC 回传给 renderer，用于设置面板提示，同时托盘菜单的 accelerator 文案也要与当前配置同步。

选择原因：快捷键是主进程资源，放在主进程集中管理才能处理占用、重注册和生命周期问题。

备选方案：仅在 renderer 保存文本配置，不即时重注册。未采用，因为用户会修改了却不生效，体验很差。

## Risks / Trade-offs

- [Assistant profile 字段增加后配置复杂度上升] → 通过 workflow preset、provider preset 和合理默认值降低首次配置成本。
- [新增 orchestration 层后实现面变大] → 尽量复用现有 formal command、snapshot 和 IPC 边界，把新逻辑集中在 service 层而不是散落到组件中。
- [Endpoint normalization 过度容错可能掩盖真实错误] → 仅处理明确可判定的重复路径与结尾规范化，其他错误保持显式抛出。
- [快捷键可配置后会遇到系统占用冲突] → 在设置 UI 中暴露注册失败状态，并保留禁用开关和恢复默认能力。
- [主窗与迷你窗共享同一聊天状态可能导致上下文混用] → 本次保持共享以降低复杂度，未来若需要再拆 conversation scope，而不在本 change 中扩展范围。

## Migration Plan

- 不涉及数据库 schema 迁移；assistant profile 依旧通过 renderer store 的 SQLite 持久化保存。
- 主进程启动时若发现旧配置缺失新字段，使用默认值补齐并按默认快捷键策略注册。
- 快捷键配置上线后，已有用户默认保持启用并继续使用 `Shift+Alt+Space`，除非手动关闭或修改。
- 如果新的 endpoint normalization 导致意外兼容问题，可回退到旧的 URL 拼接逻辑，同时保留新增的 UI 配置字段。

## Open Questions

- 写操作确认策略是只提供“总是确认 / 智能确认”两档，还是需要更细的粒度（例如删除强制确认、创建可自动执行）？
- workflow preset 是否先内置单一 “AiNote structured workflow” 即可，还是需要同时提供“纯聊天模式”快速切换？
- 读取型 kanban 能力是通过新增专门 IPC 方法暴露，还是先由 orchestration 直接读取当前 snapshot 后内部筛选？短期更倾向后者。