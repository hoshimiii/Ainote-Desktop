/**
 * Cloud Sync service for Electron main process.
 * Syncs local SQLite data with AiNote_online cloud (PostgreSQL via /api/sync).
 * Implements Last-Write-Wins (LWW) conflict resolution via sync_meta timestamps.
 */
import { getDatabase } from '../database'
import { settingsDao } from '../database/dao'
import { BrowserWindow } from 'electron'
import {
  CloudSnapshot,
  type CloudRepairSummary,
  CloudSnapshotIntegrityError,
  cloudToDesktop,
  cloudToDesktopWithFallback,
  desktopToCloud,
  formatCloudRepairSummary,
} from '../../shared/cloudSnapshot'
import type { KanbanPersistedState } from '../../shared/kanbanPersistence'

export type SyncDirection = 'push' | 'pull'
export type SyncResult = {
  direction: SyncDirection
  recordsSynced: number
  conflicts: number
  errors: string[]
  warnings: string[]
}

// ─── Settings helpers ──────────────────────────────────────────────

/** Notify all renderer windows to rehydrate their Zustand stores */
function notifyRendererRehydrate(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('store-rehydrate')
  }
}

function notifyTransientRecovery(snapshot: KanbanPersistedState, message: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('sync:transient-recovery', { snapshot, message })
  }
}

function getCloudBaseUrl(): string | null {
  return settingsDao.get('cloud_base_url') ?? null
}

function getCloudSessionCookie(): string | null {
  return settingsDao.get('cloud_token') ?? null
}

function setCloudSessionCookie(cookie: string): void {
  settingsDao.set('cloud_token', cookie)
}

function clearCloudSession(): void {
  settingsDao.delete('cloud_token')
}

// ─── Cloud Login ───────────────────────────────────────────────────

/**
 * Authenticate with AiNote cloud backend using Auth.js credentials flow.
 * Captures the session cookie and stores it locally for subsequent API calls.
 */
export async function cloudLogin(
  email: string,
  password: string,
  baseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    settingsDao.set('cloud_base_url', baseUrl.replace(/\/+$/, ''))
    const base = getCloudBaseUrl()!

    const csrfRes = await fetch(`${base}/api/auth/csrf`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!csrfRes.ok) {
      return { success: false, error: `获取 CSRF token 失败: ${csrfRes.status}` }
    }
    const csrfData = (await csrfRes.json()) as { csrfToken: string }
    const csrfToken = csrfData.csrfToken
    const csrfCookies = extractSetCookies(csrfRes)

    const callbackRes = await fetch(`${base}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: csrfCookies,
      },
      body: new URLSearchParams({ email, password, csrfToken }).toString(),
      redirect: 'manual',
    })

    const sessionCookies = extractSetCookies(callbackRes)
    const allCookies = mergeCookies(csrfCookies, sessionCookies)

    const sessionRes = await fetch(`${base}/api/auth/session`, {
      headers: {
        Accept: 'application/json',
        Cookie: allCookies,
      },
    })
    const sessionData = (await sessionRes.json()) as { user?: { id: string; email: string } }

    if (!sessionData.user?.id) {
      clearCloudSession()
      return { success: false, error: '登录失败：邮箱或密码错误' }
    }

    const finalCookies = mergeCookies(allCookies, extractSetCookies(sessionRes))
    setCloudSessionCookie(finalCookies)

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `连接云端失败: ${msg}` }
  }
}

function extractSetCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? []
  return setCookies.map((c) => c.split(';')[0]).join('; ')
}

function mergeCookies(existing: string, newer: string): string {
  const map = new Map<string, string>()
  for (const cookie of existing.split('; ').filter(Boolean)) {
    const [name, ...rest] = cookie.split('=')
    map.set(name, rest.join('='))
  }
  for (const cookie of newer.split('; ').filter(Boolean)) {
    const [name, ...rest] = cookie.split('=')
    map.set(name, rest.join('='))
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export async function getCloudLoginStatus(): Promise<{
  connected: boolean
  email?: string
  baseUrl?: string
}> {
  const base = getCloudBaseUrl()
  const cookie = getCloudSessionCookie()
  if (!base || !cookie) return { connected: false }

  try {
    const res = await fetch(`${base}/api/auth/session`, {
      headers: { Accept: 'application/json', Cookie: cookie },
    })
    const data = (await res.json()) as { user?: { email: string } }
    if (data.user?.email) {
      return { connected: true, email: data.user.email, baseUrl: base }
    }
  } catch {
  }
  return { connected: false, baseUrl: base }
}

export function cloudLogout(): void {
  clearCloudSession()
}

export function getPendingSyncRecords(): Array<{
  table_name: string
  record_id: string
  local_updated_at: number
  cloud_updated_at: number
}> {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT table_name, record_id, local_updated_at, cloud_updated_at
       FROM sync_meta
       WHERE sync_status = 'pending'
       ORDER BY local_updated_at ASC`,
    )
    .all() as Array<{
    table_name: string
    record_id: string
    local_updated_at: number
    cloud_updated_at: number
  }>
}

export function markSynced(tableName: string, recordId: string, cloudTimestamp: number): void {
  const db = getDatabase()
  db.prepare(
    `UPDATE sync_meta SET sync_status = 'synced', cloud_updated_at = ?
     WHERE table_name = ? AND record_id = ?`,
  ).run(cloudTimestamp, tableName, recordId)
}

export function getStoreSnapshot(storeName: string): unknown {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(`store:${storeName}`) as
    | { value: string }
    | undefined
  return row ? JSON.parse(row.value) : null
}

export function applyStoreSnapshot(storeName: string, data: unknown): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(`store:${storeName}`, JSON.stringify(data))
}

export async function pushToCloud(): Promise<SyncResult> {
  const base = getCloudBaseUrl()
  const cookie = getCloudSessionCookie()

  if (!base || !cookie) {
    return {
      direction: 'push',
      recordsSynced: 0,
      conflicts: 0,
      errors: ['Cloud sync not configured. Please login to cloud first.'],
      warnings: [],
    }
  }

  try {
    const snapshot = getStoreSnapshot('kanban')
    if (!snapshot) {
      return { direction: 'push', recordsSynced: 0, conflicts: 0, errors: [], warnings: [] }
    }

    const cloudPayload = desktopToCloud(snapshot as Record<string, unknown>)

    const res = await fetch(`${base}/api/sync`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(cloudPayload),
    })

    const result = (await res.json().catch(() => null)) as { updatedAt?: string; repairSummary?: CloudRepairSummary; error?: string } | null

    if (res.status === 401) {
      clearCloudSession()
      return {
        direction: 'push',
        recordsSynced: 0,
        conflicts: 0,
        errors: ['Token expired, please re-login'],
        warnings: [],
      }
    }

    if (!res.ok) {
      return {
        direction: 'push',
        recordsSynced: 0,
        conflicts: 0,
        errors: [formatCloudRepairSummary(result?.repairSummary) ?? result?.error ?? `Cloud push failed: ${res.status} ${res.statusText}`],
        warnings: [],
      }
    }

    const cloudTs = new Date(result?.updatedAt ?? 0).getTime()
    settingsDao.set('lastSyncTime', String(cloudTs))

    const pending = getPendingSyncRecords()
    for (const record of pending) {
      markSynced(record.table_name, record.record_id, cloudTs)
    }

    return {
      direction: 'push',
      recordsSynced: 1,
      conflicts: 0,
      errors: [],
      warnings: formatCloudRepairSummary(result?.repairSummary) ? [formatCloudRepairSummary(result?.repairSummary)!] : [],
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      direction: 'push',
      recordsSynced: 0,
      conflicts: 0,
      errors: [`Network error: ${msg}`],
      warnings: [],
    }
  }
}

export async function pullFromCloud(): Promise<SyncResult> {
  const base = getCloudBaseUrl()
  const cookie = getCloudSessionCookie()

  if (!base || !cookie) {
    return {
      direction: 'pull',
      recordsSynced: 0,
      conflicts: 0,
      errors: ['Cloud sync not configured. Please login to cloud first.'],
      warnings: [],
    }
  }

  try {
    const res = await fetch(`${base}/api/sync`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Cookie: cookie,
      },
    })

    const payload = (await res.json().catch(() => null)) as {
      data: unknown
      updatedAt: string | null
      repairSummary?: CloudRepairSummary | null
      error?: string
    } | null

    if (res.status === 401) {
      clearCloudSession()
      return {
        direction: 'pull',
        recordsSynced: 0,
        conflicts: 0,
        errors: ['Token expired, please re-login'],
        warnings: [],
      }
    }

    if (!res.ok) {
      return {
        direction: 'pull',
        recordsSynced: 0,
        conflicts: 0,
        errors: [formatCloudRepairSummary(payload?.repairSummary) ?? payload?.error ?? `Cloud pull failed: ${res.status} ${res.statusText}`],
        warnings: [],
      }
    }

    if (!payload || !payload.data || !payload.updatedAt) {
      return { direction: 'pull', recordsSynced: 0, conflicts: 0, errors: [], warnings: [] }
    }

    const cloudTs = new Date(payload.updatedAt).getTime()
    const { lastSyncTime } = getSyncStatus()

    if (lastSyncTime && cloudTs <= lastSyncTime) {
      return { direction: 'pull', recordsSynced: 0, conflicts: 0, errors: [], warnings: [] }
    }

    const importResult = cloudToDesktopWithFallback(payload.data as CloudSnapshot, payload.repairSummary ?? null)
    if (importResult.persistent) {
      applyStoreSnapshot('kanban', importResult.persistent)
      settingsDao.set('lastSyncTime', String(cloudTs))
      notifyRendererRehydrate()
      return {
        direction: 'pull',
        recordsSynced: 1,
        conflicts: 0,
        errors: [],
        warnings: importResult.diagnostics.message ? [importResult.diagnostics.message] : [],
      }
    }

    if (importResult.transient) {
      notifyTransientRecovery(importResult.transient, importResult.diagnostics.message ?? '云端快照已按临时恢复模式导入。')
      return {
        direction: 'pull',
        recordsSynced: 1,
        conflicts: 0,
        errors: [],
        warnings: importResult.diagnostics.message ? [importResult.diagnostics.message] : [],
      }
    }

    return {
      direction: 'pull',
      recordsSynced: 0,
      conflicts: 0,
      errors: [importResult.diagnostics.message ?? '云端快照关系校验失败，且无法恢复合法子集。'],
      warnings: [],
    }
  } catch (err) {
    if (err instanceof CloudSnapshotIntegrityError) {
      const detail = err.details.length > 0 ? `：${err.details.join('；')}` : ''
      return {
        direction: 'pull',
        recordsSynced: 0,
        conflicts: 0,
        errors: [`${err.message}${detail}`],
        warnings: [],
      }
    }

    const msg = err instanceof Error ? err.message : String(err)
    return {
      direction: 'pull',
      recordsSynced: 0,
      conflicts: 0,
      errors: [`Network error: ${msg}`],
      warnings: [],
    }
  }
}

export function getSyncStatus(): {
  pendingCount: number
  lastSyncTime: number | null
} {
  const db = getDatabase()
  const pending = db.prepare("SELECT COUNT(*) as count FROM sync_meta WHERE sync_status = 'pending'").get() as {
    count: number
  }
  const raw = settingsDao.get('lastSyncTime')
  const lastSyncTime = raw ? Number(raw) : null
  return {
    pendingCount: pending.count,
    lastSyncTime: lastSyncTime && !isNaN(lastSyncTime) ? lastSyncTime : null,
  }
}
