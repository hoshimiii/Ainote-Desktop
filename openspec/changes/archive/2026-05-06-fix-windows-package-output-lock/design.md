## Context

`electron-builder` removes and recreates `release\win-unpacked` during Windows packaging. When a developer launches `release\win-unpacked\AiNote.exe` to test the package and then runs packaging again, Windows keeps the executable locked while it is running. The build then fails before a new package can be produced.

## Goals / Non-Goals

**Goals:**
- Make repeated local Windows packaging resilient when the previous unpacked app is still running.
- Terminate only processes whose executable path is inside this repository's `release\win-unpacked` directory.
- Keep the cleanup step easy to run manually and easy to understand from build logs.

**Non-Goals:**
- Do not terminate installed production copies of AiNote outside this repository.
- Do not change Electron runtime behavior, database behavior, or installer configuration.
- Do not add a new third-party dependency.

## Decisions

1. Add a small Node.js pre-package script.
   - Rationale: Node is already required for the build, and the script can compute repository-relative paths reliably.
   - Alternative considered: inline PowerShell in `package.json`; rejected because it is harder to quote and maintain.

2. Use PowerShell process discovery only on Windows.
   - Rationale: the failure is Windows-specific and requires checking executable paths.
   - Alternative considered: `taskkill /IM AiNote.exe`; rejected because it can kill installed or unrelated AiNote processes.

3. Keep non-Windows behavior as a no-op.
   - Rationale: current `build:electron` targets Windows, but the helper should not break on other platforms.

4. Disable code-signing identity auto-discovery for the local Windows package script.
   - Rationale: unsigned local builds do not need certificate discovery, and `electron-builder`'s Windows code-signing helper can fail on machines without symbolic-link privileges.
   - Alternative considered: require Developer Mode or Administrator shells; rejected because local unsigned packaging should work without changing machine-wide policy.

## Risks / Trade-offs

- A process may ignore termination or exit slowly -> the script waits briefly and fails with a clear message if the file remains locked.
- PowerShell output can vary by locale -> the script uses JSON output to avoid text parsing.
- A developer might have unsaved state in the unpacked app -> the script is scoped only to repository build output and runs before packaging, where replacing that executable is expected.
- Release signing still needs a separate signed publishing workflow -> the local script only disables automatic signing discovery for repeatable local Windows packages.
