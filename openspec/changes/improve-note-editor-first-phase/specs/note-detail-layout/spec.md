## ADDED Requirements

### Requirement: Block controls use separate interaction rails
The system SHALL separate block drag/link controls from destructive block actions so that drag operations are not blocked by overlapping hit targets.

#### Scenario: Drag handle remains reachable while delete action exists
- **WHEN** a user hovers a note block that supports drag, link, and delete actions
- **THEN** the drag handle remains directly pointer-accessible
- **THEN** the delete action is rendered outside the drag handle hit area

#### Scenario: Block action layout works for both markdown and code blocks
- **WHEN** the user inspects either a markdown block or a code block
- **THEN** each block presents the same control zoning rule for drag/link versus delete
- **THEN** block-type-specific actions do not overlap the shared drag rail

### Requirement: Note detail page uses a consistent chrome hierarchy
The system SHALL render the note detail experience as coordinated window chrome, page chrome, and content regions with aligned spacing and visual boundaries.

#### Scenario: Window controls and page controls follow a shared layout system
- **WHEN** the note detail page is displayed
- **THEN** the window title bar and the note page header use consistent horizontal alignment and spacing tokens
- **THEN** the content body starts from a visually coherent boundary below the page chrome

#### Scenario: Page chrome remains independent from window chrome responsibilities
- **WHEN** the note detail page renders title, back navigation, and page-specific actions
- **THEN** those controls remain in the page chrome rather than replacing window-level minimize, maximize, or close controls
