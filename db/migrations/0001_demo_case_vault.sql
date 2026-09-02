CREATE TABLE IF NOT EXISTS sakshi_users (
  id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sakshi_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sakshi_cases (
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
);

CREATE INDEX IF NOT EXISTS idx_sakshi_sessions_expires_at ON sakshi_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sakshi_cases_user_updated_at ON sakshi_cases(user_id, updated_at DESC);
