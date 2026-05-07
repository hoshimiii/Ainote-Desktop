## Why

当前 AI 助手设置在切换到 Moonshot / Kimi 这类 provider 时，可能仍沿用默认 OpenAI base URL 发起请求，导致用户明明填写了模型和 API Key，却收到指向 `https://api.openai.com/v1/chat/completions` 的 401 错误。这类错误会让用户误以为 API Key 本身有问题，而不是配置没有真正切到对应 provider。

与此同时，云端同步的“临时恢复”黄色提示目前会直接出现在主界面工作区/工作台页面，打断核心工作流。该提示本质上属于同步上下文信息，应收口在云端同步面板内展示，而不是常驻主界面。

## What Changes

- 修复 AI 助手设置中 provider/base URL 的联动与保存行为，确保用户切换到 Moonshot / Kimi 等 provider 后，测试连接与实际对话都使用正确的 provider 根路径，而不会静默回退到 OpenAI 默认地址。
- 补强 AI 助手设置在 provider 切换、保存和重新打开时的配置一致性，减少“界面看起来切了 provider，但请求仍走旧配置”的情况。
- 调整云端同步“临时恢复”黄色提示的展示范围，仅在云端同步面板内显示，不再在主界面（工作区页、工作台页）直接显示。
- 为以上行为补充回归覆盖，确保 provider 配置与同步提示范围都能稳定验证。

## Capabilities

### New Capabilities
- `assistant-provider-settings`: 规范 AI 助手 provider 预设、base URL、连接测试与保存后的有效请求地址行为。
- `cloud-sync-feedback-scope`: 规范云端同步相关提示只在同步上下文中展示，避免主界面被同步状态提示打断。

### Modified Capabilities
<!-- None. -->

## Impact

- 受影响 AI 设置与聊天链路：`src/renderer/components/settings/AgentSettingsPanel.tsx`、`src/renderer/store/chatbot.ts`、`src/shared/assistantConfig.ts`、`src/main/services/LLMService.ts`
- 受影响云端同步 UI：`src/renderer/components/settings/CloudSyncPanel.tsx`、`src/renderer/components/pages/WorkPage.tsx`、`src/renderer/components/pages/WorkspacesPage.tsx`
- 受影响测试：AI 设置与持久化相关测试、同步面板/提示范围相关测试
