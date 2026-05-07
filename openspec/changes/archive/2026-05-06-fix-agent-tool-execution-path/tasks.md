## 1. Diagnosis

- [x] 1.1 Run the current assistant planner and agent service tests to capture failing behavior.
- [x] 1.2 Inspect the planner/tool/workflow files for broken match patterns, extraction helpers, and response formatting that can short-circuit execution.

## 2. Execution Path Repair

- [x] 2.1 Guard assistant system prompt construction so only the real structured tool path may claim executable formal tools.
- [x] 2.2 Force renderer LLM fallback to use a no-tool chat config after structured routing is unavailable or bypassed.
- [x] 2.3 Verify `PlanAndSolveAgentService` reports success only after command execution and snapshot persistence.

## 3. Regression Coverage

- [x] 3.1 Add tests for direct write execution, failure reporting, confirmation-gated execution, and read-only no-op behavior.
- [x] 3.2 Run focused assistant tests and project validation.
