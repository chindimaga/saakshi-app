import { env } from 'cloudflare:workers';
import { CASE_VAULT_SCHEMA } from '../../db/schema';
import { complaintStage, type ComplaintStage } from '../../domain/stages';

type Bindings = { DB?: D1Database; EVIDENCE?: R2Bucket };

export type StoredCase = {
  id: string;
  reference: string;
  category_id: string;
  category_label: string;
  summary: string;
  platform: string;
  police_station: string;
  details_json: string;
  status: ComplaintStage;
  created_at: number;
  updated_at: number;
};

export type StoredEvidence = {
  id: string;
  case_id: string;
  user_id: string;
  object_key: string | null;
  kind: 'file' | 'note';
  file_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  checksum: string | null;
  note_text: string | null;
  created_at: number;
};

const SESSION_COOKIE = 'sakshi_demo_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
let schemaReady: Promise<void> | null = null;

const textEncoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function accountSecret(request: Request) {
  const configured = process.env.SAKSHI_ACCOUNT_KEY;
  if (configured) return configured;
  if (isLocalRequest(request)) return 'sakshi-local-demo-account-key';
  throw new Error('Complaint storage is not configured.');
}

async function hash(value: string, request: Request) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(accountSecret(request)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, textEncoder.encode(value)));
}

export function normalizePhone(value: unknown) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return '';
}

function database() {
  const db = (env as Bindings).DB;
  if (!db) throw new Error('Complaint storage is not available.');
  return db;
}

function evidenceBucket() {
  const bucket = (env as Bindings).EVIDENCE;
  if (!bucket) throw new Error('Evidence storage is not available.');
  return bucket;
}

export async function ensureCaseVault() {
  if (!schemaReady) {
    const db = database();
    schemaReady = db.batch(CASE_VAULT_SCHEMA.map((sql) => db.prepare(sql))).then(async () => {
      const columns = await db.prepare('PRAGMA table_info(sakshi_cases)').all<{ name: string }>();
      if (!columns.results.some((column) => column.name === 'details_json')) {
        await db.prepare("ALTER TABLE sakshi_cases ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}'").run();
      }
      await db.prepare('PRAGMA optimize').run();
    });
  }
  return schemaReady;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

function randomToken() {
  const values = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function createSessionForPhone(request: Request, phone: string) {
  await ensureCaseVault();
  const db = database();
  const now = Date.now();
  const phoneHash = await hash(phone, request);
  let user = await db.prepare('SELECT id FROM sakshi_users WHERE phone_hash = ?').bind(phoneHash).first<{ id: string }>();
  if (!user) {
    user = { id: crypto.randomUUID() };
    await db.prepare('INSERT INTO sakshi_users (id, phone_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .bind(user.id, phoneHash, now, now).run();
  } else {
    await db.prepare('UPDATE sakshi_users SET updated_at = ? WHERE id = ?').bind(now, user.id).run();
  }

  const token = randomToken();
  const tokenHash = await hash(token, request);
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1_000;
  await db.prepare('INSERT INTO sakshi_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, user.id, expiresAt, now).run();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return {
    userId: user.id,
    cookie: `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`,
  };
}

export async function userFromSession(request: Request) {
  await ensureCaseVault();
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hash(token, request);
  const session = await database().prepare('SELECT user_id, expires_at FROM sakshi_sessions WHERE token_hash = ?')
    .bind(tokenHash).first<{ user_id: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return null;
  return session.user_id;
}

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

export async function listCases(userId: string) {
  await ensureCaseVault();
  const result = await database().prepare(
    'SELECT id, reference, category_id, category_label, summary, platform, police_station, details_json, status, created_at, updated_at FROM sakshi_cases WHERE user_id = ? ORDER BY updated_at DESC',
  ).bind(userId).all<StoredCase>();
  return result.results.map((record) => ({ ...record, status: complaintStage(record.status) }));
}

export async function createCase(userId: string, input: Omit<StoredCase, 'id' | 'reference' | 'user_id' | 'status' | 'created_at' | 'updated_at'>) {
  await ensureCaseVault();
  const now = Date.now();
  const id = crypto.randomUUID();
  const reference = `SAA-${new Date(now).toISOString().slice(0, 10).replaceAll('-', '')}-${id.slice(0, 6).toUpperCase()}`;
  const record: StoredCase = { id, reference, ...input, status: 'complaint_received', created_at: now, updated_at: now };
  await database().prepare(
    'INSERT INTO sakshi_cases (id, user_id, reference, category_id, category_label, summary, platform, police_station, details_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, userId, reference, record.category_id, record.category_label, record.summary, record.platform, record.police_station, record.details_json, record.status, now, now).run();
  return record;
}

export async function updateCaseDetails(userId: string, caseId: string, input: Omit<StoredCase, 'id' | 'reference' | 'user_id' | 'status' | 'created_at' | 'updated_at'>) {
  await ensureCaseVault();
  const result = await database().prepare(
    'UPDATE sakshi_cases SET category_id = ?, category_label = ?, summary = ?, platform = ?, police_station = ?, details_json = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  ).bind(input.category_id, input.category_label, input.summary, input.platform, input.police_station, input.details_json, Date.now(), caseId, userId).run();
  return result.meta.changes > 0;
}

export async function setCaseStage(userId: string, caseId: string, stage: ComplaintStage) {
  await ensureCaseVault();
  const result = await database().prepare(
    'UPDATE sakshi_cases SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  ).bind(stage, Date.now(), caseId, userId).run();
  return result.meta.changes > 0;
}

async function ownedCase(userId: string, caseId: string) {
  return database().prepare('SELECT id FROM sakshi_cases WHERE id = ? AND user_id = ?').bind(caseId, userId).first<{ id: string }>();
}

export async function listEvidence(userId: string, caseId: string) {
  await ensureCaseVault();
  if (!await ownedCase(userId, caseId)) return null;
  const result = await database().prepare(
    'SELECT id, case_id, user_id, object_key, kind, file_name, content_type, byte_size, checksum, note_text, created_at FROM sakshi_evidence WHERE case_id = ? AND user_id = ? ORDER BY created_at DESC',
  ).bind(caseId, userId).all<StoredEvidence>();
  return result.results;
}

export async function addEvidenceFile(userId: string, caseId: string, file: File, checksum: string) {
  await ensureCaseVault();
  if (!await ownedCase(userId, caseId)) return null;
  const id = crypto.randomUUID();
  const objectKey = `evidence/${userId}/${caseId}/${id}`;
  const now = Date.now();
  await evidenceBucket().put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata: { caseId, evidenceId: id },
  });
  try {
    await database().prepare(
      'INSERT INTO sakshi_evidence (id, case_id, user_id, object_key, kind, file_name, content_type, byte_size, checksum, note_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, caseId, userId, objectKey, 'file', file.name, file.type || 'application/octet-stream', file.size, checksum, null, now).run();
  } catch (error) {
    await evidenceBucket().delete(objectKey);
    throw error;
  }
  return { id, case_id: caseId, user_id: userId, object_key: objectKey, kind: 'file' as const, file_name: file.name, content_type: file.type, byte_size: file.size, checksum, note_text: null, created_at: now };
}

export async function addEvidenceNote(userId: string, caseId: string, note: string) {
  await ensureCaseVault();
  if (!await ownedCase(userId, caseId)) return null;
  const id = crypto.randomUUID();
  const now = Date.now();
  await database().prepare(
    'INSERT INTO sakshi_evidence (id, case_id, user_id, object_key, kind, file_name, content_type, byte_size, checksum, note_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, caseId, userId, null, 'note', null, null, null, null, note, now).run();
  return { id, case_id: caseId, user_id: userId, object_key: null, kind: 'note' as const, file_name: null, content_type: null, byte_size: null, checksum: null, note_text: note, created_at: now };
}

export async function getEvidenceFile(userId: string, caseId: string, evidenceId: string) {
  await ensureCaseVault();
  const item = await database().prepare(
    'SELECT id, case_id, user_id, object_key, kind, file_name, content_type, byte_size, checksum, note_text, created_at FROM sakshi_evidence WHERE id = ? AND case_id = ? AND user_id = ? AND kind = ?',
  ).bind(evidenceId, caseId, userId, 'file').first<StoredEvidence>();
  if (!item?.object_key) return null;
  const object = await evidenceBucket().get(item.object_key);
  return object ? { item, object } : null;
}

export async function removeEvidence(userId: string, caseId: string, evidenceId: string) {
  await ensureCaseVault();
  const item = await database().prepare(
    'SELECT id, case_id, user_id, object_key, kind, file_name, content_type, byte_size, checksum, note_text, created_at FROM sakshi_evidence WHERE id = ? AND case_id = ? AND user_id = ?',
  ).bind(evidenceId, caseId, userId).first<StoredEvidence>();
  if (!item) return false;
  if (item.object_key) await evidenceBucket().delete(item.object_key);
  await database().prepare('DELETE FROM sakshi_evidence WHERE id = ? AND case_id = ? AND user_id = ?').bind(evidenceId, caseId, userId).run();
  return true;
}
