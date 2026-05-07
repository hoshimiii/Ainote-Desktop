## Context

The app already has assistant tool descriptors and formal kanban commands. The missing layer is a runtime boundary that treats these descriptors as callable tools instead of private planner branches. Without that boundary, structured mode is harder to debug: a response can include a plan, but there is no single function that says "tool X was invoked with context Y and returned commands Z".

The pragmatic fix is to introduce a local tool runtime in the Electron main process. MCP or LangGraph can be layered on later, but adding either dependency now would be larger than needed and would not remove the need for a local command execution boundary.

## Goals / Non-Goals

**Goals:**
- Expose explicit assistant tool registry and lookup functions.
- Expose `invokeAssistantTool()` as the single local tool-call function.
- Expose `runAssistantToolNode()` as the structured workflow node that performs candidate collection, intent ordering, and tool invocation.
- Return trace metadata so tests and future UI/debug panels can distinguish "selected", "invoked", "handled", and "commands emitted".

**Non-Goals:**
- Do not add network-facing MCP server support in this change.
- Do not add `@langchain/langgraph` or refactor the runtime into a graph dependency yet.
- Do not change the formal kanban command protocol.
- Do not change renderer IPC contracts.

## Decisions

1. **Build a local runtime node first**
   - This gives us the same debugging boundary needed by LangGraph's tool node without adding dependency and packaging risk.
   - Later, `runAssistantToolNode()` can be wrapped by a LangGraph node or exposed through MCP.

2. **Keep existing descriptors but make invocation explicit**
   - The current `AssistantCapabilityDescriptor.plan()` becomes the callable tool body for now.
   - This avoids rewriting all tools in one pass while still creating a real registry and invocation surface.

3. **Trace tool calls in planner responses**
   - Add optional `toolCalls` metadata to planner responses.
   - This metadata is internal/main-process-safe and does not change current renderer behavior.

## Risks / Trade-offs

- [Risk] The underlying tools still use natural-language parsing for arguments. -> This change isolates invocation first; argument schema extraction can be added next.
- [Risk] Adding trace metadata could leak into UI accidentally. -> Keep it optional and only append human-facing plan lines where existing behavior already does so.
