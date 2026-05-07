## MODIFIED Requirements

### Requirement: Block controls use separate interaction rails
The system SHALL render note block drag and link controls inside a dedicated left-side gutter that remains pointer-accessible and visually separated from the block body and destructive actions.

#### Scenario: Left rail stays reachable without overlapping the block body
- **WHEN** a note block is shown in the detail pane
- **THEN** the drag handle and link control appear inside a reserved left gutter
- **AND** the block body is offset so the left rail is not clipped against the neighboring panel boundary

#### Scenario: Insert controls follow the same gutter alignment
- **WHEN** insert handles are shown before or after a note block
- **THEN** they align with the same left-side gutter system used by the drag rail
- **AND** they do not visually overlap the block content area

### Requirement: Block drag interaction remains reachable and visible
The system SHALL let users drag note blocks through the dedicated drag handle without the interaction feeling like plain text selection, and SHALL provide a visible drag preview for blocks.

#### Scenario: Dragging from the handle shows a visible block preview
- **WHEN** the user starts dragging a note block from its drag handle
- **THEN** the system enters block drag mode without requiring a long press that feels like text selection
- **AND** a visible drag preview identifies the dragged block as a note block rather than a generic label only

#### Scenario: Dragging does not break block content editing
- **WHEN** the user interacts with block body content instead of the drag handle
- **THEN** normal text selection and editing still work
- **AND** dragging remains scoped to the dedicated drag handle affordance
