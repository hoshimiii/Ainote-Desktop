## Context

桌面端当前同时维护三类与 mission 归属相关的数据：全局 missions 字典、workspace.missionIds、以及按工作区分组的 missionOrder。现有左侧栏实现会先读取当前工作区的 missionOrder，再把全局 missions 中剩余的所有 mission 回填到列表，导致其他工作区的 mission 被错误显示到当前工作区。

同一时期的兼容层 Zustand 写路径还存在第二个问题：createMission 会更新 missions 和 missionOrder，但不会把 mission 挂到当前 workspace.missionIds；mission 拖拽排序又会在 missionOrder 缺失时退回到全局 missions 集合。持久化恢复逻辑却是以 workspace.missionIds 作为工作区归属来源，这意味着当前 UI 实际上在用“全量回填”掩盖本地状态不一致，并且历史本地数据里可能已经存在孤儿 mission。

约束如下：

- 这是一次 bug 修复，不应引入新的跨工作区移动能力。
- 现有正式命令模型、云快照和数据库都已经把 mission 归属建模为 workspace 级关系，应尽量沿用这一约束。
- 兼容层写路径仍在前端使用，因此不能只修显示层而不修状态维护。

## Goals / Non-Goals

**Goals:**

- 让 mission 列表、拖拽排序和当前工作区上下文严格按 workspace 归属工作。
- 保证兼容层中 mission 的创建、删除和排序同时维护 workspace.missionIds 与 missionOrder 的一致性。
- 对历史脏数据提供保守恢复策略，尽量避免用户已有 mission 因修复后直接消失。
- 为多工作区场景补充自动化验证，覆盖显示隔离、排序隔离和恢复行为。

**Non-Goals:**

- 不引入跨工作区移动 mission 的新交互。
- 不重构整个 renderer 兼容层或强制把所有写操作切换到正式服务边界。
- 不修改数据库或云端 schema。

## Decisions

### 1. 以 workspace.missionIds 为 renderer 中 mission 归属的权威来源

左侧栏展示集合和 mission 拖拽重排集合都只从当前工作区拥有的 mission 中推导，而不是从全局 missions 字典推导。排序顺序仍由 missionOrder[workspaceId] 提供，但 missionOrder 只能在“当前工作区拥有的 mission 子集”上生效。

选择原因：持久化恢复、正式命令模型以及数据库 schema 都已经把 mission 归属建模为工作区维度，沿用这个边界可以避免在 bug 修复中引入新的 ownership 模型。

备选方案：在 Mission 类型里新增 workspaceId 字段作为前端权威归属。未采用，因为这会扩散到持久化、云快照、类型定义和兼容层读写路径，超出本次修复范围。

### 2. 兼容层 mission 写路径必须同步维护 workspace.missionIds 与 missionOrder

createMission、deleteMission 和 reorderMissions 相关路径需要保证工作区拥有的 mission 集合和排序集合始终一致。这样才能保证刷新或重启后，mission 依旧属于原工作区，且不会再依赖 Sidebar 的错误回填逻辑。

选择原因：如果只修 MissionSidebar，新的 mission 仍可能在下一次持久化恢复后变成无归属或不可见，问题会以另一种形式持续存在。

备选方案：仅修 MissionSidebar。未采用，因为这只能修复显示症状，不能阻止后续继续产生脏数据。

### 3. 对历史孤儿 mission 采用“唯一归属才恢复”的保守修复策略

在持久化恢复期间，检测存在于 missions 中但不属于任何 workspace.missionIds 的 mission。若某个 mission 只出现在一个 workspace 的 missionOrder 中，则把它恢复归属到该工作区；若它没有可唯一推断的工作区，或者同时出现在多个工作区排序中，则不自动归属，并通过现有 transientRecoveryMessage 通知用户存在未自动恢复的数据。

选择原因：这可以尽量保住由旧 bug 产生但仍能安全推断归属的数据，同时避免把已污染的 missionOrder 盲目当作事实来源，造成跨工作区错挂。

备选方案一：完全丢弃孤儿 mission 的可见性。未采用，因为会让已有本地数据在修复后无提示消失。

备选方案二：直接把 missionOrder 中出现的所有 mission 全量并入 workspace.missionIds。未采用，因为 missionOrder 也可能已经被跨工作区污染，盲合并会进一步放大错误归属。

### 4. 用 store/persistence 测试覆盖隔离与恢复边界

验证重点放在状态与持久化边界，而不只做组件快照。测试至少需要覆盖：两个工作区下 mission 列表隔离、mission 创建后归属持久化、删除后 workspace 清理、以及唯一可推断孤儿 mission 的恢复行为。

选择原因：本次问题横跨 UI 选择集合、写路径和 rehydration 归一化，单点测试不足以防回归。

## Risks / Trade-offs

- [历史 missionOrder 已被跨工作区污染] -> 只在“唯一可推断归属”时恢复孤儿 mission，避免扩大污染面。
- [修复后某些旧 mission 不再可见] -> 通过 transientRecoveryMessage 暴露恢复结果，并把自动恢复范围限制在安全子集内。
- [两个 ownership 结构未来再次漂移] -> 在兼容层集中维护 mission membership，并为 create/delete/reorder/hydrate 增加回归测试。
- [未引入 Mission.workspaceId 字段] -> 当前方案保留了既有数据结构，代价是需要继续维护 workspace.missionIds 与 missionOrder 的一致性。

## Migration Plan

- 不进行数据库或云端 schema 迁移。
- 在本地 persisted state 恢复时扫描孤儿 mission，并执行保守恢复。
- 已能唯一推断归属的 mission 在恢复后重新进入其工作区的 missionIds 和 missionOrder。
- 无法安全推断归属的 mission 保持隐藏，不参与任何工作区列表或排序，并通过 transientRecoveryMessage 告知用户本地数据存在未自动恢复项。
- 本次修复可直接随应用版本发布，无需手工迁移步骤；回滚时仍然只影响前端本地状态处理逻辑。

## Open Questions

- 对无法唯一归属的历史孤儿 mission，后续是否需要一个显式恢复入口，而不只是提示信息？
- renderer 兼容层的 mission 写路径是否应在后续单独变更中继续收缩到 formal service boundary？