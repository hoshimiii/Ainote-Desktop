## ADDED Requirements

### Requirement: Agent tools and workflows are registered through explicit registries
The system SHALL define assistant tools and assistant workflows as independent modules and SHALL expose them through explicit registry entrypoints so the planner can enumerate, inspect, and invoke them without hard-coding every capability in a single file.

#### Scenario: Planner enumerates registered capabilities
- **WHEN** the planner initializes its assistant capabilities
- **THEN** it loads tool descriptors from a dedicated tools registry
- **AND** it loads workflow descriptors from a dedicated workflows registry
- **AND** each descriptor remains addressable by a stable identifier

#### Scenario: Adding a tool does not require embedding its full logic in the planner file
- **WHEN** a new assistant tool is introduced
- **THEN** its implementation lives in its own module under the tools directory
- **AND** the planner integrates it by consuming registry metadata rather than by adding a new hard-coded behavior branch

### Requirement: Agent can read kanban workspaces through a dedicated read tool
The system SHALL provide a dedicated workspace-read tool that can inspect the persisted kanban workspace state without mutating it and return structured workspace context for planning.

#### Scenario: Workspace-read lists available workspaces
- **WHEN** the assistant needs to inspect the available kanban workspaces
- **THEN** the workspace-read tool returns the accessible workspace identifiers and names from persisted state
- **AND** the call does not create, rename, or delete any workspace data

#### Scenario: Workspace-read narrows results for planning
- **WHEN** the assistant receives input that references a specific workspace while also requesting another action
- **THEN** the planner may call workspace-read to resolve the referenced workspace context
- **AND** the workspace lookup result remains available to later tool or workflow planning steps rather than forcing an immediate fixed action
