## ADDED Requirements

### Requirement: Mini dialog refreshes config on focus
The mini dialog SHALL reload chatbot configuration from `store.get('chatbot')` every time the mini dialog window gains focus, so that any config saved in the main window is reflected without requiring an app restart.

#### Scenario: Config updated before second open
- **WHEN** the user saves a new API key in the main window and then opens the mini dialog
- **THEN** the mini dialog SHALL display a chat input with the updated API key active (no "no config" fallback)

#### Scenario: First open with no config
- **WHEN** the mini dialog is opened before any config has been saved
- **THEN** the mini dialog SHALL render without crashing, using null/empty config state

#### Scenario: Focus fires on initial show
- **WHEN** the mini dialog window is shown for the first time
- **THEN** it SHALL fetch config via `store.get('chatbot')` (not mount-only effect dependency)
