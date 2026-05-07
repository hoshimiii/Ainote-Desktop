## MODIFIED Requirements

### Requirement: Planned write tools execute before success
The assistant tool execution path SHALL report a write tool as successful only after its registered tool call has been accepted by the user, revalidated against the latest snapshot, and its planned formal kanban commands have executed successfully. In structured workflow mode, the system MUST use LLM-first intent recognition to select registered tools and extract structured arguments before invoking a tool.

#### Scenario: Sequential mixed tool calls share preview state
- **WHEN** a single structured request contains multiple tool calls and an earlier tool produces write commands
- **THEN** later tool calls in the same request MUST observe the preview snapshot produced by those earlier commands instead of the original untouched snapshot

#### Scenario: Redundant current-workspace miss is hidden beside writes
- **WHEN** a mixed structured request includes writes and a read-only current-workspace probe would only return “当前没有激活工作区。”
- **THEN** the assistant MUST omit that redundant read-only miss from the aggregated user-facing response and plan output

#### Scenario: Accepted write commits report committed wording
- **WHEN** the user accepts a pending preview and the resulting commands commit successfully
- **THEN** the assistant MUST report the committed outcome using verified execution details, and MUST NOT reuse preview-only wording such as “已整理出…预览” in the final success response

### Requirement: Confirmation-gated tools defer execution
The assistant tool execution path SHALL persist a pending preview instead of mutating kanban state when write changes are proposed.

#### Scenario: Consumed preview actions disappear from chat history
- **WHEN** the user confirms or cancels the active pending preview
- **THEN** the renderer chat history MUST clear stale preview action controls for that consumed preview so the conversation no longer appears to be awaiting confirmation
