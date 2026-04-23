import { getDatabase } from '../init'

/** Generic DAO with common CRUD operations for any table */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class BaseDao<T extends {}> {
  constructor(
    protected tableName: string,
    protected columns: string[],
  ) {}

  findAll(): T[] {
    const db = getDatabase()
    return db.prepare(`SELECT * FROM ${this.tableName} ORDER BY sort_order ASC, created_at DESC`).all() as T[]
  }

  findById(id: string): T | undefined {
    const db = getDatabase()
    return db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as T | undefined
  }

  findBy(column: string, value: unknown): T[] {
    const db = getDatabase()
    return db.prepare(`SELECT * FROM ${this.tableName} WHERE ${column} = ? ORDER BY sort_order ASC`).all(value) as T[]
  }

  insert(record: Partial<T> & { id: string }): void {
    const db = getDatabase()
    const keys = Object.keys(record)
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`
    db.prepare(sql).run(...Object.values(record))
    this.touchSyncMeta(record.id)
  }

  update(id: string, fields: Partial<T>): void {
    const db = getDatabase()
    const entries = Object.entries(fields)
    if (entries.length === 0) return
    const sets = entries.map(([key]) => `${key} = ?`).join(', ')
    const sql = `UPDATE ${this.tableName} SET ${sets}, updated_at = unixepoch() WHERE id = ?`
    db.prepare(sql).run(...entries.map(([, v]) => v), id)
    this.touchSyncMeta(id)
  }

  delete(id: string): void {
    const db = getDatabase()
    db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id)
    // Remove sync meta
    db.prepare('DELETE FROM sync_meta WHERE table_name = ? AND record_id = ?').run(this.tableName, id)
  }

  /** Mark record as needing sync */
  private touchSyncMeta(id: string): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO sync_meta (table_name, record_id, local_updated_at, sync_status)
      VALUES (?, ?, unixepoch(), 'pending')
      ON CONFLICT(table_name, record_id) DO UPDATE SET
        local_updated_at = unixepoch(),
        sync_status = 'pending'
    `).run(this.tableName, id)
  }
}
