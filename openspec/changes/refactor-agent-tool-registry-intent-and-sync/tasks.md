## 1. Registry foundation

- [x] 1.1 Introduce shared assistant tool/workflow descriptor types and explicit registry entrypoints under `src/main/services/tools/` and `src/main/services/workflows/`.
- [x] 1.2 Extract the first registry-backed capabilities from `AssistantWorkflowPlanner` into independent modules, including a dedicated `workspace-read` tool.

## 2. Intent-aware planning orchestration

- [x] 2.1 Add an intent classification layer that evaluates registry candidates and supports deterministic fallback when LLM classification is unavailable or invalid.
- [x] 2.2 Refactor `AssistantWorkflowPlanner` to use candidate generation + intent selection + plan/execute flow while preserving pending-plan confirmation semantics.

## 3. Canonical persistence and UI synchronization

- [x] 3.1 Introduce a canonical kanban snapshot load/save helper and reuse it from both `KanbanFormalService` and `PlanAndSolveAgentService`.
- [x] 3.2 Ensure successful structured agent executions broadcast renderer rehydration so kanban UI state updates after assistant-driven mutations.

## 4. Validation and regression coverage

- [x] 4.1 Add or update tests for registry loading, workspace-read behavior, multi-intent routing, deterministic fallback, and execution-state synchronization.
- [x] 4.2 Verify the change with project validation commands (`pnpm test`, `pnpm build`) and update task checkboxes to reflect completed work.