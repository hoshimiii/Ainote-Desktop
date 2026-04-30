## Context

当前 renderer 已经具备部分关联数据与导航能力：`Task.linkedNoteId`、`SubTask.noteId` / `blockId`、以及 store 中的 `setActiveNote` 都已存在。但 `BoardView` 只渲染了“已关联笔记”的静态提示，没有把它变成可点击的导航入口；subtask 侧也未展示 note 关联。另一方面，`NoteView` 已经把拖拽手柄与链接按钮抽到左侧轨道，但轨道仍通过 `absolute -left-*` 从内容块外侧伸出，而 `WorkPage` 的右侧 detail 容器使用 `overflow-hidden`，导致轨道与内容系统没有统一坐标。

顶层拖拽传感器仍采用较长的按压延时，块内容本身又是可选中文本，因此用户在拖拽句柄附近操作时，很容易先进入文本选择，再错过块级拖拽反馈。当前 `DragOverlay` 虽然存在，但对 `block` 仅展示泛化标签，视觉信号不足。

## Goals / Non-Goals

**Goals:**

- 让 task 与 subtask 可以通过显式链接和 `Ctrl/Cmd + Click` 快速打开关联 note。
- 让 note block 的左侧轨道拥有稳定 gutter，使块体与轨道整体右移并共享一致坐标。
- 让块级拖拽更容易触发，并提供明确的拖拽预览与正在拖拽状态。
- 保持现有 store 数据结构兼容，不修改数据库 schema 或云同步协议。

**Non-Goals:**

- 不重写整体 DnD 架构，也不引入新的路由系统。
- 不改变 markdown / code block 的持久化模型。

## Decisions

### 1. Task / Subtask 跳转采用“显式链接 + modifier 快捷跳转”双入口

`BoardView` 中对已有 note 关联的 task / subtask 渲染可点击的笔记入口；普通点击链接文本时直接打开关联 note，`Ctrl/Cmd + Click` task/subtask 标题时也可触发相同跳转。这样既保留显式 affordance，又提供熟悉的快捷入口。

选择原因：现有卡片布局已经有“已关联笔记”提示位，扩展成链接的改动最小；modifier 快捷跳转则提升熟练用户效率。

### 2. Note block 左侧轨道改为“预留 gutter”而不是负偏移浮出

块级行容器改为显式的“左轨道列 + 内容列”结构，拖拽手柄、关联按钮与插入手柄都在 gutter 里布局，block 内容本体整体右移，不再依赖 `absolute -left-*` 从内容框外伸出。

选择原因：这能一次性解决“第二栏边界压住轨道”的视觉问题，并让 hover、selected、insert、drag rail 共享同一套坐标系。

### 3. 块级拖拽改为更偏即时的激活，并加强 overlay 与被拖拽态反馈

顶层 DnD 从长按延时约束切换为更适合 handle 拖拽的位移触发策略，减少文本选择先于拖拽发生的概率；同时增强 `block` 的拖拽 overlay 文案与样式，并让正在拖拽的 block 本体呈现更明确的反馈。

选择原因：当前问题的根源不是缺少 DnD，而是激活链路和视觉反馈都太弱。位移触发更适合有独立 handle 的场景，也能避免用户长按等待。

### 4. Subtask `blockId` 在本次承担 note 内深链定位

当 subtask 同时拥有 `noteId` 和 `blockId` 时，导航入口会把这两个信息一起带入 note 视图。`NoteView` 在切换到目标 note 后尝试将对应 block 滚动到视野中心并突出显示；如果 `blockId` 已失效，则安全降级为普通的 note 级跳转。

选择原因：当前数据模型已经保留了 `blockId`，补上这一步可以把“对应笔记”真正提升为“对应位置”，且实现成本远低于额外引入路由或文档级深链系统。

## Risks / Trade-offs

- [modifier 点击可能与现有展开折叠行为冲突] → 需要确保快捷跳转只在存在 note 关联时生效，并保留普通点击展开行为。
- [全局 DnD 传感器调整会影响其他拖拽对象] → 需要选择兼顾列表点击与拖拽的位移阈值，而不是无限制立即拖拽。
- [左侧 gutter 增加后内容宽度略收窄] → 通过仅在 note detail 内预留必要宽度控制影响，并保持阅读区主宽度稳定。
- [`blockId` 可能指向已删除块] → 导航解析阶段提前校验 block 是否仍存在，失效时自动回退到 note 级跳转。

## Migration Plan

- 不涉及数据库、持久化或云同步迁移。
- 作为纯 renderer / UX 更新发布。
- 若未来需要从更多入口（如搜索结果、聊天引用）跳到指定块，可复用本次加入的 note 目标块导航状态。

## Open Questions

- 打开 note 后是否需要在顶部短暂提示“来自任务链接”，帮助用户理解跳转来源？
