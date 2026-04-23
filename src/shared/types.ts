import type { ElectronAPI } from '../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// --- Kanban Types (matches existing Zustand store) ---

export interface SubTask {
  id: string
  title: string
  done: boolean
  noteId?: string
  blockId?: string
}

export interface Task {
  id: string
  title: string
  description: string
  subtasks: SubTask[]
  linkedNoteId?: string
}

export interface Board {
  id: string
  title: string
  taskIds: string[]
}

export interface Note {
  id: string
  title: string
  blocks: Block[]
}

export interface Block {
  id: string
  type: 'markdown' | 'code'
  content: string
  language?: string
  lastOutput?: string
  lastExitCode?: number | null
  linkedBoardId?: string
  linkedTaskId?: string
  linkedSubTaskId?: string
}

export interface Mission {
  id: string
  title: string
  boardIds: string[]
  noteIds: string[]
}

export interface WorkSpace {
  id: string
  name: string
  missionIds: string[]
}

// --- LLM Types ---

export interface LLMConfig {
  baseurl: string
  model: string
  usertoken: string
  temperature: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// --- Sync Types ---

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface SyncMeta {
  tableName: string
  recordId: string
  localUpdatedAt: number
  cloudUpdatedAt: number
  syncStatus: 'pending' | 'synced' | 'conflict'
}
