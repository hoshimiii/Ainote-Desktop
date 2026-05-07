## ADDED Requirements

### Requirement: Structured agent execution persists through the canonical kanban snapshot path
The system SHALL persist successful structured agent mutations through the same canonical kanban snapshot save path used for formal command execution so that database state and agent-visible state remain consistent.

#### Scenario: Plan-and-solve saves the updated snapshot canonically
- **WHEN** a structured assistant plan executes one or more formal commands successfully
- **THEN** the updated kanban snapshot is written back to the persisted `store:kanban` state through the canonical snapshot save path
- **AND** the persistence path is shared with other formal kanban execution flows rather than duplicating a divergent write-only branch

### Requirement: Successful agent mutations trigger renderer rehydration
The system SHALL notify renderer stores after successful structured agent mutations so that cached kanban state is reloaded and visible UI state reflects the completed operation.

#### Scenario: Renderer receives a rehydrate signal after agent execution
- **WHEN** a structured assistant plan finishes persisting a successful mutation
- **THEN** the main process broadcasts the kanban rehydrate signal to renderer windows
- **AND** renderer persistence helpers reload the latest kanban snapshot from storage

#### Scenario: UI reflects the agent mutation without manual refresh
- **WHEN** a user asks the assistant to perform a structured kanban mutation that succeeds
- **THEN** the relevant workspace, mission, board, task, subtask, or note change becomes visible in the page state after rehydration
- **AND** the assistant does not report a successful mutation while leaving the renderer on stale cached data
