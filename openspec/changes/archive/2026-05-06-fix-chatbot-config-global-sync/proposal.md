## Why

The chatbot LLM config (API key, base URL, model) is persisted inside the full `store:chatbot` SQLite blob with a 1000ms debounce, so the mini dialog window and the main process can read stale or empty config — causing 401 errors. API keys are also stored in plaintext.

## What Changes

- Introduce a dedicated `config:bot` SQLite key written **immediately** (no debounce) on every config change.
- Add IPC handlers `config:bot-get` and `config:bot-set` in the main process.
- Expose `window.electronAPI.botConfig.get()` / `.set()` in the preload bridge.
- Update `chatbot.ts` `setConfig` to eagerly persist via the new endpoint in addition to the Zustand debounce path.
- Update the mini dialog to hydrate LLM config via `botConfig.get()` on mount, bypassing the Zustand hydration race.
- Encrypt the `usertoken` field using `electron.safeStorage` (DPAPI / Keychain / libsecret); fall back to plaintext when `safeStorage.isEncryptionAvailable()` is false.
- Improve the 401 error message shown to the user to suggest checking Settings → AI config.

## Capabilities

### New Capabilities

- `bot-config-sync`: Dedicated immediate-write persistence and IPC bridge for LLM bot configuration, consumed by both the main window and the mini dialog.

### Modified Capabilities

<!-- No existing spec-level requirement changes -->

## Impact

- **`src/main/ipc/index.ts`** — new `config:bot-get` / `config:bot-set` IPC handlers using `settingsDao` + `safeStorage`.
- **`src/preload/index.ts`** — new `botConfig` namespace with `get` / `set`.
- **`src/renderer/store/chatbot.ts`** — `setConfig` calls `botConfig.set()` immediately.
- **`src/renderer/pages/MiniDialog.tsx`** — loads config via `botConfig.get()` on mount.
- **`src/shared/types.ts`** — extend `ElectronAPI` with `botConfig` namespace.
- No new npm dependencies (Node.js `crypto` and Electron `safeStorage` are already available).
