## ADDED Requirements

### Requirement: Bot config immediate persistence
The system SHALL persist LLM bot configuration (API key, base URL, model name) to a dedicated SQLite key `config:bot` immediately whenever the user saves configuration, bypassing the Zustand debounce path used for full chatbot state.

#### Scenario: Config saved in main window is immediately readable
- **WHEN** the user saves AI config in the main window
- **THEN** a subsequent `config:bot-get` IPC call in any window SHALL return the updated config without waiting for the Zustand debounce to fire

#### Scenario: API key encrypted at rest
- **WHEN** `config:bot-set` is called with a non-empty `usertoken`
- **THEN** the main process SHALL encrypt the value using `electron.safeStorage` before writing to SQLite, and decrypt it on `config:bot-get`

#### Scenario: Encryption unavailable fallback
- **WHEN** `electron.safeStorage.isEncryptionAvailable()` returns false
- **THEN** the main process SHALL store and return `usertoken` as plaintext and log a warning

### Requirement: Mini dialog config hydration via dedicated IPC
The mini dialog window SHALL load bot configuration via `window.electronAPI.botConfig.get()` on mount, independently of the Zustand `store:chatbot` hydration, so it always receives the most recently persisted config.

#### Scenario: Mini dialog opened shortly after config save
- **WHEN** the user saves API config in the main window and opens the mini dialog within 2 seconds
- **THEN** the mini dialog SHALL use the newly saved config (no 401 error due to stale state)

#### Scenario: No dedicated config key exists yet (first run)
- **WHEN** `config:bot-get` is called and `config:bot` does not exist in SQLite
- **THEN** the main process SHALL attempt a one-time back-fill from `store:chatbot`, return the result, and write it to `config:bot`

### Requirement: 401 error user hint
When an LLM stream call fails with an authentication error (HTTP 401 or "Incorrect API key" in the error message), the error message shown to the user SHALL include a hint to verify the API key in Settings.

#### Scenario: 401 error message includes settings hint
- **WHEN** the LLM stream returns a 401 error or an "Incorrect API key" message
- **THEN** the displayed error SHALL contain text directing the user to check Settings → AI Config

### Requirement: Preload bridge for bot config
The preload script SHALL expose `window.electronAPI.botConfig.get()` and `window.electronAPI.botConfig.set(config)` as the IPC bridge for the `config:bot-get` and `config:bot-set` main-process handlers respectively.

#### Scenario: Renderer can read config via preload
- **WHEN** renderer code calls `window.electronAPI.botConfig.get()`
- **THEN** it SHALL receive the decrypted bot config object (or null if not set)

#### Scenario: Renderer can write config via preload
- **WHEN** renderer code calls `window.electronAPI.botConfig.set(config)`
- **THEN** the main process SHALL persist the config to `config:bot` with `usertoken` encrypted
