## ADDED Requirements

### Requirement: Provider preset determines the effective assistant endpoint defaults
The system SHALL keep AI assistant provider preset and base URL consistent so that provider-specific requests do not silently fall back to the OpenAI default endpoint.

#### Scenario: Moonshot preset uses the Moonshot root path when no custom base URL is provided
- **WHEN** the user selects the `moonshot` provider preset and leaves the base URL empty or on a stale default value inherited from OpenAI
- **THEN** the effective AI assistant configuration uses the Moonshot default root path
- **AND** connection tests and chat requests are sent to the Moonshot-compatible chat completions URL instead of `https://api.openai.com/v1/chat/completions`

#### Scenario: Reopening settings restores a provider-consistent base URL
- **WHEN** a saved AI assistant profile is reopened and its provider preset is `moonshot` while the persisted base URL is empty or a stale OpenAI default
- **THEN** the settings panel restores the provider-consistent Moonshot root path
- **AND** the user does not see a provider selection that silently points to OpenAI

### Requirement: AI assistant draft validation and saved configuration use the same effective provider settings
The system SHALL ensure that connection validation, saved configuration, and runtime chat requests agree on the same effective provider/base URL combination.

#### Scenario: Testing a provider draft uses the current effective provider root path
- **WHEN** the user edits provider-related AI settings and triggers connection validation before saving
- **THEN** the validation request uses the current draft provider/base URL values after provider-aware normalization
- **AND** the test result reflects the provider the user currently selected rather than an older saved endpoint

#### Scenario: Saved provider configuration is used by the runtime chat flow
- **WHEN** the user saves an AI assistant profile with a provider preset and then sends a chat message
- **THEN** the runtime LLM request uses the same effective provider/base URL that was saved
- **AND** the chat flow does not silently revert to the OpenAI default endpoint for that provider
