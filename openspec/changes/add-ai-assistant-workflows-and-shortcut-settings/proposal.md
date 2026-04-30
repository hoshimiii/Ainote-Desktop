## Why

当前 AI 助手只是在“规则命中则执行，否则退回普通 LLM 聊天”的两段式链路上工作，既没有稳定的系统角色与工作流约束，也没有把现有 formal kanban commands 组织成可复用的工具能力。因此，当用户希望助手按 AiNote 的结构化流程去选择或创建 workspace / mission / board / task / subtask / note 并建立 link 时，助手缺少必要的上下文读取、执行编排和确认机制。

与此同时，迷你助手窗口虽然已经支持 `Shift+Alt+Space` 唤起，但当前快捷键是硬编码注册的，没有开关、没有自定义入口、没有注册失败反馈；而用户在模型配置完成后看到的 404 也表明当前 AI 配置与请求链路缺少足够的健壮性与可诊断性。这些问题已经影响 AI 助手作为桌面工作流入口的基本可用性，因此需要把“结构化助手能力”和“可控的迷你窗口入口”一起补齐。

## What Changes

- 为 AI 助手增加持久化的助手配置层，支持系统提示词、workflow preset、formal tool 开关、写操作确认策略，以及更稳健的模型服务端点配置。
- 将现有 formal kanban commands 扩展为可由 AI 助手消费的工作流能力，支持围绕 workspace / mission / board / task / subtask / note / link 的查询、推荐、确认与执行闭环。
- 升级现有 `planAndSolve` 路径为面向工作流的编排层，使助手在需要落库修改时优先遵循 AiNote 的结构化流程，而不是直接退回普通聊天输出。
- 修复模型配置后触发的接口 404 类问题，确保常见 OpenAI-compatible Base URL 配置能被正确拼接与诊断。
- 为迷你助手窗口增加启用开关、可自定义快捷键、注册失败反馈与设置入口，并保证托盘菜单与全局快捷键注册状态保持一致。

## Capabilities

### New Capabilities
- `ai-assistant-workflows`: 定义 AI 助手的系统配置、结构化工作流、formal tool 调用约束，以及围绕任务与笔记建链的确认/执行行为。
- `mini-dialog-shortcut-settings`: 定义迷你助手窗口的启用开关、自定义快捷键、注册失败反馈，以及与系统托盘和全局快捷键的一致性行为。

### Modified Capabilities
None.

## Impact

- 受影响主进程与服务层：`src/main/index.ts`、`src/main/ipc/index.ts`、`src/main/services/PlanAndSolveAgentService.ts`、`src/main/services/LLMService.ts`、以及可能新增的 AI assistant orchestration/service 文件。
- 受影响渲染层与状态层：`src/renderer/store/chatbot.ts`、`src/renderer/components/settings/AgentSettingsPanel.tsx`、`src/renderer/components/ChatBot/ChatBotWindow.tsx`、`src/renderer/pages/MiniDialog.tsx`、`src/shared/types.ts`、`src/preload/index.ts`。
- 受影响 formal tool 边界：`src/shared/formalToolContracts.ts`、`src/shared/formalKanbanCommands.ts`，以及任何新增的查询型 kanban IPC/服务接口。
- 需要新增或更新与 AI 工作流、快捷键设置、LLM endpoint 拼接和主进程快捷键注册相关的测试。