## ADDED Requirements

### Requirement: AI assistant settings modal exposes reachable validation and save actions
The system SHALL keep the AI assistant settings modal's primary actions visible and usable in common desktop viewport sizes, including the ability to validate the current draft connection and save the current draft settings.

#### Scenario: Primary actions remain visible in constrained dialog heights
- **WHEN** the AI assistant settings modal is opened in a desktop window with limited vertical space
- **THEN** the modal still shows reachable primary actions for testing the connection and saving the settings
- **AND** the user does not need to guess whether those actions exist or scroll the entire dialog blindly to find them

#### Scenario: Connection validation uses the current unsaved draft values
- **WHEN** the user edits provider, base URL, model, token, or temperature fields and then triggers connection validation before saving
- **THEN** the validation request uses the current in-form draft values
- **AND** the result is shown without requiring the user to save first

### Requirement: AI assistant settings save flow persists the edited configuration
The system SHALL persist edited AI assistant settings when the user saves, and SHALL surface partial failures without silently discarding the saved AI configuration.

#### Scenario: Saved settings are restored after reopening the modal
- **WHEN** the user saves edited AI assistant settings successfully and later reopens the modal
- **THEN** the modal restores the saved provider, model, token, workflow, and shortcut values
- **AND** the saved values are not replaced by stale pre-edit defaults

#### Scenario: Shortcut-side failure does not erase a successfully saved AI profile
- **WHEN** the AI profile saves successfully but shortcut registration fails during the same save flow
- **THEN** the modal reports that the shortcut step failed
- **AND** the AI assistant configuration itself remains saved and available on reopen

### Requirement: AI assistant settings modal closes only on backdrop release outside the card
The system SHALL support clicking outside the AI assistant settings card to close it, but only when the pointer is released outside the card rather than immediately on pointer down.

#### Scenario: Releasing on the backdrop closes the modal
- **WHEN** the user begins a primary-pointer interaction on the backdrop and releases that pointer on a non-card area outside the settings card
- **THEN** the modal closes
- **AND** the close is triggered on pointer release rather than pointer press

#### Scenario: Releasing inside the card keeps the modal open
- **WHEN** the user presses on the backdrop or near the modal boundary but releases the pointer inside the settings card
- **THEN** the modal remains open
- **AND** in-card interactions such as selection, scrolling, button presses, and form editing are not treated as backdrop dismisses
