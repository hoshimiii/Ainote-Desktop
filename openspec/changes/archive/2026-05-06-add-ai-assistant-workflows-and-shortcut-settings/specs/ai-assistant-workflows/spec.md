## ADDED Requirements

### Requirement: Assistant profile persists workflow-aware AI settings
The system SHALL persist a shared assistant profile for the main AI chat window and the mini dialog, including model connection settings, system prompt, workflow preset, formal tool enablement, and write-confirmation behavior.

#### Scenario: Saved assistant profile is restored for both chat entry points
- **WHEN** a user saves assistant settings and later reopens the main chat window or the mini dialog
- **THEN** both entry points use the same persisted assistant profile
- **AND** the restored profile includes the configured model settings, system prompt, workflow preset, and tool policy

#### Scenario: Assistant settings expose workflow controls beyond raw model credentials
- **WHEN** the user opens the AI settings panel
- **THEN** the panel allows configuring workflow-aware fields in addition to Base URL, model, API key, and temperature
- **AND** those fields can be saved without breaking the existing chat experience

### Requirement: AI assistant follows structured AiNote workflows for kanban and note creation
The system SHALL allow the AI assistant to guide and execute structured AiNote workflows that reuse or create the appropriate workspace, mission, board, task, subtask, note, and link relationships through the formal kanban boundary.

#### Scenario: Assistant reuses matching structure before creating new records
- **WHEN** a user asks the assistant to create a task-and-note workflow item
- **THEN** the assistant evaluates the current workspace structure before proposing writes
- **AND** it prefers reusing an existing matching workspace, mission, board, or task instead of blindly creating duplicates

#### Scenario: Assistant asks for confirmation before write actions when policy requires it
- **WHEN** the assistant determines that formal write operations are needed and the current profile requires confirmation
- **THEN** it presents the planned actions to the user before executing them
- **AND** it does not mutate kanban state until the required confirmation is obtained

#### Scenario: Assistant reports the executed workflow result with linked entities
- **WHEN** the assistant completes a structured workflow that creates or links kanban entities
- **THEN** the response identifies the affected workspace, mission, board, task, subtask, note, or block references that were used or created
- **AND** the final state is produced through the formal kanban command boundary rather than an unverified free-text claim

### Requirement: AI provider configuration avoids common endpoint 404 errors
The system SHALL normalize supported OpenAI-compatible provider endpoints and surface actionable errors when configuration still produces an invalid chat completion request.

#### Scenario: Duplicate completion path is normalized before request dispatch
- **WHEN** the saved provider configuration already ends with `/chat/completions` or contains redundant trailing separators
- **THEN** the system normalizes the endpoint before issuing the request
- **AND** the chat request is sent to exactly one valid chat completion path

#### Scenario: Failed provider configuration returns actionable diagnostics
- **WHEN** a provider request still fails after endpoint normalization
- **THEN** the assistant settings or chat response surfaces an explicit error message that distinguishes request failure from missing assistant workflow support
- **AND** the user can infer that the issue is provider configuration or endpoint compatibility rather than the mini dialog route itself
