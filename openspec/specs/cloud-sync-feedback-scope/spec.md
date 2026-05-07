## ADDED Requirements

### Requirement: Transient cloud recovery warnings stay within the sync context
The system SHALL present transient cloud recovery warnings inside the cloud sync panel rather than as persistent warnings on the main workspace surfaces.

#### Scenario: Main workspace surfaces do not render the transient sync warning banner
- **WHEN** a transient cloud recovery message exists and the user is viewing the workspace selection page or the main work page
- **THEN** those primary pages do not render the yellow transient recovery banner
- **AND** the main work interface remains focused on workspace and note/task interaction

#### Scenario: Cloud sync panel shows the transient recovery warning when opened
- **WHEN** a transient cloud recovery message exists and the user opens the cloud sync panel
- **THEN** the sync panel displays the yellow recovery warning and its message content
- **AND** the warning is shown in the same context as other sync status feedback

#### Scenario: Dismissing the transient warning from the sync panel clears it
- **WHEN** the user dismisses the transient cloud recovery warning from the cloud sync panel
- **THEN** the transient recovery message is cleared from state
- **AND** reopening the sync panel does not show the warning again unless a new transient recovery occurs
