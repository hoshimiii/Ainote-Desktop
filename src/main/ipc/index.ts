import { ipcMain, BrowserWindow, safeStorage } from 'electron'
import {
  getDatabase,
  workspaceDao,
  missionDao,
  boardDao,
  taskDao,
  subtaskDao,
  noteDao,
  noteBlockDao,
  conversationDao,
  messageDao,
  settingsDao,
  runTransaction,
} from '../database'
import {
  executeDesktopKanbanFormalCommand,
  listFormalToolContracts,
} from '../services/KanbanFormalService'
import { runPlanAndSolveAgent } from '../services/PlanAndSolveAgentService'

/** Register all database-related IPC handlers */
export function registerDbHandlers(): void {
  // Generic query (read-only)
  ipcMain.handle('db:query', (_event, sql: string, params?: unknown[]) => {
    const db = getDatabase()
    return db.prepare(sql).all(...(params ?? []))
  })

  // Generic mutate (write)
  ipcMain.handle('db:mutate', (_event, sql: string, params?: unknown[]) => {
    const db = getDatabase()
    const result = db.prepare(sql).run(...(params ?? []))
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid }
  })

  // Transaction batch
  ipcMain.handle(
    'db:transaction',
    (_event, operations: Array<{ sql: string; params?: unknown[] }>) => {
      const db = getDatabase()
      return db.transaction(() => {
        const results = operations.map((op) => {
          const stmt = db.prepare(op.sql)
          if (op.sql.trimStart().toUpperCase().startsWith('SELECT')) {
            return stmt.all(...(op.params ?? []))
          }
          return stmt.run(...(op.params ?? []))
        })
        return results
      })()
    },
  )

  // --- Store persistence (for Zustand SQLite middleware) ---
  ipcMain.handle('store:get', (_event, storeName: string) => {
    const value = settingsDao.get(`store:${storeName}`)
    return value ? JSON.parse(value) : null
  })

  ipcMain.handle('store:set', (_event, storeName: string, data: unknown) => {
    settingsDao.set(`store:${storeName}`, JSON.stringify(data))
  })

  ipcMain.handle('store:reset', (_event, storeName: string) => {
    settingsDao.delete(`store:${storeName}`)
    // Notify renderer to rehydrate (will load empty/default state)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('store-rehydrate')
    }
  })
}

/** Register app-level IPC handlers */
export function registerAppHandlers(): void {
  const { app } = require('electron')

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.on('app:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('app:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('app:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.on('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('app:isMaximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}

/** Register LLM-related IPC handlers */
export function registerLlmHandlers(): void {
  const { streamCompletion, completion } = require('../services/LLMService') as typeof import('../services/LLMService')

  // Non-streaming chat
  ipcMain.handle('llm:chat', async (_event, messages, config) => {
    return completion(messages, config)
  })

  // Streaming chat — sends tokens back via IPC events
  ipcMain.on('llm:stream', async (event, messages, config) => {
    try {
      for await (const token of streamCompletion(messages, config)) {
        event.sender.send('llm:stream-token', token)
      }
      event.sender.send('llm:stream-end')
    } catch (err) {
      event.sender.send('llm:stream-error', String(err instanceof Error ? err.message : err))
    }
  })
}

/** Register code execution IPC handlers */
export function registerCodeHandlers(): void {
  const { executeCode, supportedLanguages } = require('../services/CodeExecutor') as typeof import('../services/CodeExecutor')

  ipcMain.handle('code:execute', async (_event, code: string, language: string) => {
    return executeCode(code, language)
  })

  ipcMain.handle('code:languages', () => {
    return supportedLanguages()
  })
}

/** Register sync IPC handlers */
export function registerSyncHandlers(): void {
  const { pushToCloud, pullFromCloud, getSyncStatus, cloudLogin, cloudLogout, getCloudLoginStatus } = require('../services/SyncService') as typeof import('../services/SyncService')

  ipcMain.handle('sync:push', async () => pushToCloud())
  ipcMain.handle('sync:pull', async () => pullFromCloud())
  ipcMain.handle('sync:status', () => getSyncStatus())
  ipcMain.handle('sync:cloud-login', async (_event, email: string, password: string, baseUrl: string) =>
    cloudLogin(email, password, baseUrl),
  )
  ipcMain.handle('sync:cloud-logout', () => cloudLogout())
  ipcMain.handle('sync:cloud-status', async () => getCloudLoginStatus())
}

/** Register auth IPC handlers */
export function registerAuthHandlers(): void {
  const { register, login, getCurrentUser, listUsers } = require('../services/AuthService') as typeof import('../services/AuthService')

  ipcMain.handle('auth:register', (_event, username: string, password: string) => {
    return register(username, password)
  })

  ipcMain.handle('auth:login', (_event, username: string, password: string) => {
    return login(username, password)
  })

  ipcMain.handle('auth:current-user', (_event, userId: string) => {
    return getCurrentUser(userId)
  })

  ipcMain.handle('auth:list-users', () => {
    return listUsers()
  })
}

/** Register formal kanban service IPC handlers */
export function registerKanbanFormalHandlers(): void {
  ipcMain.handle('kanban:execute', (_event, command) => {
    return executeDesktopKanbanFormalCommand(command)
  })

  ipcMain.handle('kanban:contracts', () => {
    return listFormalToolContracts()
  })

  ipcMain.handle('kanban:plan-solve', async (_event, input: string, config) => {
    return runPlanAndSolveAgent(input, config)
  })
}

const BOT_CONFIG_KEY = 'config:bot'
const STORE_CHATBOT_KEY = 'store:chatbot'

/** Pure logic for config:bot-get — exported for unit testing */
export function getBotConfig(
  ss: { isEncryptionAvailable(): boolean; decryptString(buf: Buffer): string },
  daoGet: (key: string) => string | null | undefined,
  daoSet: (key: string, value: string) => void,
): Record<string, unknown> | null {
  const raw = daoGet(BOT_CONFIG_KEY)
  if (!raw) {
    // One-time back-fill from full chatbot blob
    const chatbotRaw = daoGet(STORE_CHATBOT_KEY)
    if (chatbotRaw) {
      try {
        const state = JSON.parse(chatbotRaw) as Record<string, unknown>
        if (state.config && typeof state.config === 'object') {
          const config = state.config as Record<string, unknown>
          daoSet(BOT_CONFIG_KEY, JSON.stringify(config))
          return config
        }
      } catch { /* ignore */ }
    }
    return null
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>
  if (parsed._tokenEncrypted && ss.isEncryptionAvailable()) {
    try {
      parsed.usertoken = ss.decryptString(Buffer.from(parsed.usertoken as string, 'base64'))
    } catch {
      parsed.usertoken = ''
    }
    delete parsed._tokenEncrypted
  }
  return parsed
}

/** Pure logic for config:bot-set — exported for unit testing */
export function setBotConfig(
  config: Record<string, unknown>,
  ss: { isEncryptionAvailable(): boolean; encryptString(str: string): Buffer },
  daoSet: (key: string, value: string) => void,
): void {
  const toStore: Record<string, unknown> = { ...config }
  if (typeof toStore.usertoken === 'string' && toStore.usertoken && ss.isEncryptionAvailable()) {
    toStore.usertoken = ss.encryptString(toStore.usertoken).toString('base64')
    toStore._tokenEncrypted = true
  }
  daoSet(BOT_CONFIG_KEY, JSON.stringify(toStore))
}

/** Register bot config IPC handlers */
export function registerBotConfigHandlers(): void {
  ipcMain.handle('config:bot-get', () =>
    getBotConfig(safeStorage, (k) => settingsDao.get(k), (k, v) => settingsDao.set(k, v)),
  )
  ipcMain.handle('config:bot-set', (_event, config: Record<string, unknown>) =>
    setBotConfig(config, safeStorage, (k, v) => settingsDao.set(k, v)),
  )
}
