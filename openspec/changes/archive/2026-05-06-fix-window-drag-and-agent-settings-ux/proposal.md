## Why

当前主窗口顶部虽然看起来像标准桌面标题栏，但大部分可见区域都被标记成 `no-drag`，导致用户很难通过页面上边缘顺畅拖动窗口。与此同时，AI 助手设置弹窗在实际使用中暴露出两个可用性问题：底部的“测试连接 / 保存”动作不够稳定或不易触达，配置后缺少可靠的保存闭环；此外，弹窗也还不支持符合桌面习惯的“点外部关闭”，并且关闭时机需要落在鼠标释放阶段，避免用户按下时误关闭。

这些问题都集中出现在桌面壳层与设置交互层，已经影响窗口操控与 AI 配置这两个高频入口，因此需要作为一次独立 change 统一修正。

## What Changes

- 改进 frameless 主窗口顶部的拖拽命中区，让用户可以更轻松地从页面上边缘拖动窗口，同时不干扰返回、同步、登出和窗口控制按钮等交互元素。
- 补强 AI 助手设置弹窗的动作区，确保“测试连接”和“保存”在常见窗口高度下始终可见、可触达，并形成可验证的保存流程。
- 修复 AI 助手设置的保存闭环，确保用户修改后的 provider / model / token / workflow / shortcut 配置能够真正持久化，而不是仅在界面上暂存。
- 为 AI 助手设置弹窗增加点击外部关闭能力，并将关闭判定放在鼠标释放阶段：只有在按下后于卡片外区域松开时才关闭，避免按下瞬间误触导致弹窗直接消失。

## Capabilities

### New Capabilities
- `window-titlebar-dragging`: 规定桌面主窗口标题栏需要提供稳定、易命中的拖拽区域，同时保留按钮区域的正常点击行为。
- `assistant-settings-modal`: 规定 AI 助手设置弹窗必须提供可见且可用的测试/保存动作、可靠的配置持久化，以及桌面友好的外部点击关闭语义。

### Modified Capabilities
<!-- None. -->

## Impact

- 受影响窗口壳层与页面 chrome：`src/renderer/components/layout/WindowTitlebar.tsx`、`src/renderer/index.css`、`src/renderer/components/pages/WorkPage.tsx`，以及其他复用标题栏的页面。
- 受影响 AI 设置与聊天入口：`src/renderer/components/settings/AgentSettingsPanel.tsx`、`src/renderer/components/ChatBot/ChatBotWindow.tsx`、`src/renderer/pages/MiniDialog.tsx`。
- 可能涉及的持久化与验证路径：`src/renderer/store/chatbot.ts`、相关 preload / main process AI 配置调用，以及弹窗交互测试覆盖。
