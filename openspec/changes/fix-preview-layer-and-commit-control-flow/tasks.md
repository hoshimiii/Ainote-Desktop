## 1. Main-process preview resolution and response contracts

- [x] 1.1 Split structured assistant outputs into user-visible content and hidden internal trace metadata in the planner/runtime response types.
- [x] 1.2 Add a direct preview resolution path in main that accepts the active `pendingPreviewId`, commits or discards the pending preview, and returns deterministic handled responses when no preview or pending plan exists.
- [x] 1.3 Keep successful preview commits on the canonical kanban snapshot save + `store-rehydrate` path and return final user-facing commit/discard messages from main.

## 2. Renderer preview session and chat integration

- [x] 2.1 Extend the existing kanban store with a non-persistent preview session branch that holds the active preview metadata and `KanbanPersistedState` preview snapshot.
- [x] 2.2 Introduce an effective snapshot read path for kanban UI so same-store preview snapshots render immediately and fall back cleanly to canonical persisted state when no preview is active.
- [x] 2.3 Update chatbot preview handling so preview responses populate the preview store immediately, preview buttons trigger direct save/discard actions, and synthetic user "确认/取消" messages are no longer appended for button clicks.
- [x] 2.4 Preserve manual typed confirm/cancel as a fallback that resolves the active preview session directly or shows a deterministic explanatory message when nothing is pending.

## 3. Feedback polish and regression coverage

- [x] 3.1 Remove internal routing/clarification trace text from user-visible chat rendering while preserving any user-visible execution steps.
- [x] 3.2 Clear stale preview controls and preview session state after successful commit, discard, canonical rehydrate, or preview invalidation.
- [x] 3.3 Add or update automated tests for immediate preview rendering, direct preview resolution, deterministic confirm/cancel fallback, hidden internal traces, and canonical rehydrate after commit.
