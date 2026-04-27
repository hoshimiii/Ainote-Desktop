# AiNote Desktop - Build Notes

## Prerequisites
- Node.js 20+, pnpm 10+
- Windows: Visual Studio Build Tools (for better-sqlite3 native compilation)
- Run `pnpm rebuild better-sqlite3 --force` after install if needed

## Development
```bash
pnpm dev
```

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
