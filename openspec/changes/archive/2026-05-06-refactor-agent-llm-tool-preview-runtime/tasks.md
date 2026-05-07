## 1. Tool Call Models

- [x] 1.1 Add structured assistant tool definition, argument schema, tool call, preview result, and pending preview types.
- [x] 1.2 Extend planner/agent responses with preview metadata and accept/cancel state.

## 2. LLM-First Router

- [x] 2.1 Implement an LLM tool-call router that receives all registered tool definitions and compact kanban context.
- [x] 2.2 Keep deterministic keyword matching only as fallback when LLM routing is unavailable or invalid.
- [x] 2.3 Add tests proving no keyword match is required when LLM returns a valid tool call.

## 3. Tool Runtime Preview

- [x] 3.1 Add runtime support for invoking tools with structured args instead of raw text extraction.
- [x] 3.2 Execute write tool calls on cloned preview snapshots and persist pending preview state without writing `store:kanban`.
- [x] 3.3 Implement accept/cancel handling; accept replays tool calls on latest snapshot before saving.

## 4. First Tool Migration

- [x] 4.1 Migrate workspace read and simple create tools to structured args.
- [x] 4.2 Migrate rename/delete tools to structured args.
- [x] 4.3 Keep existing workflow tools operational through fallback until migrated.

## 5. Renderer Preview UX

- [x] 5.1 Display preview summary and accept/cancel controls in the chat panel.
- [x] 5.2 Ensure accepting commits and cancelling discards without accidental persistence.

## 6. Validation

- [x] 6.1 Add tests for LLM-first routing, preview creation, accept commit, cancel discard, and stale snapshot replay.
- [x] 6.2 Run focused assistant tests and project build.
