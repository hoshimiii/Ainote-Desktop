# Desktop UX and Features Polish - 全流程过程文档

---

## Phase 1: Board Scoping Bug Fix

【任务】修复看板作用域 Bug，确保 Board/Task/SubTask 正确归属于当前 Mission

【完成内容】
- 修复 `kanban.ts` 中 createBoard/deleteBoard/createTask 等操作的 missionId 作用域绑定
- 确保切换 Mission 时只显示当前 Mission 下的 Board 和 Task

【验证结果】`tsc -p tsconfig.web.json --noEmit` 0 errors，`tsc -p tsconfig.node.json --noEmit` 0 errors

【完成时间】Session Phase 1 ✅

---

## Phase 2: Frameless Window + Custom Titlebar

【任务】实现无边框窗口 + 自定义标题栏（含窗口控制按钮）

【完成内容】
- `main/index.ts` BrowserWindow 设置 `frame: false`
- 新建 `WindowTitlebar.tsx` 组件，含最小化/最大化/关闭按钮
- preload 暴露 `window.electronAPI.window.minimize/maximize/close`
- IPC handlers 注册窗口控制事件

【验证结果】`tsc --noEmit` 0 errors，标题栏按钮均有 onClick handler

【完成时间】Session Phase 2 ✅

---

## Phase 3: Three-Column Layout

【任务】实现三栏布局：左侧 Mission 导航、中间 Note/Board 内容区、右侧聊天面板

【完成内容】
- `App.tsx` → `AppContent` 三栏 flex 布局
- `MissionSidebar.tsx` 左侧栏：Mission 列表 + Workspace 切换
- `NoteListPanel.tsx` 中间面板：Note 和 Board 卡片列表 + 标签页切换
- `NoteView.tsx` / `BoardView.tsx` 中间内容渲染
- `ChatBotWindow.tsx` 右侧聊天面板

【验证结果】`tsc --noEmit` 0 errors

【完成时间】Session Phase 3 ✅

---

## Phase 4: Login & User Management

【任务】实现本地用户登录/注册系统 + 用户会话管理

【完成内容】
- `schema.ts` 新增 `users` 表（schema version 2），migration 自动升级
- `AuthService.ts` 使用 scrypt 哈希，注册/登录/获取用户
- `preload/index.ts` 暴露 `auth` API（register/login/currentUser/listUsers）
- `store/auth.ts` Zustand store：login/register/logout/checkSession
- `LoginPage.tsx` 登录/注册界面 + 快速切换用户列表
- `App.tsx` AppShell 鉴权包装：未登录显示 LoginPage

【验证结果】`tsc -p tsconfig.web.json --noEmit` 0 errors，`tsc -p tsconfig.node.json --noEmit` 0 errors

【完成时间】Session Phase 4 ✅

---

## Phase 5: Drag & Drop (@dnd-kit)

【任务】为 Mission、Note、Board、Task、Block 添加拖拽排序

【完成内容】
- 安装 `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/utilities@3.2.2`
- `SortableItem.tsx` 通用可排序包装组件
- `MissionSidebar.tsx` Mission 拖拽排序（vertical）
- `NoteListPanel.tsx` Note 和 Board 卡片拖拽排序（vertical）
- `BoardView.tsx` Board 列拖拽排序（horizontal）+ Task 卡片拖拽排序（vertical）
- `NoteView.tsx` Block 拖拽排序（vertical）
- Store 新增 `reorderNotes` / `reorderBlocks` actions

【验证结果】`tsc -p tsconfig.web.json --noEmit` 0 errors，`tsc -p tsconfig.node.json --noEmit` 0 errors

【完成时间】Session Phase 5 ✅

---

## Phase 6: Markdown Rendering & Code Execution

【任务】实现 Markdown 渲染（含 LaTeX 数学公式）+ 代码块执行

【完成内容】
- 安装 `react-markdown` + `rehype-katex` + `remark-math` + `katex`
- `MarkdownBlock.tsx` 支持编辑/预览切换，预览模式渲染 Markdown + KaTeX
- `CodeBlockEditor.tsx` 代码编辑器 + 运行按钮 + 输出显示
- preload 暴露 `codeExec.run` API
- Main 进程 IPC handler 执行代码并返回结果

【验证结果】`tsc --noEmit` 0 errors

【完成时间】Session Phase 6 ✅

---

## Phase 7: Block Insertion

【任务】允许在任意位置插入文本块或代码块

【完成内容】
- `InsertBlockHandle.tsx` 插入手柄组件：hover 显示 + 按钮插入 markdown/code 块
- Store 新增 `insertBlock(noteId, afterIndex, type)` action
- `NoteView.tsx` 每个 Block 之间及顶部渲染 InsertBlockHandle

【验证结果】`tsc --noEmit` 0 errors

【完成时间】Session Phase 7 ✅

---

## Phase 8: Task → Note Linking

【任务】实现 Block ↔ Task 双向关联 + 任务卡片关联笔记指示

【完成内容】
- `types.ts` Task 新增 `linkedNoteId`，Block 新增 `linkedBoardId/linkedTaskId/linkedSubTaskId`
- Store 新增 `linkTaskToNote` / `linkBlockToTask` actions
- `LinkBlockDialog.tsx` 级联选择器对话框（Board → Task → SubTask）
- `NoteView.tsx` 每个 Block 左侧显示关联按钮，已关联 Block 显示链接标签可点击导航
- `BoardView.tsx` TaskCard 显示"已关联笔记"指示

【验证结果】`tsc -p tsconfig.web.json --noEmit` 0 errors

【完成时间】Session Phase 8 ✅

---

## Phase 9: AI Settings Panel

【任务】实现 AI 设置面板：API Key / Model / Provider 配置

【完成内容】
- `AgentSettingsPanel.tsx` 设置面板组件
- Store 持久化 AI 配置
- 集成到主界面设置入口

【验证结果】`tsc --noEmit` 0 errors

【完成时间】Session Phase 9 ✅

---

## 全局验证

- 所有 Phase 均通过 `tsc -p tsconfig.web.json --noEmit` 编译检查，0 errors
- 所有 Phase 均通过 `tsc -p tsconfig.node.json --noEmit` 编译检查，0 errors
- 所有按钮均有 onClick handler
- 所有异步操作均有 try/catch
- 所有 UI 文本已中文化
