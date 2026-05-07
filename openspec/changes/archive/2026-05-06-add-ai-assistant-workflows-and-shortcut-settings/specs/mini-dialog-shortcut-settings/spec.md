## ADDED Requirements

### Requirement: Mini dialog shortcut can be enabled, disabled, and customized
The system SHALL allow users to enable or disable the global shortcut for the mini dialog and to replace the default accelerator with a custom shortcut.

#### Scenario: Enabled shortcut uses the saved accelerator
- **WHEN** the mini dialog shortcut feature is enabled and the user has saved a custom accelerator
- **THEN** the application registers the saved accelerator instead of the hardcoded default
- **AND** triggering that accelerator toggles the mini dialog window

#### Scenario: Disabled shortcut unregisters the global accelerator
- **WHEN** the user disables the mini dialog shortcut feature
- **THEN** the application unregisters the mini dialog global shortcut
- **AND** pressing the previously configured keys no longer opens the mini dialog

#### Scenario: Default shortcut is applied for first-time users
- **WHEN** a user has no saved mini dialog shortcut preference
- **THEN** the application uses `Shift+Alt+Space` as the default accelerator
- **AND** the shortcut remains editable from settings

### Requirement: Shortcut registration status is visible and consistent across the app
The system SHALL expose whether the configured mini dialog shortcut is registered successfully, and SHALL keep the tray menu and settings UI consistent with the effective shortcut state.

#### Scenario: Registration conflict is surfaced to the user
- **WHEN** the application cannot register the configured accelerator because it is invalid or already in use
- **THEN** the settings UI shows that registration failed
- **AND** the user can adjust the shortcut or disable the feature without restarting the app

#### Scenario: Tray menu reflects the effective shortcut
- **WHEN** the mini dialog shortcut setting changes
- **THEN** the tray menu updates to reflect the current effective accelerator or disabled state
- **AND** the tray action still toggles the mini dialog even if the keyboard shortcut is unavailable
