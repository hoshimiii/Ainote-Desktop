## ADDED Requirements

### Requirement: Agent SHALL support ID-aware entity queries
The system SHALL return query results with stable IDs and human-readable names for workspace, mission, board, task, subtask, and note entities when users ask query/list questions.

#### Scenario: Query workspace list with IDs
- **WHEN** user asks "列出工作区" or "workspace 列表"
- **THEN** planner returns a handled response containing each workspace name and its ID

#### Scenario: Query workspace by name
- **WHEN** user asks "查询工作区 Demo 的 id"
- **THEN** planner returns a handled response with workspace name and matching ID

### Requirement: Agent SHALL support rename workflows through formal commands
The system SHALL parse rename intents and generate formal rename commands for supported entities.

#### Scenario: Rename task
- **WHEN** user says "把任务 A 重命名为 B"
- **THEN** planner produces a pending/execute plan containing `rename_task`

### Requirement: Agent SHALL support delete workflows through formal commands
The system SHALL parse delete intents and generate formal delete commands for supported entities.

#### Scenario: Delete note
- **WHEN** user says "删除笔记 X"
- **THEN** planner produces a pending/execute plan containing `delete_note`

### Requirement: Planner SHALL preserve existing confirmation semantics
The system SHALL keep existing confirm/cancel behavior for newly added rename/delete workflows.

#### Scenario: Confirm pending delete plan
- **WHEN** a delete plan is pending and user replies "确认"
- **THEN** planner returns handled response with `commandsToExecute` and clears pending plan
