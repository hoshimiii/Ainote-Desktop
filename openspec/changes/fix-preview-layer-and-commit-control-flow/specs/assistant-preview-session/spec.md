## ADDED Requirements

### Requirement: Preview sessions are non-persistent canonical snapshots in the kanban store
The system SHALL create an assistant preview session inside the existing renderer kanban store as non-persistent state that reuses the canonical `KanbanPersistedState` shape instead of introducing a preview-specific entity schema.

#### Scenario: Preview session captures the returned snapshot
- **WHEN** a structured assistant write returns preview metadata with `preview.snapshot`
- **THEN** the renderer MUST store that snapshot in the non-persistent preview branch of the kanban store
- **AND** the stored snapshot MUST use the same canonical snapshot shape consumed by the kanban UI
- **AND** the renderer MUST NOT write the preview snapshot into persisted `store:kanban`

#### Scenario: Preview session does not survive persistence rehydration by default
- **WHEN** the app reloads, rehydrates persisted stores, or no active preview is present
- **THEN** the non-persistent preview branch in the kanban store MUST reset to empty
- **AND** the UI MUST fall back to the canonical persisted kanban snapshot

### Requirement: Preview sessions drive immediate UI rendering
The system SHALL render assistant previews immediately after preview metadata is returned, without requiring an extra accept-before-view interaction.

#### Scenario: Preview becomes visible immediately
- **WHEN** the main process returns a pending preview and preview snapshot
- **THEN** the relevant workspace, mission, board, task, subtask, or note UI MUST read from the active preview session and display the pending changes
- **AND** preview controls MUST be presented as direct resolution actions such as "保存更改" and "放弃预览"

#### Scenario: Leaving preview restores canonical rendering
- **WHEN** the active preview is discarded or finishes committing
- **THEN** the renderer MUST clear the preview session branch in the kanban store
- **AND** subsequent UI reads MUST come from the canonical kanban snapshot

### Requirement: Preview resolution bypasses synthetic chat messages
The system SHALL resolve preview sessions through explicit control actions instead of injecting synthetic user messages into the chat transcript.

#### Scenario: Button click resolves preview directly
- **WHEN** a user clicks the preview save or discard control
- **THEN** the renderer MUST invoke a direct preview resolution action using the active `pendingPreviewId`
- **AND** the renderer MUST NOT append a synthetic user message containing "确认" or "取消"

#### Scenario: Manual confirm or cancel maps to the active preview session
- **WHEN** a user manually types "确认" or "取消" while an active preview session exists
- **THEN** the system MUST map that input to the same direct preview resolution path
- **AND** the input MUST NOT be treated as a fresh tool-routing request
