## Context

The chatbot store persists its entire state (messages, config, UI flags) to SQLite under the key `store:chatbot` via a Zustand middleware with a **1000 ms debounce**. The mini dialog is a separate `BrowserWindow` that hydrates its own Zustand store instance by reading that same key on mount. Because the debounce fires after the write, if the user saves API config in the main window and opens the mini dialog within ~1 second, the mini dialog reads stale or empty config and every LLM call fails with a 401.

The main process has no independent access to the LLM config at all — it only receives it as part of IPC payloads from the renderer. API keys are stored plaintext in SQLite.

## Goals / Non-Goals

**Goals:**
- Config changes are persisted to SQLite **immediately** (synchronously from the renderer's perspective) so no window can ever read a stale value.
- The mini dialog loads config independently via the dedicated IPC path, bypassing Zustand hydration.
- The `usertoken` (API key) is encrypted at rest using `electron.safeStorage`; other config fields remain plaintext.
- The 401 error surface includes a user-friendly hint to open Settings → AI Config.

**Non-Goals:**
- Replacing the existing `store:chatbot` debounce path for non-config state (messages, UI flags).
- Syncing config changes in real-time across already-open windows (push notifications).
- Supporting multi-account or per-mission LLM config.

## Decisions

### D1 — Separate SQLite key `config:bot`
Storing config under its own key (`config:bot`) via `settingsDao` allows instant reads/writes without touching the full chatbot state blob. The alternative (flushing the entire Zustand state synchronously) would break the debounce design and cause excessive writes on every keystroke.

### D2 — IPC over direct file reads
The mini dialog can already call `window.electronAPI.*` endpoints. Adding `config:bot-get` / `config:bot-set` is consistent with the existing IPC architecture (settingsDao is main-process only) and avoids duplicating SQLite logic in the renderer.

### D3 — `safeStorage` with plaintext fallback
`electron.safeStorage` provides OS-level encryption (DPAPI on Windows, Keychain on macOS, libsecret on Linux). We only encrypt `usertoken`; other fields (baseurl, model) are not secrets. If `isEncryptionAvailable()` returns false (e.g., CI or headless Linux), we fall back to plaintext and log a warning — this prevents a hard failure on non-desktop environments.

### D4 — Dual-write in `setConfig` (not replace)
`chatbot.ts` continues to write the full state blob via the existing debounce for compatibility. `setConfig` additionally calls `botConfig.set()` synchronously (fire-and-forget IPC) so the dedicated key is always up-to-date. This avoids a migration script and keeps the existing state structure intact.

### D5 — Mini dialog reads `botConfig.get()` on mount
The mini dialog already calls `window.electronAPI.store.get('chatbot')` on mount. We add a parallel call to `botConfig.get()` whose result is merged into the config slice, overriding any stale value from the full state blob.

## Risks / Trade-offs

- **[Risk] `safeStorage` key changes between OS user sessions** → Mitigation: this is expected behavior for DPAPI/Keychain; the encrypted token is only valid for the same OS user, which is acceptable for a local desktop app.
- **[Risk] `config:bot` and `store:chatbot` diverge** → Mitigation: `setConfig` is the single mutation point in the renderer; both writes happen there. A future refactor can remove the blob path once all windows use the dedicated key.
- **[Risk] IPC `config:bot-set` called before SQLite is ready** → Mitigation: `settingsDao` is initialized before the main window is shown; mini dialog is only reachable via tray/shortcut, well after init.
- **[Trade-off] Fire-and-forget IPC** — `botConfig.set()` is not awaited in the UI path to keep the save action non-blocking. If the write fails (disk full), the user won't see an error. This is acceptable; the existing debounce path has the same limitation.

## Migration Plan

1. On first `config:bot-set` call, main process writes `config:bot` to SQLite for the first time (no explicit migration needed for existing installs; mini dialog falls back to the blob path if key is absent).
2. No rollback concerns — the change is additive; the existing `store:chatbot` blob continues to exist and is written as before.

## Open Questions

- Should we proactively back-fill `config:bot` on app start from `store:chatbot` if the key doesn't exist yet? (Simplifies first-run for existing users who already have a configured key.) → Recommend: yes, add a one-time migration in the main process `app.on('ready')` block.
