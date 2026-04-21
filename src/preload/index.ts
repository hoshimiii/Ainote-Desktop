import { contextBridge, ipcRenderer } from 'electron'
import type { KanbanPersistedState } from '../shared/kanbanPersistence'

/**
 * Secure IPC API exposed to the renderer process via contextBridge.
 * All main-process functionality MUST be accessed through this bridge.
 */
const electronAPI = {
  db: {
    query: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:query', sql, params),
    mutate: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:mutate', sql, params),
    transaction: (operations: Array<{ sql: string; params?: unknown[] }>) =>
      ipcRenderer.invoke('db:transaction', operations),
  },

  sync: {
    push: () => ipcRenderer.invoke('sync:push'),
    pull: () => ipcRenderer.invoke('sync:pull'),
    status: () => ipcRenderer.invoke('sync:status'),
    cloudLogin: (email: string, password: string, baseUrl: string) =>
      ipcRenderer.invoke('sync:cloud-login', email, password, baseUrl),
    cloudLogout: () => ipcRenderer.invoke('sync:cloud-logout'),
    cloudStatus: () =>
      ipcRenderer.invoke('sync:cloud-status') as Promise<{
        connected: boolean
        email?: string
        baseUrl?: string
      }>,
    onStatusChange: (callback: (status: string) => void) => {
      const handler = (_event: unknown, status: string) => callback(status)
      ipcRenderer.on('sync:status-changed', handler)
      return () => {
        ipcRenderer.removeListener('sync:status-changed', handler)
      }
    },
    onTransientRecovery: (callback: (payload: { snapshot: KanbanPersistedState; message: string }) => void) => {
      const handler = (_event: unknown, payload: { snapshot: KanbanPersistedState; message: string }) => callback(payload)
      ipcRenderer.on('sync:transient-recovery', handler)
      return () => {
        ipcRenderer.removeListener('sync:transient-recovery', handler)
      }
    },
  },

  llm: {
    chat: (messages: Array<{ role: string; content: string }>, config?: Record<string, unknown>) =>
      ipcRenderer.invoke('llm:chat', messages, config),
    stream: (messages: Array<{ role: string; content: string }>, config?: Record<string, unknown>) => {
      ipcRenderer.send('llm:stream', messages, config)
    },
    onStreamToken: (callback: (token: string) => void) => {
      const handler = (_event: unknown, token: string) => callback(token)
      ipcRenderer.on('llm:stream-token', handler)
      return () => ipcRenderer.removeListener('llm:stream-token', handler)
    },
    onStreamEnd: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('llm:stream-end', handler)
      return () => ipcRenderer.removeListener('llm:stream-end', handler)
    },
    onStreamError: (callback: (error: string) => void) => {
      const handler = (_event: unknown, error: string) => callback(error)
      ipcRenderer.on('llm:stream-error', handler)
      return () => ipcRenderer.removeListener('llm:stream-error', handler)
    },
  },

  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
    quit: () => ipcRenderer.send('app:quit'),
    getVersion: () => ipcRenderer.invoke('app:version'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  },

  dialog: {
    toggle: () => ipcRenderer.send('dialog:toggle'),
  },

  store: {
    get: (storeName: string) =>
      ipcRenderer.invoke('store:get', storeName),
    set: (storeName: string, data: unknown) =>
      ipcRenderer.invoke('store:set', storeName, data),
    reset: (storeName: string) =>
      ipcRenderer.invoke('store:reset', storeName),
    onRehydrate: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('store-rehydrate', handler)
      return () => {
        ipcRenderer.removeListener('store-rehydrate', handler)
      }
    },
  },

  code: {
    execute: (code: string, language: string) =>
      ipcRenderer.invoke('code:execute', code, language) as Promise<{ stdout: string; stderr: string; exitCode: number }>,
    languages: () =>
      ipcRenderer.invoke('code:languages') as Promise<string[]>,
  },

  auth: {
    register: (username: string, password: string) =>
      ipcRenderer.invoke('auth:register', username, password),
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),
    currentUser: (userId: string) =>
      ipcRenderer.invoke('auth:current-user', userId),
    listUsers: () =>
      ipcRenderer.invoke('auth:list-users'),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
export type ElectronAPI = typeof electronAPI
