## 1. Query and list enhancements

- [x] 1.1 Extend planner list/query outputs to include entity IDs (workspace/mission/board/task/subtask/note).
- [x] 1.2 Add targeted query parsing for workspace id/name and similar ID-oriented lookups.

## 2. Rename and delete workflows

- [x] 2.1 Add rename intent parsing and command planning for supported entities.
- [x] 2.2 Add delete intent parsing and command planning for supported entities.
- [x] 2.3 Ensure confirmation/cancel flow works for rename/delete plans.

## 3. Knowledge-note workflows

- [x] 3.1 Add learning-note workflow planner that composes create/reuse + note rewrite + link commands.
- [x] 3.2 Add wrong-answer workflow planner with fixed 7-block note template.
- [x] 3.3 Integrate workflow dispatch into `planAssistantWorkflow` with safe fallbacks.

## 4. Tests and validation

- [x] 4.1 Add/extend `tests/assistantWorkflowPlanner.test.ts` for query + rename + delete + knowledge workflows.
- [x] 4.2 Verify all tests pass and build succeeds (`pnpm test`, `pnpm build`).