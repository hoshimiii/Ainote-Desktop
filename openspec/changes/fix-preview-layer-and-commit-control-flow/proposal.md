## Why

当前结构化助手的写操作预览链路把内部路由/trace 信息直接拼进聊天正文，且生成预览后不会立即驱动主界面切换到预览态，导致用户必须先点击一次“接受更改”才能看到实际预览。更严重的是，预览提交仍通过发送“确认/取消”聊天消息来表达控制动作，一旦 `pendingPreview` 状态未命中，系统就会把这类输入当成普通自然语言重新路由，进而追问“要确认什么”，造成明显的失忆感和错误的交互心智。

## What Changes

- 在现有 kanban store 中增加一段非持久化预览层状态，用于承接 `preview.snapshot` 并在预览生成后立刻刷新界面。
- 将预览的“保存更改/放弃预览”改为直接控制动作，而不是再向聊天流中注入“确认/取消”用户消息。
- 区分用户可见的执行说明与内部结构化路由 trace，避免将类似“LLM 识别工具调用意图”“等待用户补充必要参数”这类内部阶段直接渲染到聊天正文。
- 为手动输入“确认/取消”的场景增加确定性兜底：当不存在活动预览或待执行计划时，返回明确提示，而不是回落到 LLM 追问。
- 保持正式提交仍通过 canonical kanban snapshot 路径完成持久化与 `store-rehydrate` 广播，确保预览层只负责临时显示，不提前污染持久化状态。

## Capabilities

### New Capabilities
- `assistant-preview-session`: 管理现有 kanban store 内的非持久化预览层、即时界面预览，以及预览的直接保存/放弃控制流。

### Modified Capabilities
- `assistant-tool-execution`: 调整结构化工具执行的用户可见反馈边界，隐藏内部 trace，并将预览确认从聊天语义切换为显式控制动作。
- `assistant-execution-state-sync`: 明确预览态与正式持久化态的边界，要求预览只影响临时 UI，正式提交后仍通过 canonical snapshot rehydrate 同步到 renderer。

## Impact

- 受影响主流程：`src/main/services/AssistantToolRuntime.ts`、`src/main/services/PlanAndSolveAgentService.ts`、`src/main/services/AssistantWorkflowPlanner.ts`
- 受影响 renderer：`src/renderer/store/chatbot.ts`、扩展后的 `src/renderer/store/kanban.ts`、`src/renderer/components/ChatBot/ChatBotWindow.tsx` 及依赖 kanban 展示状态的页面组件
- 受影响 IPC / 类型：`src/preload/index.ts`、`src/main/ipc/index.ts`、`src/shared/types.ts`、相关 planner/preview response 类型
- 受影响验证：结构化助手预览、提交、取消、兜底提示与 renderer 界面同步相关测试需要补充或调整
