## Requirements

### Requirement: Block controls use separate interaction rails
The system SHALL render note block drag and link controls inside a dedicated left-side gutter that remains pointer-accessible and visually separated from the block body and destructive actions.

#### Scenario: Drag handle remains reachable while delete action exists
- **WHEN** a user hovers a note block that supports drag, link, and delete actions
- **THEN** the drag handle remains directly pointer-accessible
- **AND** the delete action is rendered outside the drag handle hit area

#### Scenario: Left rail stays reachable without overlapping the block body
- **WHEN** a note block is shown in the detail pane
- **THEN** the drag handle and link control appear inside a reserved left gutter
- **AND** the block body is offset so the left rail is not clipped against the neighboring panel boundary

#### Scenario: Block action layout works for both markdown and code blocks
- **WHEN** the user inspects either a markdown block or a code block
- **THEN** each block presents the same control zoning rule for drag/link versus delete
- **AND** block-type-specific actions do not overlap the shared drag rail

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

### Requirement: Note detail page uses a consistent chrome hierarchy
The system SHALL render the note detail experience as coordinated window chrome, page chrome, and content regions with aligned spacing and visual boundaries.

#### Scenario: Window controls and page controls follow a shared layout system
- **WHEN** the note detail page is displayed
- **THEN** the window title bar and the note page header use consistent horizontal alignment and spacing tokens
- **AND** the content body starts from a visually coherent boundary below the page chrome

#### Scenario: Page chrome remains independent from window chrome responsibilities
- **WHEN** the note detail page renders title, back navigation, and page-specific actions
- **THEN** those controls remain in the page chrome rather than replacing window-level minimize, maximize, or close controls
