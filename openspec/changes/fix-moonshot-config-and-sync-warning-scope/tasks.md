## 1. Assistant provider/base URL consistency

- [x] 1.1 Update assistant configuration normalization so provider-specific presets derive the correct default base URL instead of always falling back to OpenAI.
- [x] 1.2 Adjust AI settings save/reopen and test-connection flows so Moonshot/Kimi and other presets use the same effective provider/base URL configuration.
- [x] 1.3 Add focused regression coverage for provider-aware normalization and the Moonshot-effective endpoint path.

## 2. Cloud sync feedback scope

- [x] 2.1 Remove transient recovery yellow banners from the main workspace and workspace-selection pages.
- [x] 2.2 Surface the transient recovery warning inside `CloudSyncPanel` with dismiss behavior tied to the existing store state.

## 3. Validation

- [x] 3.1 Add or update regression coverage for the sync warning display scope.
- [x] 3.2 Run the relevant automated validation and confirm the change builds cleanly.
