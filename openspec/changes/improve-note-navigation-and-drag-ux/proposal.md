## Why

当前看板中的 task 只能提示“已关联笔记”，但用户无法直接跳到对应笔记；subtask 虽然已有 `noteId` / `blockId` 数据位，但界面没有兑现跳转入口。与此同时，笔记详情页的块级拖拽仍容易退化为文本选择，拖拽反馈偏弱，左侧拖拽/关联轨道又通过负偏移贴在内容外侧，导致它看起来像被中间栏边界挤住。

这些问题叠加后，用户会同时感知到“关联了但跳不过去”“拖不起来”“左边被挡住了”。因此需要把看板到笔记的导航闭环，以及 note detail 的左轨道拖拽体验，一起收敛成一个后续 change。

## What Changes

- 为 task 与 subtask 补充到关联笔记的显式跳转入口，并支持 `Ctrl/Cmd + Click` 快速跳转；当 subtask 带有 `blockId` 时，打开笔记后继续定位到对应块。
- 重整 note detail 的块级左轨道，为拖拽手柄、关联按钮和插入手柄预留稳定 gutter，不再通过负偏移贴边摆放。
- 改善块级拖拽的激活与反馈，减少文本选择抢占，并让拖拽预览更容易被感知。
- 利用现有 subtask `blockId` 关系完成 note 内精确定位，并在块不存在时安全降级为 note 级跳转。

## Capabilities

### New Capabilities
- `board-note-navigation`: 定义 task / subtask 到关联笔记的跳转行为与快捷交互。

### Modified Capabilities
- `note-detail-layout`: 扩展块级左轨道 gutter、拖拽激活与拖拽反馈要求。

## Impact

- 受影响看板与导航组件：`src/renderer/components/Board/BoardView.tsx`、`src/renderer/store/kanban.ts`，以及可能新增的导航辅助函数。
- 受影响笔记编辑器与拖拽层：`src/renderer/components/Note/NoteView.tsx`、`src/renderer/components/dnd/SortableItem.tsx`、`src/renderer/components/pages/WorkPage.tsx`、`src/renderer/index.css`。
- 需要补充针对导航解析与拖拽反馈辅助逻辑的回归覆盖，避免后续 UI 调整再次打断跳转或拖拽体验。
