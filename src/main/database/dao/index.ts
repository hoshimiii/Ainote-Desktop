import { BaseDao } from './BaseDao'
import { getDatabase } from '../init'

// --- Row Types ---

export interface WorkspaceRow {
  id: string
  name: string
  created_at: number
  updated_at: number
}

export interface MissionRow {
  id: string
  workspace_id: string
  title: string
  sort_order: number
  created_at: number
  updated_at: number
}

export interface BoardRow {
  id: string
  mission_id: string
  title: string
  sort_order: number
  created_at: number
  updated_at: number
}

export interface TaskRow {
  id: string
  board_id: string
  title: string
  description: string
  sort_order: number
  created_at: number
  updated_at: number
}

export interface SubTaskRow {
  id: string
  task_id: string
  title: string
  done: number // SQLite boolean
  note_id: string | null
  block_id: string | null
  sort_order: number
  created_at: number
  updated_at: number
}

export interface NoteRow {
  id: string
  mission_id: string | null
  title: string
  created_at: number
  updated_at: number
}

export interface NoteBlockRow {
  id: string
  note_id: string
  type: 'markdown' | 'code'
  content: string
  language: string | null
  last_output: string | null
  last_exit_code: number | null
  sort_order: number
  created_at: number
  updated_at: number
}

export interface ConversationRow {
  id: string
  title: string
  created_at: number
  updated_at: number
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: number
}

export interface SettingRow {
  key: string
  value: string
}

// --- DAO Instances ---

export const workspaceDao = new BaseDao<WorkspaceRow>('workspaces', ['id', 'name'])
export const missionDao = new BaseDao<MissionRow>('missions', ['id', 'workspace_id', 'title', 'sort_order'])
export const boardDao = new BaseDao<BoardRow>('boards', ['id', 'mission_id', 'title', 'sort_order'])
export const taskDao = new BaseDao<TaskRow>('tasks', ['id', 'board_id', 'title', 'description', 'sort_order'])
export const subtaskDao = new BaseDao<SubTaskRow>('subtasks', ['id', 'task_id', 'title', 'done', 'note_id', 'block_id', 'sort_order'])
export const noteDao = new BaseDao<NoteRow>('notes', ['id', 'mission_id', 'title'])
export const noteBlockDao = new BaseDao<NoteBlockRow>('note_blocks', ['id', 'note_id', 'type', 'content', 'language', 'last_output', 'last_exit_code', 'sort_order'])
export const conversationDao = new BaseDao<ConversationRow>('conversations', ['id', 'title'])
export const messageDao = new BaseDao<MessageRow>('messages', ['id', 'conversation_id', 'role', 'content'])

// --- Settings DAO (special: key-value, no id) ---

export const settingsDao = {
  get(key: string): string | undefined {
    const db = getDatabase()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingRow | undefined
    return row?.value
  },
  set(key: string, value: string): void {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  },
  getAll(): SettingRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM settings').all() as SettingRow[]
  },
  delete(key: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  },
}

// --- Transaction Helper ---

export function runTransaction<T>(fn: () => T): T {
  const db = getDatabase()
  return db.transaction(fn)()
}
