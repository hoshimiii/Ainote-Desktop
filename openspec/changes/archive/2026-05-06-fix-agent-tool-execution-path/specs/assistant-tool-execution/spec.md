## ADDED Requirements

### Requirement: Planned write tools execute before success
The assistant tool execution path SHALL report a write tool as successful only after its planned formal kanban commands have executed successfully.

#### Scenario: Direct write execution succeeds
- **WHEN** the assistant plans a write operation and write confirmation mode allows immediate execution
- **THEN** the system MUST execute the formal commands and return a handled success response with affected state available in the saved snapshot

#### Scenario: Direct write execution fails
- **WHEN** any planned formal command fails during execution
- **THEN** the system MUST return a handled failure response and MUST NOT report the operation as verified successful

### Requirement: Confirmation-gated tools defer execution
The assistant tool execution path SHALL persist a pending plan instead of mutating kanban state when write confirmation is required.

#### Scenario: Pending plan created
- **WHEN** the assistant plans a write operation and write confirmation mode requires confirmation
- **THEN** the system MUST save the pending plan and MUST NOT save a mutated kanban snapshot yet

#### Scenario: Pending plan confirmed
- **WHEN** a user confirms a saved pending plan
- **THEN** the system MUST execute the saved formal commands, clear the pending plan, and persist the mutated kanban snapshot

### Requirement: Persisted assistant writes rehydrate the renderer
Successful assistant write execution SHALL persist through the canonical kanban snapshot store so renderer windows receive the same rehydration signal as formal kanban commands.

#### Scenario: Successful assistant write persists
- **WHEN** assistant command execution succeeds through the default desktop dependencies
- **THEN** the system MUST write the updated `store:kanban` snapshot and broadcast `store-rehydrate` to open renderer windows

### Requirement: Read-only tools do not claim writes
Read-only assistant tools SHALL return information without executing formal write commands or saving a mutated kanban snapshot.

#### Scenario: Workspace read
- **WHEN** the assistant answers a workspace read or query request
- **THEN** the system MUST return the requested workspace information without running write commands
