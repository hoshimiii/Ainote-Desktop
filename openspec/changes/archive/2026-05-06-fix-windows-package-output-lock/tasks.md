## 1. Build Cleanup Utility

- [x] 1.1 Add a repository-local script that terminates only running `release\win-unpacked\AiNote.exe` processes on Windows.
- [x] 1.2 Make the script a no-op on non-Windows platforms.

## 2. Packaging Integration

- [x] 2.1 Update the Windows Electron packaging script to run the cleanup utility before `electron-builder --win`.
- [x] 2.2 Document the locked-executable failure mode and manual fallback.
- [x] 2.3 Disable code-signing identity auto-discovery for local Windows packages.

## 3. Verification

- [x] 3.1 Verify the cleanup utility detects the currently running unpacked AiNote processes.
- [x] 3.2 Verify the build still compiles after the packaging script change.
