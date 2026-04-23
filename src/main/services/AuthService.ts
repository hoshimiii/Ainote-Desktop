import crypto from 'crypto'
import { getDatabase } from '../database'

export interface UserRecord {
  id: string
  username: string
  displayName: string | null
  createdAt: number
  lastLoginAt: number | null
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

export function register(username: string, password: string): UserRecord {
  const db = getDatabase()

  if (!username || username.length < 2) {
    throw new Error('用户名至少2个字符')
  }
  if (!password || password.length < 4) {
    throw new Error('密码至少4个字符')
  }

  // Check unique
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    throw new Error('用户名已存在')
  }

  const id = crypto.randomUUID()
  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = salt + ':' + hashPassword(password, salt)
  const now = Math.floor(Date.now() / 1000)

  db.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, passwordHash, username, now, now)

  return { id, username, displayName: username, createdAt: now, lastLoginAt: now }
}

export function login(username: string, password: string): UserRecord {
  const db = getDatabase()

  const row = db.prepare(
    'SELECT id, username, password_hash, display_name, created_at, last_login_at FROM users WHERE username = ?'
  ).get(username) as { id: string; username: string; password_hash: string; display_name: string | null; created_at: number; last_login_at: number | null } | undefined

  if (!row) {
    throw new Error('用户不存在')
  }

  const [salt, hash] = row.password_hash.split(':')
  const computed = hashPassword(password, salt)
  if (computed !== hash) {
    throw new Error('密码错误')
  }

  const now = Math.floor(Date.now() / 1000)
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, row.id)

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastLoginAt: now,
  }
}

export function getCurrentUser(userId: string): UserRecord | null {
  const db = getDatabase()
  const row = db.prepare(
    'SELECT id, username, display_name, created_at, last_login_at FROM users WHERE id = ?'
  ).get(userId) as { id: string; username: string; display_name: string | null; created_at: number; last_login_at: number | null } | undefined

  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

export function listUsers(): UserRecord[] {
  const db = getDatabase()
  const rows = db.prepare(
    'SELECT id, username, display_name, created_at, last_login_at FROM users ORDER BY last_login_at DESC'
  ).all() as Array<{ id: string; username: string; display_name: string | null; created_at: number; last_login_at: number | null }>

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  }))
}
