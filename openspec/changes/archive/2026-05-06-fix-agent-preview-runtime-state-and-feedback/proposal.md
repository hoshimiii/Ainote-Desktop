## Why

The current preview-based assistant runtime has three user-visible regressions around mixed tool calls and confirmation. In a single LLM-routed tool sequence, read tools still observe the original snapshot instead of the preview snapshot produced by earlier write tools. After a preview is accepted, the success response still reuses preview wording, which makes committed operations sound tentative. In the renderer chat history, old preview actions are not cleared after confirm/cancel, so users can still see stale “接受更改” controls and feel stuck in preview mode.

## What Changes

- Make sequential structured tool calls share an evolving preview snapshot so later read tools can observe earlier write-tool mutations in the same request.
- Suppress redundant read-only current-workspace misses when a mixed request already includes the write action the user actually cares about.
- Generate accepted-commit responses from committed execution results instead of reusing preview summaries.
- Clear stale preview actions from chat history after a preview is confirmed or cancelled.
- Add regression tests for mixed read/write tool chains, commit messaging, and preview-action cleanup.

## Capabilities

### New Capabilities

### Modified Capabilities
- `assistant-tool-execution`: Mixed tool-call previews become internally stateful, accepted commits report committed outcomes, and preview UI actions are cleared once consumed.

## Impact

- Affected code: `src/main/services/AssistantToolRuntime.ts`, `src/main/services/PlanAndSolveAgentService.ts`, `src/renderer/store/chatbot.ts`, related tests, and the assistant tool execution spec delta.
- No database schema change is required.
- Existing IPC contracts can remain unchanged.
