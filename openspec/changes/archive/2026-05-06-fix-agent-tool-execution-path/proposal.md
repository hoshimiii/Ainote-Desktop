## Why

The assistant can currently produce responses that imply a tool ran, while the actual kanban mutation may not execute, persist, or rehydrate back into the renderer. This needs a focused repair because agent tool invocation must be observable at the command execution boundary, not inferred from natural-language replies.

## What Changes

- Add a contract for assistant tool execution that requires planned write tools to emit executable formal commands or explicitly ask for clarification.
- Repair the tool-call path so successful agent write operations execute through `executeFormalKanbanCommand`, persist through the canonical kanban snapshot store, and broadcast renderer rehydration.
- Repair corrupted planner strings and extraction patterns that can prevent Chinese commands from matching, extracting arguments, or reporting execution status correctly.
- Add regression coverage for direct execution, confirmation-gated execution, failed execution reporting, and no-op read tools.

## Capabilities

### New Capabilities
- `assistant-tool-execution`: Covers the assistant's planned tool invocation, execution confirmation, persistence, and observable result reporting.

### Modified Capabilities

## Impact

- Affected code: `src/main/services/PlanAndSolveAgentService.ts`, `src/main/services/AssistantWorkflowPlanner.ts`, `src/main/services/AssistantPlannerShared.ts`, `src/main/services/tools/*`, `src/main/services/workflows/*`, and related tests.
- Affected IPC path: `kanban:plan-solve` continues to call `runPlanAndSolveAgent`; no renderer API change is intended.
- Dependencies and database schema remain unchanged.
