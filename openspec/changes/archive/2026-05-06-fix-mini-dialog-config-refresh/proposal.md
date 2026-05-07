## Why

Two related bugs degrade reliability of AI config persistence: (1) `setConfig` in `chatbot.ts` uses `botConfig.set` (IPC `config:bot-set`) as its primary write path, but during `pnpm dev` HMR the new renderer fires before the main process re-registers that handler, causing a hard failure in a critical save path; (2) the mini dialog loads config only once on mount, so API key changes made in the main window are never picked up until the app restarts.

## What Changes

- **`src/renderer/store/chatbot.ts` `setConfig`**: Replace `botConfig.set` fire-and-forget with an immediate `store.set('chatbot', ...)` flush as the primary write. Retain `botConfig.set` as a best-effort secondary write for future encrypted storage.
- **`src/renderer/pages/MiniDialog.tsx`**: Replace mount-only `botConfig.get` with a `store.get('chatbot')` call that also re-runs on `window focus` so config is always fresh when the mini dialog is shown.

## Capabilities

### New Capabilities

- `mini-dialog-config-refresh`: Mini dialog refreshes its AI config from reliable storage every time it receives focus.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- **`src/renderer/store/chatbot.ts`**: `setConfig` write path changes; `store.set` becomes primary.
- **`src/renderer/pages/MiniDialog.tsx`**: Config load logic changes; adds focus event listener.
- **`src/preload/index.ts` / IPC**: No changes — `store:set` and `store:get` are already registered and exposed.
- No schema, API, or dependency changes.
