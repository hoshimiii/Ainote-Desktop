## Why

Windows packaging currently fails when a previously built `release\win-unpacked\AiNote.exe` is still running. `electron-builder` clears the output directory before packaging, so a locked executable stops the build with `Access is denied`.

## What Changes

- Add a Windows pre-package cleanup step that stops only AiNote processes running from this repository's `release\win-unpacked` output.
- Route the Windows Electron package script through that cleanup step before invoking `electron-builder --win`.
- Document the failure mode and the manual fallback command.

## Capabilities

### New Capabilities
- `packaging-workflow`: Defines local packaging behavior and safeguards for repeatable Electron builds.

### Modified Capabilities

None.

## Impact

- Affects `package.json` scripts used for Windows packaging.
- Adds a small repository-local build utility script.
- Reduces manual process cleanup while avoiding broad process termination.
