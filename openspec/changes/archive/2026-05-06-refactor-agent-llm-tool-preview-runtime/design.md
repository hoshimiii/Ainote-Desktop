## Context

The app now has a local tool runtime, but its primary routing still starts with `descriptor.match()` keyword filters. LLM classification only sorts candidates after keyword matching, and each tool still parses arguments from raw text using regex. The user wants a true agent workflow where LLM intent recognition chooses tools and extracts arguments first, then the app shows a preview of the changed interface before committing or cancelling the real change.

The current kanban state is already snapshot-based. That is useful: we can execute tool calls on a cloned preview snapshot, surface the preview to the renderer, and commit only after explicit user acceptance. The key is to store pending tool calls and args, not pending formal commands, so acceptance re-validates against the latest real snapshot.

## Goals / Non-Goals

**Goals:**
- Make LLM-first routing the primary structured workflow path.
- Define tools with schema-like argument definitions and executable handlers.
- Convert user input into structured `{ toolId, args }` calls before tool invocation.
- Execute write tools first against a preview snapshot and return preview metadata.
- Support accept/cancel of pending previews.
- Re-run accepted tool calls on the latest real snapshot before persistence.

**Non-Goals:**
- Do not expose a network-facing MCP server in this change.
- Do not add LangGraph as a dependency in this change.
- Do not let the LLM directly create or persist `FormalKanbanCommand` objects.
- Do not bypass confirmation for destructive writes.

## Decisions

1. **LLM-first routing over keyword-first routing**
   - The runtime will pass all registered tool definitions to the LLM router.
   - Existing keyword `match()` logic becomes optional hint/fallback, not a gate.
   - If the LLM is unavailable, deterministic fallback can still use keywords for basic compatibility.

2. **Structured tool calls, not raw-text parsing**
   - Tool definitions expose expected argument fields.
   - LLM returns tool calls such as `{ toolId: "create-task-note", args: { workspaceName, missionTitle, ... } }`.
   - Tool handlers validate args and resolve entity IDs from the current snapshot.

3. **Preview snapshot before commit**
   - For write tools, runtime clones the current snapshot and executes the tool plan against the clone.
   - The response includes a preview snapshot or preview diff plus a pending preview ID.
   - The renderer may display the preview state without writing `store:kanban`.

4. **Accept replays on latest snapshot**
   - Pending preview stores original input, tool calls, args, and summary.
   - On accept, runtime reloads latest persisted snapshot, re-validates args, regenerates formal commands, executes them, saves snapshot, and broadcasts rehydrate.
   - This avoids committing stale commands generated from an old snapshot.

5. **Cancel is discard-only**
   - Cancel clears the pending preview and does not touch persisted kanban state.

## Risks / Trade-offs

- [Risk] LLM argument extraction can be invalid or incomplete. -> Validate every arg and return clarification instead of executing.
- [Risk] Preview snapshot can drift from latest state before accept. -> Re-run accepted tool calls on the latest real snapshot.
- [Risk] Sending full snapshots to the LLM can be too large or leak unnecessary context. -> Send a compact context summary and selectable entity names/IDs only.
- [Risk] Renderer preview UI adds scope. -> Keep first UI as a preview state payload plus accept/cancel controls in the chat panel; richer visual diff can follow later.

## Migration Plan

1. Introduce tool definition and tool call models while keeping existing descriptors.
2. Implement LLM router returning structured tool calls and fallback to current matching when unavailable.
3. Port a narrow first set of tools (`workspace-read`, `simple-create`, `rename`, `delete`) to schema args.
4. Add preview pending state and accept/cancel handling.
5. Expand workflows after the core path is stable.
