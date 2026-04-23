import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { SCHEMA_SQL, CURRENT_SCHEMA_VERSION, MIGRATIONS } from './schema'

let db: Database.Database | null = null

/** Get the database file path in the user data directory */
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'ainote.db')
}

/** Initialize the database: create file, enable WAL, run schema */
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  // Performance settings
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  // Run initial schema
  applyMigrations(db)

  return db
}

/** Get the current database instance (must call initDatabase first) */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/** Close the database cleanly */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/** Apply schema migrations */
function applyMigrations(database: Database.Database): void {
  // Ensure _schema_version table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      version    INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)

  const currentVersion = database.prepare(
    'SELECT COALESCE(MAX(version), 0) as version FROM _schema_version'
  ).get() as { version: number }

  if (currentVersion.version < CURRENT_SCHEMA_VERSION) {
    // Apply initial schema (version 1)
    if (currentVersion.version < 1) {
      database.exec(SCHEMA_SQL)
      database.prepare('INSERT INTO _schema_version (version) VALUES (?)').run(1)
    }

    // Future migrations go here:
    for (let v = currentVersion.version + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      if (v === 1) continue // Already handled by SCHEMA_SQL
      const migration = MIGRATIONS[v]
      if (migration) {
        // Split by semicolons and execute each statement (ALTER TABLE can't be in multi-statement)
        const statements = migration.split(';').map(s => s.trim()).filter(Boolean)
        for (const stmt of statements) {
          try {
            database.exec(stmt)
          } catch (err: unknown) {
            // Ignore "duplicate column" errors for idempotent migrations
            const msg = err instanceof Error ? err.message : String(err)
            if (!msg.includes('duplicate column')) throw err
          }
        }
        database.prepare('INSERT INTO _schema_version (version) VALUES (?)').run(v)
      }
    }
  }
}
