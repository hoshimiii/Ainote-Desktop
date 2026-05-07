## Why

当前笔记详情页同时存在三类一阶段问题：块级工具条重叠导致拖拽失效、页面顶部窗口控件与页面控件缺乏统一 chrome 体系、以及 markdown 块的阅读层次与编辑交互不足。这些问题已经直接影响笔记编辑的基本可用性，因此需要先完成第一阶段收敛，再把图片/视频与 Typora 式单表面编辑作为后续独立讨论。

## What Changes

- 重整笔记块的 chrome 布局，避免拖拽手柄、关联按钮和删除按钮命中区域重叠。
- 重整笔记详情页的页面 chrome，使窗口标题栏、页面头部和正文区域形成一致的层级与对齐体系。
- 提升 markdown 块的一阶段体验，补强阅读态的内容层次和编辑态的块级交互，但不引入完整的 Typora 式单表面编辑器。
- 明确将图片/视频插入能力和 C 级编辑器重构排除在本 change 之外，留待第二阶段继续讨论。

## Capabilities

### New Capabilities
- `note-detail-layout`: 定义笔记详情页的块级工具条布局、页面 chrome 分层和对齐行为。
- `markdown-block-experience`: 定义 markdown 块在第一阶段的阅读层次与编辑交互要求，不包含完整 WYSIWYG 编辑器重构。

### Modified Capabilities
None.

## Impact

- 受影响笔记与布局组件：src/renderer/components/Note/NoteView.tsx、src/renderer/components/Note/MarkdownBlock.tsx、src/renderer/components/Note/CodeBlockEditor.tsx、src/renderer/components/layout/WindowTitlebar.tsx。
- 受影响拖拽与样式层：src/renderer/components/dnd/SortableItem.tsx、src/renderer/index.css，以及可能新增的 markdown 渲染样式定义。
- 本次不修改数据模型、数据库 schema 或媒体资产导入链路；相关问题将在第二阶段单独讨论。