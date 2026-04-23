import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase, settingsDao } from './database'
import { registerDbHandlers, registerAppHandlers, registerLlmHandlers, registerCodeHandlers, registerSyncHandlers, registerAuthHandlers, registerKanbanFormalHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null
let miniDialogWindow: BrowserWindow | null = null
let tray: Tray | null = null

const isDev = !app.isPackaged

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// --- Window State Persistence (SQLite-backed) ---
interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

function getWindowState(): WindowState {
  try {
    const raw = settingsDao.get('windowState')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { width: 1280, height: 800, isMaximized: false }
}

function saveWindowState(): void {
  if (!mainWindow) return
  const isMaximized = mainWindow.isMaximized()
  const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds()
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
  }
  try {
    settingsDao.set('windowState', JSON.stringify(state))
  } catch {}
}

// --- Mini Dialog Window (Claude Desktop style) ---
function createMiniDialog(): void {
  miniDialogWindow = new BrowserWindow({
    width: 480,
    height: 320,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (isDev) {
    miniDialogWindow.loadURL('http://localhost:5173/#/mini-dialog')
  } else {
    miniDialogWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/mini-dialog',
    })
  }

  miniDialogWindow.on('blur', () => {
    miniDialogWindow?.hide()
  })

  miniDialogWindow.on('closed', () => {
    miniDialogWindow = null
  })
}

function toggleMiniDialog(): void {
  if (!miniDialogWindow) {
    createMiniDialog()
  }

  if (miniDialogWindow?.isVisible()) {
    miniDialogWindow.hide()
  } else {
    // Position near cursor / center of screen
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)
    const { width, height } = miniDialogWindow!.getBounds()

    // Center horizontally on cursor display, offset vertically
    const x = Math.round(display.bounds.x + (display.bounds.width - width) / 2)
    const y = Math.round(display.bounds.y + (display.bounds.height - height) / 2 - 100)

    miniDialogWindow!.setBounds({ x, y, width, height })
    miniDialogWindow!.show()
    miniDialogWindow!.focus()
  }
}

// --- System Tray ---
function createTray(): void {
  // Use a simple 16x16 icon (generated programmatically for dev; will use real icon in production)
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVQ4T2P8z8BQz0BAwMgwigEKBo0BowaMGjBgBgAAyqIH8bk3RXAAAAAASUVORK5CYII='
  ) : icon)
  tray.setToolTip('AiNote')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show AiNote', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Mini Dialog', accelerator: 'Shift+Alt+Space', click: () => toggleMiniDialog() },
    { type: 'separator' },
    { label: 'Quit', click: () => { saveWindowState(); app.quit() } },
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
    }
  })
}

// --- Create Main Window ---
function createMainWindow(): void {
  const state = getWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (state.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Save window state on move/resize/maximize
  mainWindow.on('resize', () => saveWindowState())
  mainWindow.on('move', () => saveWindowState())
  mainWindow.on('maximize', () => saveWindowState())
  mainWindow.on('unmaximize', () => saveWindowState())
}

// --- App Lifecycle ---
app.whenReady().then(() => {
  // Initialize database
  initDatabase()

  // Register IPC handlers
  registerDbHandlers()
  registerAppHandlers()
  registerLlmHandlers()
  registerCodeHandlers()
  registerSyncHandlers()
  registerAuthHandlers()
  registerKanbanFormalHandlers()

  createMainWindow()

  // --- System Tray ---
  createTray()

  // --- Mini Dialog (Shift+Alt+Space) ---
  createMiniDialog()
  globalShortcut.register('Shift+Alt+Space', () => {
    toggleMiniDialog()
  })

  // IPC toggle from renderer
  ipcMain.on('dialog:toggle', () => {
    toggleMiniDialog()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  closeDatabase()
})
