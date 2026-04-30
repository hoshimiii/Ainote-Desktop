## ADDED Requirements

### Requirement: Tasks with linked notes are directly navigable
The system SHALL expose a direct navigation affordance for any task that already has a linked note so users can open that note from the board without manually finding it in the note list.

#### Scenario: Clicking a task note link opens the linked note
- **WHEN** a task in the board view has `linkedNoteId`
- **THEN** the task card displays an explicit note link or note chip
- **AND** clicking that note affordance opens the linked note in the detail pane

#### Scenario: Modifier click on a linked task title jumps to the note
- **WHEN** a task has a linked note and the user `Ctrl + Click`s (or `Cmd + Click`s on macOS) the task title
- **THEN** the system opens the linked note instead of toggling only the task expansion state

### Requirement: Subtasks with linked notes are directly navigable
The system SHALL expose note navigation from a subtask when the subtask has an associated note reference.

#### Scenario: Clicking a subtask note affordance opens the linked note
- **WHEN** a subtask has `noteId`
- **THEN** the subtask row displays an explicit note navigation affordance
- **AND** clicking that affordance opens the linked note in the detail pane

#### Scenario: Subtask deep-link scrolls to the linked block when available
- **WHEN** a subtask has both `noteId` and `blockId`
- **THEN** opening the linked note scrolls the note detail view to the referenced block
- **AND** that block is visually brought into focus for the user

#### Scenario: Missing linked block falls back to note-level navigation
- **WHEN** a subtask still references a note but its `blockId` no longer exists in that note
- **THEN** the system still opens the linked note
- **AND** it does not fail while attempting to scroll to a missing block

#### Scenario: Missing linked note degrades safely
- **WHEN** a task or subtask references a note ID that is no longer present
- **THEN** the board view does not crash
- **AND** the missing note affordance is hidden or rendered in a disabled state
