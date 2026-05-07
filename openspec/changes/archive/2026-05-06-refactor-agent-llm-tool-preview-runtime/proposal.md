## Why

The current structured agent still depends on keyword matching before LLM routing and regex extraction inside each tool. This makes tool invocation brittle and prevents the app from showing a safe preview of proposed state changes before committing them to the real kanban snapshot.

## What Changes

- Refactor structured agent routing to use LLM-first intent recognition and argument extraction before tool invocation.
- Replace keyword-first `match()` routing as the primary path with registered tool definitions that expose schema, description, and executable handlers.
- Add a snapshot preview flow: assistant write tools execute against a temporary snapshot first, return a preview result, and wait for user accept/cancel before real persistence.
- Store pending preview state as structured tool calls plus arguments, not stale formal commands.
- On accept, reload the latest snapshot, re-run the tool call validation/execution, persist the resulting snapshot, and broadcast renderer rehydration.
- On cancel, discard the pending preview without changing persisted kanban state.

## Capabilities

### New Capabilities

### Modified Capabilities
- `assistant-tool-execution`: Tool invocation becomes LLM-first and supports preview/accept/cancel before committed writes.

## Impact

- Affected code: assistant planner/runtime models, tool definitions under `src/main/services/tools`, workflow definitions, `PlanAndSolveAgentService`, renderer chatbot display/interaction state, and tests.
- Existing `kanban:plan-solve` IPC can remain, but response payload must include preview metadata.
- No database schema change is required; pending preview can continue using settings persistence.
- No MCP server or LangGraph dependency is required for the first implementation; the local runtime should be structured so it can later be wrapped as an MCP service or LangGraph node.
