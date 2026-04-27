## ADDED Requirements

### Requirement: Active workspace mission list is isolated
The system SHALL render the mission list for the active workspace using only missions owned by that workspace. The system SHALL apply missionOrder for that workspace only to owned missions, and SHALL NOT append missions from other workspaces to fill the list.

#### Scenario: Foreign missions are hidden from the sidebar
- **WHEN** workspace A is active and workspace B owns a different mission
- **THEN** the sidebar shows only workspace A missions
- **THEN** no mission owned only by workspace B appears in workspace A's sidebar

#### Scenario: Missing ordered entry falls back only within owned missions
- **WHEN** the active workspace owns a mission that is absent from its missionOrder
- **THEN** the mission still appears in the sidebar
- **THEN** it is appended after the ordered missions owned by the active workspace

### Requirement: Mission ownership is maintained during local mission mutations
The system SHALL update workspace.missionIds and the corresponding workspace missionOrder together when a mission is created or deleted through the renderer compatibility layer.

#### Scenario: Creating a mission records workspace ownership
- **WHEN** the user creates a mission while a workspace is active
- **THEN** the new mission is added to the missions record
- **THEN** the active workspace includes the mission in workspace.missionIds
- **THEN** the active workspace missionOrder includes the mission ID

#### Scenario: Deleting a mission removes workspace ownership
- **WHEN** the user deletes a mission
- **THEN** the deleted mission is removed from every workspace ownership and ordering structure that references it
- **THEN** the mission no longer appears in any workspace sidebar

### Requirement: Mission reordering is scoped to the active workspace
The system SHALL compute draggable mission ordering from the active workspace mission collection only. The system MUST NOT use the global missions record as the reorder candidate set for a workspace.

#### Scenario: Reordering does not introduce foreign missions
- **WHEN** the user reorders missions inside workspace A while workspace B also has missions
- **THEN** workspace A's missionOrder contains only workspace A mission IDs after the reorder
- **THEN** workspace B mission IDs remain unchanged

### Requirement: Persisted orphan missions are recovered conservatively
During persisted state normalization, the system SHALL recover a mission with no workspace ownership only when exactly one workspace can be inferred safely from mission ordering. If ownership cannot be inferred uniquely, the system MUST exclude that mission from workspace lists.

#### Scenario: Unique missionOrder ownership recovers an orphan mission
- **WHEN** a persisted mission is not referenced by any workspace.missionIds and appears in exactly one workspace missionOrder
- **THEN** the mission is restored to that workspace during normalization
- **THEN** the mission appears in that workspace sidebar after hydration

#### Scenario: Ambiguous orphan mission is not auto-attached
- **WHEN** a persisted mission is not referenced by any workspace.missionIds and does not map to exactly one workspace missionOrder
- **THEN** the mission is excluded from workspace mission lists after normalization
- **THEN** the system does not attach the mission to an arbitrary workspace