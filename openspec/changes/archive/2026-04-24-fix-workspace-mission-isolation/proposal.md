## Why

Mission 在桌面端应该严格按工作区隔离显示，但当前左侧栏会把其他工作区的 mission 一并显示出来。这会破坏工作区边界，导致用户在错误的上下文里查看、拖拽、重命名或删除 mission，因此需要把 mission 的显示和本地状态归属统一收敛到工作区范围内。

## What Changes

- 修正左侧 mission 列表，只显示当前工作区归属的 mission，不再回填其他工作区的全量 mission。
- 修正 mission 的本地状态维护逻辑，确保新建、删除和重排 mission 时同时维护 workspace.missionIds 与 missionOrder 的一致性。
- 修正 mission 拖拽重排时的候选集合，只允许在当前工作区内排序。
- 为多工作区场景补充需求说明和验证覆盖，防止 mission 再次跨工作区串显。

## Capabilities

### New Capabilities
- `workspace-mission-isolation`: 定义 mission 在列表展示、创建删除和排序时必须受当前工作区约束的行为要求。

### Modified Capabilities
None.

## Impact

- 受影响前端状态与视图：src/renderer/components/Mission/MissionSidebar.tsx、src/renderer/components/pages/WorkPage.tsx、src/renderer/store/kanban.ts。
- 受影响持久化与行为契约：src/shared/kanbanPersistence.ts，以及新增的 OpenSpec capability 规格。
- 需要补充自动化验证，覆盖至少两个工作区下 mission 隔离显示与排序行为。