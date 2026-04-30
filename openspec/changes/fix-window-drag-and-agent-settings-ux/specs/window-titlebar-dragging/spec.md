## ADDED Requirements

### Requirement: Shared frameless titlebar provides a reliable drag hit area
The system SHALL provide a stable, easy-to-hit drag region along the visible top edge of pages that use the shared frameless window titlebar.

#### Scenario: Dragging from the top edge moves the window without hunting for gaps
- **WHEN** a user presses and drags from a non-interactive area in the shared titlebar near the page top edge
- **THEN** the frameless window moves as expected
- **AND** the user does not need to find a tiny empty gap between controls to start the drag

### Requirement: Titlebar controls remain interactive while drag behavior is preserved
The system SHALL preserve normal click behavior for titlebar buttons and actions while keeping the remaining titlebar chrome draggable.

#### Scenario: Interactive controls do not accidentally start window dragging
- **WHEN** the user clicks the back button, sync/logout actions, breadcrumb-adjacent actions, or window controls inside the shared titlebar
- **THEN** the intended button action fires normally
- **AND** the click does not begin a window drag instead

#### Scenario: Pages that reuse the shared titlebar inherit the same drag semantics
- **WHEN** a page renders the shared titlebar component in the main desktop window
- **THEN** that page exposes the same reliable drag region and protected control zones
- **AND** the behavior stays consistent across workspace, login, and workspace-selection surfaces
