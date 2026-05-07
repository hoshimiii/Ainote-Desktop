## ADDED Requirements

### Requirement: Preview sessions update renderer before persistence
The system SHALL synchronize pending preview snapshots to renderer UI through the non-persistent preview branch of the renderer kanban store before any canonical save occurs.

#### Scenario: Renderer reflects preview without canonical write
- **WHEN** the main process returns preview metadata for a structured write
- **THEN** the renderer MUST apply the preview snapshot through the non-persistent preview branch of the kanban store
- **AND** the renderer MUST NOT write the preview snapshot to persisted `store:kanban`

#### Scenario: Preview session clears on discard
- **WHEN** a pending preview is discarded
- **THEN** the renderer MUST clear the active preview branch in the kanban store
- **AND** the UI MUST continue rendering the last persisted canonical snapshot

## MODIFIED Requirements

### Requirement: Successful agent mutations trigger renderer rehydration
The system SHALL notify renderer stores after successful structured agent mutations so that cached kanban state is reloaded, any active preview session is cleared, and visible UI state reflects the committed operation rather than the temporary preview state.

#### Scenario: Renderer receives a rehydrate signal after agent execution
- **WHEN** a structured assistant plan finishes persisting a successful mutation
- **THEN** the main process broadcasts the kanban rehydrate signal to renderer windows
- **AND** renderer persistence helpers reload the latest kanban snapshot from storage

#### Scenario: UI reflects the agent mutation without manual refresh
- **WHEN** a user asks the assistant to perform a structured kanban mutation that succeeds
- **THEN** the relevant workspace, mission, board, task, subtask, or note change becomes visible in the page state after rehydration
- **AND** the assistant does not report a successful mutation while leaving the renderer on stale cached data

#### Scenario: Preview session yields to committed canonical state
- **WHEN** a preview-backed mutation commits successfully
- **THEN** the renderer MUST clear the active preview session before or during rehydration
- **AND** the committed canonical snapshot MUST become the sole source of truth for subsequent UI rendering
