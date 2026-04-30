## Context

The app has two IPC layers for chatbot config: (a) `store:get`/`store:set` — registered in the original `registerDbHandlers()`, always available; (b) `config:bot-get`/`config:bot-set` — added by `fix-chatbot-config-global-sync`, intended for future encrypted storage. The renderer currently uses `botConfig.set` (`config:bot-set`) as the primary write in `setConfig`, which fails during HMR because the handler is re-registered only after a full main-process restart.

The mini dialog is created once with `show: false` and shown/hidden on shortcut toggle. Its `useEffect([], [])` mount-only config fetch never re-runs, so changes made in the main window are invisible until app restart.

## Goals / Non-Goals

**Goals:**
- Make `setConfig` in `chatbot.ts` always succeed by routing through `store:set` (the reliable path).
- Make mini dialog config always reflect the latest saved config on every show.
- Keep `botConfig.set/get` registered and usable as a secondary / future encrypted path.

**Non-Goals:**
- Encrypting chatbot config (out of scope).
- Changing IPC handler registration order.
- Modifying any other store actions beyond `setConfig`.

## Decisions

### D1: `store.set('chatbot', …)` as primary write in `setConfig`
`store:set` is registered once at startup and never torn down during HMR. It is therefore the only guaranteed-available write endpoint. `botConfig.set` is kept as a fire-and-forget secondary (best-effort) for future encryption use. No throw on secondary failure.

Alternative considered: restart main process on HMR — rejected because it defeats the purpose of HMR and would regress DX.

### D2: Refresh mini dialog config on `window focus`
The mini dialog window gains focus each time it is shown (Electron raises it to the front). Listening to `'focus'` on `window` is the natural hook for "window became visible" without introducing any IPC message or custom protocol. Config is fetched via `store.get('chatbot')` (reliable path, same as D1 rationale).

Alternative considered: subscribe to a global config-changed event broadcast from main — rejected as over-engineered for a two-file fix.

### D3: Use `store.get('chatbot')` (not `botConfig.get`) in mini dialog
Consistent with D1 principle: avoid optional IPC endpoints in critical code paths.

## Risks / Trade-offs

- [`store.set` serializes to plain JSON in the DB — no encryption] → Acceptable for now; mirrors the existing behaviour before `fix-chatbot-config-global-sync`. Future encryption change can swap the primary path.
- [Focus event fires on first mount too (on Electron window focus)] → This is desirable: the initial config load is also handled by the focus event, removing the need for a separate mount-only effect. Verify timing is correct on cold start (config should be readable by the time the mini dialog is first focused).
- [If user opens mini dialog before saving any config, `store.get('chatbot')` returns null/undefined] → Existing null-guard in the store's `setConfig` / initial state handles this; no new risk introduced.
