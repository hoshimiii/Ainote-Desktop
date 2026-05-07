## Context

当前笔记详情页的一阶段问题横跨三个 renderer 面：块级工具条、页面 chrome、以及 markdown 块交互。块级工具条的问题来自 NoteView 外层提供拖拽/关联按钮，而 MarkdownBlock 与 CodeBlockEditor 又各自提供删除按钮，导致多个控件争用同一条绝对定位轨道。页面顶部的问题来自 WindowTitlebar 与 NoteView 自己的头部完全分离，窗口控件和页面控件没有共享的对齐体系。markdown 块的问题则来自当前仅有 textarea 与 ReactMarkdown 的双态切换，但阅读态样式层次和编辑态的块级交互都还不足以支撑稳定写作体验。

本次 change 的范围只覆盖第一阶段：按照探索结论选择“问题 1 使用方案 2、问题 2 使用方案 3、问题 3 使用 A+B”。第二阶段的图片/视频插入与 C 级 Typora 式单表面编辑器暂不纳入本次设计。

## Goals / Non-Goals

**Goals:**

- 将块级拖拽、关联、删除的命中区域分离，恢复稳定拖拽能力。
- 为笔记详情页建立明确的 chrome 分层，让窗口 chrome、页面 chrome 与正文区具有一致的对齐与节奏。
- 在不重构编辑器内核的前提下，提高 markdown 块的阅读态层次与编辑态顺滑度。
- 保持现有块模型与数据结构可继续工作，为第二阶段媒体块讨论保留空间。

**Non-Goals:**

- 不实现完整 Typora 式单表面 WYSIWYG 编辑器。
- 不引入图片/视频 block、媒体导入链路或资产同步能力。
- 不修改数据库 schema、共享 Block 数据模型或云同步协议。

## Decisions

### 1. 块级 chrome 采用“左侧轨道 + 右上角动作”的分轨设计

拖拽手柄与关联按钮保留在块外左侧轨道，删除等块级动作迁移到块内容区域的右上角或块头区域，不再与拖拽手柄共享同一条绝对定位轨道。

选择原因：这符合探索中为问题 1 选定的方案 2，能够在不重构全部 block ownership 的情况下最小化修复命中冲突，并保留 MarkdownBlock / CodeBlockEditor 对自身局部动作的表达能力。

备选方案：把所有 block chrome 全部收回 NoteView 统一渲染。未采用，因为这会把块级局部动作语义全部上提，第一阶段改动面过大。

### 2. 页面顶部采用“Window chrome / Page chrome / Content”三层结构

WindowTitlebar 继续只负责窗口级控件与 breadcrumb，NoteView 继续拥有页面级标题、返回与页面操作，但两者需要共享一致的横向 inset、垂直节奏与视觉边界，从而形成独立但协调的三层结构，而不是强行合并成单一物理横条。

选择原因：这对应探索中为问题 2 选定的方案 3。它比把页面操作直接塞进窗口栏更稳健，也更适合后续 BoardView、NoteView 等多个详情页复用同一套 page chrome 规则。

备选方案：把页面头部操作全部并入 WindowTitlebar。未采用，因为窗口行为与页面行为会过度耦合，后续扩展成本更高。

### 3. markdown 块维持双态模型，但提升阅读态排版与块级交互

第一阶段不替换编辑器内核，继续沿用“编辑态 textarea + 阅读态 ReactMarkdown”的双态模型，同时通过自定义排版样式、必要的渲染组件和更稳定的块级焦点/选中交互来实现 A+B。

选择原因：这能够在不进入 C 级编辑器重构的前提下，显著改善写作体验，并与现有 Block 数据结构保持兼容。

备选方案：直接引入 Typora 式单表面编辑器。未采用，因为这会把问题从 UI 优化升级为编辑器架构重写，也会提前耦合未来媒体与光标模型设计。

### 4. 第二阶段媒体与 C 级编辑器保持显式 deferred

本次 change 只需要保证第一阶段改造不会阻塞未来新增 image/video block 或重新评估 C 级编辑器。设计上应避免把 markdown 块的样式与交互写死到无法扩展的结构中，但不会在本次文档中提前承诺媒体实现方式。

选择原因：用户已明确第二阶段仍需讨论，本次设计应收敛而不是扩 scope。

## Risks / Trade-offs

- [块级动作仍分散在多个组件] → 通过分轨规则与统一样式约束降低冲突，而不是在第一阶段强行集中所有 ownership。
- [Window chrome 与 Page chrome 仍是两层] → 通过共享 inset 与节奏提升一致性，接受它们不是同一物理横条的现实。
- [双态 markdown 仍不等同于 Typora] → 明确第一阶段目标是 A+B，不承诺 C 级体验，避免用户预期错位。
- [未来媒体块需要新的 block type] → 第一阶段不改数据模型，但避免把当前样式结构写成只支持 markdown/code 两种块的死结构。

## Migration Plan

- 不涉及数据库、持久化或同步迁移。
- 第一阶段可以作为纯 renderer UI/interaction 更新发布。
- 若后续第二阶段启动，可在此基础上新增 media block 能力或重新评估编辑器内核，而无需回滚本次 change。

## Open Questions

- Page chrome 是否需要在 BoardView、NoteView 之间抽成共享布局组件，还是先由 NoteView 先行验证？
- Markdown 阅读态是优先走纯 CSS 排版系统，还是同时引入更细粒度的 ReactMarkdown 自定义组件？
- 第二阶段的图片/视频是更适合作为独立 block type，还是作为 markdown 内嵌语法的渲染增强？