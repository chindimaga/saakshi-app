export const CASE_VAULT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sakshi_users (
    id TEXT PRIMARY KEY,
    phone_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sakshi_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sakshi_cases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL,
    category_label TEXT NOT NULL,
    summary TEXT NOT NULL,
    platform TEXT NOT NULL,
    police_station TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sakshi_evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    object_key TEXT,
    kind TEXT NOT NULL,
    file_name TEXT,
    content_type TEXT,
    byte_size INTEGER,
    checksum TEXT,
    note_text TEXT,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sakshi_sessions_expires_at ON sakshi_sessions(expires_at)',
  'CREATE INDEX IF NOT EXISTS idx_sakshi_cases_user_updated_at ON sakshi_cases(user_id, updated_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_sakshi_evidence_case_user_created_at ON sakshi_evidence(case_id, user_id, created_at DESC)',
] as const;
