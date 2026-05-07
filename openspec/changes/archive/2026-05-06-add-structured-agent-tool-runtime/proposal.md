## Why

Structured workflow currently behaves like a deterministic planner that directly calls descriptor `plan()` functions. It has a registry-shaped data structure, but it does not expose a clear tool-call function or tool node boundary, so it is difficult to prove where a tool was selected, invoked, and converted into executable formal commands.

## What Changes

- Add an explicit structured assistant tool runtime in the main process.
- Provide a tool registry function that returns callable tool/workflow descriptors by ID.
- Provide a tool invocation function that calls one registered tool and returns the resulting plan, pending plan, or executable commands.
- Provide a tool-node orchestration function that selects candidate tools, resolves intent ordering, invokes tools, and returns traceable execution metadata.
- Refactor `AssistantWorkflowPlanner` to delegate candidate/tool execution to the runtime node.

## Capabilities

### New Capabilities

### Modified Capabilities
- `assistant-tool-execution`: Structured mode gains an explicit tool registry, invocation function, and tool-node boundary before formal command execution.

## Impact

- Affected code: `src/main/services/AssistantWorkflowPlanner.ts`, `src/main/services/AssistantPlannerModels.ts`, new assistant tool runtime module, and assistant tests.
- No renderer API, IPC channel, database schema, or dependency change is required.
- This does not introduce a full MCP server or LangGraph dependency; it creates the equivalent local runtime boundary first.
