## Context

The current assistant path is split across capability matching, plan generation, formal kanban command execution, snapshot persistence, and renderer rehydration. Prior changes introduced a registry and canonical snapshot store, but the path still has two practical failure modes: planner text/pattern corruption can make Chinese requests miss the intended tool, and natural-language success replies can be returned without enough proof that commands executed and persisted.

The repair must keep the existing `kanban:plan-solve` IPC boundary and `FormalKanbanCommand` model intact. This is a desktop app with local SQLite-backed settings persistence, so there is no schema or remote service migration involved.

## Goals / Non-Goals

**Goals:**
- Make every assistant write operation pass through an explicit `commandsToExecute` boundary before reporting success.
- Ensure successful command execution persists through `saveKanbanSnapshot()` and broadcasts renderer rehydration.
- Restore readable, valid Chinese intent patterns and extraction helpers so tool routing can actually match user requests.
- Add focused tests that prove commands run, pending confirmations run later, and failures are reported as failures.

**Non-Goals:**
- Do not replace the formal kanban command protocol.
- Do not introduce dynamic plugin discovery or a new agent runtime.
- Do not add database tables or change renderer IPC contracts.
- Do not broaden the assistant into arbitrary SQL or unrestricted filesystem tooling.

## Decisions

1. **Use command execution as the success boundary**
   - A write-capable tool is successful only after `executePlannedCommands()` returns success and the resulting snapshot is saved.
   - Alternatives considered: trusting planner responses or tool labels. Those are insufficient because they reproduce the current false-positive behavior.

2. **Keep deterministic registry routing, but fix corrupted match/extract helpers**
   - The registry remains explicit and testable.
   - Chinese regex constants and template-string responses must be restored to valid UTF-8 so requests like creating a workspace or asking for current workspace ID can be matched without relying on LLM classification.

3. **Keep persistence centralized**
   - `PlanAndSolveAgentService` will continue to call `saveKanbanSnapshot()` unless a test dependency overrides it.
   - This avoids a second persistence path and keeps renderer refresh behavior shared with formal kanban execution.

4. **Validate through behavior-level tests**
   - Tests should verify visible state changes in snapshots and failure responses rather than string-only claims that a tool was used.
   - This keeps the repair robust even if response phrasing changes later.

## Risks / Trade-offs

- [Risk] Restoring corrupted Chinese strings can touch many planner helper lines. -> Keep edits limited to planner/tool/workflow files and prefer tests around behavior.
- [Risk] Confirmation-gated writes can still look like no-op until the user confirms. -> Tests and responses must distinguish pending plans from executed plans.
- [Risk] Existing dirty changes in OpenSpec and packaging files are unrelated. -> Do not revert or normalize unrelated files.
