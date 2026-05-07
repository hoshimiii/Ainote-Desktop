# AiNote Desktop - Build Notes

## Prerequisites
- Node.js 20 LTS（推荐，避免工具链在 Node 24 上的兼容性问题）, pnpm 10+
- Windows: Visual Studio Build Tools (for better-sqlite3 native compilation)
- Run `pnpm rebuild better-sqlite3 --force` after install if needed

## Development
```bash
pnpm dev
```

> `pnpm dev` now runs a native module rebuild first (`predev`), so `better-sqlite3` stays aligned with Electron ABI.

## Production Build
```bash
# First rebuild native modules for Electron
pnpm run rebuild

# Build & package
pnpm build:electron
```

On Windows, `pnpm build:electron` first runs:

```bash
pnpm run prepack:win
```

This stops only a running executable at:

```text
release\win-unpacked\AiNote.exe
```

That prevents this repeat-build error:

```text
remove release\win-unpacked\AiNote.exe: Access is denied
```

The default local Windows package script also disables executable resource
editing/signing discovery. This avoids local unsigned builds failing while
extracting `winCodeSign` helper files on machines without symbolic-link
privileges.

For formal release builds with full executable resource editing/signing, run in
an Administrator shell or enable Windows Developer Mode, then use:

```bash
pnpm run build:electron:signed
```

If you need to run the cleanup manually:

```bash
pnpm run prepack:win
```

## Local Data
The app stores SQLite data in Electron's `userData` directory, not inside the
packaged executable.

Development and packaged builds use separate directories:

```text
%APPDATA%\AiNote Dev\ainote.db
%APPDATA%\AiNote\ainote.db
```

`pnpm run rebuild` only rebuilds native Node modules such as `better-sqlite3`.
It does not reset, migrate, or replace local SQLite data.

## Icon
The Windows package uses `resources/icon.ico`.

The current icon is a notebook-style mark adapted from Lucide's `notebook-text`
icon. Lucide is ISC licensed and already used by this project through
`lucide-react`.

If you replace it later, keep the same paths so `electron-builder.yml` continues
to work:

```text
resources/icon.ico
resources/icon.svg
resources/icon.png
```

For macOS release builds, also provide:

```text
resources/icon.icns
```

## Shortcut
- **Shift+Alt+Space**: Toggle mini AI dialog
