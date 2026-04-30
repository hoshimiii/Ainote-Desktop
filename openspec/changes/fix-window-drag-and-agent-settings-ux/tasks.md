## 1. Shared titlebar drag hit area

- [x] 1.1 Refine the shared `WindowTitlebar` layout so frameless pages expose a larger dedicated drag region along the visible top edge without relying on narrow leftover gaps.
- [x] 1.2 Verify and adjust the pages that reuse the shared titlebar (`WorkPage`, login/workspace surfaces, and related styles) so interactive controls remain `no-drag` while the surrounding chrome stays easy to drag.

## 2. AI assistant settings actions and persistence

- [x] 2.1 Rework `AgentSettingsPanel` modal sizing and footer/action layout so “测试连接” and “保存” remain visible and reachable in common desktop viewport heights.
- [x] 2.2 Ensure connection validation uses the current unsaved draft values from the form and presents clear inline feedback for success or failure.
- [x] 2.3 Harden the save flow so edited AI assistant settings persist reliably, reopen with the saved values, and still surface shortcut-registration partial failures without discarding the AI profile.

## 3. Outside-click dismissal and regression coverage

- [x] 3.1 Implement pointer-release-based backdrop dismissal for `AgentSettingsPanel`, closing only when the interaction ends outside the card and never on pointer-down.
- [x] 3.2 Add focused regression coverage or runtime validation for titlebar drag hit area behavior, settings action visibility, save persistence, and backdrop-dismiss semantics.
