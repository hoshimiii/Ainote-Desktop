## 1. Renderer mission scope

- [x] 1.1 Update the mission sidebar to derive displayIds from the active workspace mission collection only, preserving per-workspace ordering without global mission fallback.
- [x] 1.2 Update mission drag-and-drop ordering in WorkPage so reorder candidates come only from the active workspace mission set.

## 2. Store and persistence consistency

- [x] 2.1 Update renderer compatibility-layer mission mutations to keep workspace.missionIds and missionOrder synchronized during mission create and delete flows.
- [x] 2.2 Extend persisted state normalization to recover uniquely inferable orphan missions conservatively and surface transient recovery messaging for unresolved ownership.

## 3. Regression coverage

- [x] 3.1 Add persistence tests for orphan mission recovery, ambiguous orphan exclusion, and workspace-scoped mission ordering normalization.
- [x] 3.2 Add multi-workspace regression tests covering sidebar mission isolation and reorder operations that must not introduce foreign mission IDs.