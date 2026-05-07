## Requirements

### Requirement: Planned write tools execute before success
The assistant tool execution path SHALL report a write tool as successful only after its registered tool call has been accepted by the user, revalidated against the latest snapshot, and its planned formal kanban commands have executed successfully. In structured workflow mode, the system MUST use LLM-first intent recognition to select registered tools and extract structured arguments before invoking a tool.

#### Scenario: LLM-first tool selection
- **WHEN** a user sends a structured workflow request
- **THEN** the system MUST ask the LLM router to select from registered tool definitions and return structured tool calls before invoking any tool

#### Scenario: Direct write preview succeeds
- **WHEN** the assistant receives a valid write tool call
- **THEN** the system MUST execute it against a preview snapshot and return preview metadata without saving the real kanban snapshot

#### Scenario: Sequential mixed tool calls share preview state
- **WHEN** a single structured request contains multiple tool calls and an earlier tool produces write commands
- **THEN** later tool calls in the same request MUST observe the preview snapshot produced by those earlier commands instead of the original untouched snapshot

#### Scenario: Redundant current-workspace miss is hidden beside writes
- **WHEN** a mixed structured request includes writes and a read-only current-workspace probe would only return “当前没有激活工作区。”
- **THEN** the assistant MUST omit that redundant read-only miss from the aggregated user-facing response and plan output

#### Scenario: Accepted write commits
- **WHEN** the user accepts a pending preview
- **THEN** the system MUST reload the latest persisted snapshot, re-run the pending tool calls, execute resulting formal commands, save the committed snapshot, clear the pending preview, and report verified success

#### Scenario: Accepted write commits report committed wording
- **WHEN** the user accepts a pending preview and the resulting commands commit successfully
- **THEN** the assistant MUST report the committed outcome using verified execution details, and MUST NOT reuse preview-only wording such as “已整理出…预览” in the final success response

#### Scenario: Direct write execution fails
- **WHEN** accepted tool execution fails during validation or formal command execution
- **THEN** the system MUST return a handled failure response and MUST NOT report the operation as verified successful

#### Scenario: Tool invocation is traceable
- **WHEN** structured workflow mode selects and invokes an assistant tool
- **THEN** the planner result MUST include internal trace metadata identifying the invoked tool, whether it produced preview changes, and whether it emitted executable commands

### Requirement: Confirmation-gated tools defer execution
The assistant tool execution path SHALL persist a pending preview instead of mutating kanban state when write changes are proposed.

#### Scenario: Pending preview created
- **WHEN** the assistant plans a write operation
- **THEN** the system MUST save pending preview data containing tool calls and args, and MUST NOT save a mutated kanban snapshot yet

#### Scenario: Pending preview confirmed
- **WHEN** a user confirms a saved pending preview
- **THEN** the system MUST commit by re-running the saved tool calls against the latest snapshot and clearing the pending preview after success

#### Scenario: Pending preview cancelled
- **WHEN** a user cancels a saved pending preview
- **THEN** the system MUST clear the pending preview and leave persisted kanban state unchanged

#### Scenario: Consumed preview actions disappear from chat history
- **WHEN** the user confirms or cancels the active pending preview
- **THEN** the renderer chat history MUST clear stale preview action controls for that consumed preview so the conversation no longer appears to be awaiting confirmation

### Requirement: Persisted assistant writes rehydrate the renderer
Successful assistant write commit SHALL persist through the canonical kanban snapshot store so renderer windows receive the same rehydration signal as formal kanban commands.

#### Scenario: Successful assistant commit persists
- **WHEN** assistant accepted command execution succeeds through the default desktop dependencies
- **THEN** the system MUST write the updated `store:kanban` snapshot and broadcast `store-rehydrate` to open renderer windows

### Requirement: Read-only tools do not claim writes
Read-only assistant tools SHALL return information without executing formal write commands, creating pending previews, or saving a mutated kanban snapshot.

#### Scenario: Workspace read
- **WHEN** the assistant answers a workspace read or query request
- **THEN** the system MUST return the requested workspace information without running write commands
