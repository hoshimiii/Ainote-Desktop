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

## Icon
Place `icon.ico` (256x256 minimum) in `resources/` directory before building.

## Shortcut
- **Shift+Alt+Space**: Toggle mini AI dialog
