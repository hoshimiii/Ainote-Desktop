## 1. Shared Types

- [x] 1.1 Add `BotConfig` interface (or reuse existing) and `ElectronAPI.botConfig` namespace (`get`, `set`) to `src/shared/types.ts`

## 2. Main Process — IPC Handlers

- [x] 2.1 Add `config:bot-set` IPC handler in `src/main/ipc/index.ts`: accepts `BotConfig`, encrypts `usertoken` via `safeStorage` (plaintext fallback when `isEncryptionAvailable()` is false), writes to `settingsDao` under key `config:bot`
- [x] 2.2 Add `config:bot-get` IPC handler in `src/main/ipc/index.ts`: reads `config:bot` from `settingsDao`, decrypts `usertoken`, returns the config object (or null)
- [x] 2.3 Add one-time back-fill logic: if `config:bot` is absent on `config:bot-get`, attempt to read `store:chatbot` blob and migrate the config slice to `config:bot`

## 3. Preload Bridge

- [x] 3.1 Expose `window.electronAPI.botConfig.get()` in `src/preload/index.ts` wired to `ipcRenderer.invoke('config:bot-get')`
- [x] 3.2 Expose `window.electronAPI.botConfig.set(config)` in `src/preload/index.ts` wired to `ipcRenderer.invoke('config:bot-set', config)`

## 4. Renderer — Chatbot Store

- [x] 4.1 In `src/renderer/store/chatbot.ts` `setConfig` action, add a fire-and-forget call to `window.electronAPI.botConfig.set(newConfig)` immediately after updating Zustand state

## 5. Mini Dialog Hydration

- [x] 5.1 In `src/renderer/pages/MiniDialog.tsx`, add a `useEffect` on mount that calls `window.electronAPI.botConfig.get()` and merges the result into the chatbot store config slice, overriding stale values from the full state blob hydration

## 6. Error Message Improvement

- [x] 6.1 In the LLM stream error handler (locate in `src/renderer/store/chatbot.ts` or the stream utility), detect HTTP 401 or "Incorrect API key" in the error and append a user hint: e.g., "Please check your API key in Settings → AI Config."

## 7. Tests

- [x] 7.1 Add unit test in `tests/` for `config:bot-set` encryption path: verify that `usertoken` is not stored in plaintext when `safeStorage` is available
- [x] 7.2 Add unit test for `config:bot-get` back-fill: verify that an absent `config:bot` key triggers a read from `store:chatbot` and writes back to `config:bot`
- [x] 7.3 Add unit test for `setConfig` dual-write: verify that calling `setConfig` invokes `botConfig.set` with the updated config
