CREATE TABLE IF NOT EXISTS sakshi_evidence (
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
);

CREATE INDEX IF NOT EXISTS idx_sakshi_evidence_case_user_created_at
ON sakshi_evidence(case_id, user_id, created_at DESC);
