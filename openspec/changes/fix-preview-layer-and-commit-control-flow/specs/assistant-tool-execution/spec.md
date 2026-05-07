## ADDED Requirements

### Requirement: Internal structured traces remain hidden from user-facing responses
The assistant tool execution path SHALL keep internal routing and trace metadata separate from user-visible assistant responses.

#### Scenario: Clarification shows only the user-facing question
- **WHEN** structured routing requires more information before selecting or executing a tool
- **THEN** the assistant MUST return only the clarification question to the user
- **AND** the assistant MUST NOT append internal trace lines such as router, classifier, or stage names

#### Scenario: Preview feedback omits internal trace metadata
- **WHEN** a structured write produces a preview response
- **THEN** the assistant MAY show user-visible execution steps
- **AND** the assistant MUST NOT render internal trace metadata in the chat body

## MODIFIED Requirements

### Requirement: Confirmation-gated tools defer execution
The assistant tool execution path SHALL persist a pending preview instead of mutating kanban state when write changes are proposed, and SHALL resolve that preview through explicit preview control actions rather than synthetic chat confirmations.

#### Scenario: Pending preview created
- **WHEN** the assistant plans a write operation
- **THEN** the system MUST save pending preview data containing tool calls and args, and MUST NOT save a mutated kanban snapshot yet

#### Scenario: Pending preview confirmed through direct control
- **WHEN** a user saves an active pending preview through a preview control action or an equivalent mapped manual confirm fallback
- **THEN** the system MUST commit by re-running the saved tool calls against the latest snapshot and clearing the pending preview after success

#### Scenario: Pending preview cancelled through direct control
- **WHEN** a user discards an active pending preview through a preview control action or an equivalent mapped manual cancel fallback
- **THEN** the system MUST clear the pending preview and leave persisted kanban state unchanged

#### Scenario: Missing pending preview returns deterministic response
- **WHEN** the user sends a confirm or cancel request but there is no active pending preview and no active pending plan
- **THEN** the system MUST return a handled explanatory response
- **AND** the system MUST NOT fall back to LLM clarification for that input

#### Scenario: Resolved preview actions disappear from chat history
- **WHEN** the user confirms or cancels the active pending preview
- **THEN** the renderer chat history MUST clear stale preview action controls for that consumed preview so the conversation no longer appears to be awaiting confirmation
