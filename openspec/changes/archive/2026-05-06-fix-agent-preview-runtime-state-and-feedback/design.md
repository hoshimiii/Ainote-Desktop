## Context

The preview runtime already stores pending tool calls and replays them on accept, but it treats multi-tool execution as a pure collection pass. That means write commands are accumulated for the final preview snapshot, while later tools still execute against the untouched original snapshot. Separately, accepted commit responses currently reuse preview summaries, and the renderer never clears historical preview actions after confirm/cancel.

## Goals / Non-Goals

**Goals:**
- Ensure later structured tool calls can observe earlier preview mutations during the same request.
- Keep final preview generation and accepted commit persistence semantics intact.
- Distinguish preview wording from committed-success wording.
- Remove stale preview controls from chat history after confirm/cancel.

**Non-Goals:**
- Do not change whether creating a workspace auto-activates it.
- Do not redesign the chat panel UI beyond clearing stale preview actions.
- Do not introduce new persistence stores or IPC endpoints.

## Decisions

1. **Sequential tool calls use an evolving preview snapshot**
   - `invokeAssistantToolCalls` will maintain a `currentSnapshot` that starts from the original snapshot.
   - After each tool returns write commands, the runtime will execute those commands on `currentSnapshot` to produce the snapshot seen by later tools in the same sequence.
   - The collected commands are still returned so the final preview/commit flow preserves explicit execution traces.
   - If a read-only current-workspace probe only reports “当前没有激活工作区。” while the same request also contains writes, that response is treated as orchestration noise and omitted from the user-facing aggregate output.

2. **Preview summary and commit summary are separate concerns**
   - Preview mode continues to use tool-authored response text.
   - Accept/commit mode generates the final user-facing message from verified execution details rather than reusing preview wording.

3. **Consumed preview actions are cleared in renderer history**
   - When the user sends a confirm/cancel utterance, the chat store clears `previewAction` from historical assistant messages before rendering the follow-up result.
   - This keeps history visually accurate without adding extra IPC coordination.

## Risks / Trade-offs

- [Risk] Executing write commands during tool sequencing and again for final preview could diverge if the two paths use different snapshots. -> Use the evolving preview snapshot only for intra-request visibility, while still generating the final preview from the original snapshot plus collected commands to preserve existing semantics.
- [Risk] Clearing all historical preview actions on confirm/cancel could also clear stale previews from older turns. -> This is acceptable because only one pending preview is supported at a time.
- [Risk] Commit messages built from execution details may be more verbose. -> Prefer concise “已提交：...” formatting and rely on the detailed plan list for full traceability.

## Migration Plan

1. Update runtime sequencing so mixed tool chains share preview state.
2. Update accept/commit messaging to use execution details.
3. Clear stale preview actions in the chat store for confirm/cancel inputs.
4. Add regression tests for the three failure modes.
