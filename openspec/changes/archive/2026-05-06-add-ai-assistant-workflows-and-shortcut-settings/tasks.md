## 1. Assistant profile and provider robustness

- [x] 1.1 Extend the shared chatbot configuration/types so the main chat window and mini dialog can persist workflow-aware assistant profile fields beyond raw model credentials.
- [x] 1.2 Update the AI settings UI to edit and save the new assistant profile fields, including clearer provider/base URL guidance and shortcut-related entry points where appropriate.
- [x] 1.3 Harden the LLM request path so OpenAI-compatible Base URLs are normalized before `/chat/completions` requests, and surface actionable diagnostics for configuration failures.

## 2. Structured assistant workflow execution

- [x] 2.1 Refactor the current plan-and-solve path into a workflow-aware orchestration layer that can inspect kanban context and prepare structured actions.
- [x] 2.2 Add the query and execution plumbing needed for the assistant to reuse or create workspace / mission / board / task / subtask / note / link entities through the formal kanban boundary.
- [x] 2.3 Update chat response handling so workflow plans, confirmation behavior, and executed results are presented consistently across the shared AI experience.

## 3. Mini dialog shortcut settings and validation

- [x] 3.1 Add persisted mini dialog shortcut settings for enable/disable and custom accelerator values, with safe defaults for existing users.
- [x] 3.2 Update the Electron main process and tray integration to register/unregister the effective shortcut dynamically and report registration failures back to the renderer.
- [x] 3.3 Add or update focused tests for assistant profile persistence, endpoint normalization, workflow orchestration behavior, and mini dialog shortcut registration/configuration.