/** SQLite schema DDL — all tables for AiNote */
export const SCHEMA_SQL = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login_at INTEGER
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT 'Default',
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Missions
CREATE TABLE IF NOT EXISTS missions (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Boards (kanban columns)
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  mission_id  TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- SubTasks
CREATE TABLE IF NOT EXISTS subtasks (
  id        TEXT PRIMARY KEY,
  task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title     TEXT NOT NULL DEFAULT '',
  done      INTEGER NOT NULL DEFAULT 0,
  note_id   TEXT,
  block_id  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  mission_id  TEXT REFERENCES missions(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Note Blocks (markdown / code)
CREATE TABLE IF NOT EXISTS note_blocks (
  id            TEXT PRIMARY KEY,
  note_id       TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'markdown' CHECK(type IN ('markdown', 'code')),
  content       TEXT NOT NULL DEFAULT '',
  language      TEXT,
  last_output   TEXT,
  last_exit_code INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Conversations (chatbot sessions)
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_meta (
  table_name        TEXT NOT NULL,
  record_id         TEXT NOT NULL,
  local_updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  cloud_updated_at  INTEGER NOT NULL DEFAULT 0,
  sync_status       TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
  PRIMARY KEY (table_name, record_id)
);

-- DB version tracking for migrations
CREATE TABLE IF NOT EXISTS _schema_version (
  version  INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

export const CURRENT_SCHEMA_VERSION = 4;

export const MIGRATIONS: Record<number, string> = {
  2: `
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name  TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      last_login_at INTEGER
    );
    -- Add user_id column to workspaces if it doesn't exist
    ALTER TABLE workspaces ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  `,
  3: `
    -- Add email column to users table (aligns with Prisma User model)
    ALTER TABLE users ADD COLUMN email TEXT;
    -- Backfill email for existing users: <username>@local
    UPDATE users SET email = username || '@local' WHERE email IS NULL;
    -- Create unique index on email (SQLite ALTER TABLE cannot add UNIQUE inline)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `,
  4: `
    -- Ensure lastSyncTime is available in settings KV (no-op if settings table already exists)
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `,
};
