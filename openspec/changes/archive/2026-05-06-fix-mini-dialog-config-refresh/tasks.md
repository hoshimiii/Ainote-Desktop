## 1. Fix `setConfig` write path in `chatbot.ts`

- [x] 1.1 In `src/renderer/store/chatbot.ts` `setConfig`: add an immediate `window.electronAPI.store.set('chatbot', serialized)` call as the primary persistence write.
- [x] 1.2 Retain the existing `window.electronAPI.botConfig.set(newConfig)` call as a best-effort secondary (fire-and-forget, no error throw on failure).

## 2. Fix mini dialog config refresh in `MiniDialog.tsx`

- [x] 2.1 In `src/renderer/pages/MiniDialog.tsx`: replace the mount-only `botConfig.get` effect with a `refreshConfig` function that reads from `window.electronAPI.store.get('chatbot')`.
- [x] 2.2 Register `refreshConfig` as a `window focus` event listener (add/remove in a `useEffect` cleanup) so config reloads each time the mini dialog window is shown.
