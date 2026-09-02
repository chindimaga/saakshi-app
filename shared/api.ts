export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export function requestOtp(phone: string) {
  return apiJson<{ message: string }>('/api/demo-account/request-otp', { method: 'POST', body: JSON.stringify({ phone }) });
}

export async function verifyOtp(phone: string, otp: string) {
  try {
    return await apiJson<{ verified: boolean }>('/api/demo-account/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('Verification is taking too long. Please try again.');
    }
    throw error;
  }
}

export function transcribeAudio(audio: Blob, language: string) {
  const data = new FormData();
  data.append('audio', audio, 'account.webm');
  data.append('language', language);
  return fetch('/api/transcribe', { method: 'POST', body: data }).then(async (response) => {
    const body = await response.json() as { transcript?: string; category_assessment?: unknown; error?: string };
    if (!response.ok) throw new Error(body.error || 'Transcription failed');
    return body;
  });
}

export function categorizeAccount(account: string) {
  return apiJson<{ assessment: unknown }>('/api/categorize', { method: 'POST', body: JSON.stringify({ account }) });
}

export function fetchCases() {
  return apiJson<{ cases: Array<Record<string, unknown>> }>('/api/cases');
}

export function createCase(body: Record<string, unknown>) {
  return apiJson<{ case: Record<string, unknown> }>('/api/cases', { method: 'POST', body: JSON.stringify(body) });
}

export function patchCase(body: Record<string, unknown>) {
  return apiJson<{ updated: boolean }>('/api/cases', { method: 'PATCH', body: JSON.stringify(body) });
}

export type EvidenceItem = {
  id: string;
  kind: 'file' | 'note';
  file_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  checksum: string | null;
  note_text: string | null;
  created_at: number;
};

export function fetchEvidence(caseId: string) {
  return apiJson<{ evidence: EvidenceItem[] }>(`/api/evidence?case_id=${encodeURIComponent(caseId)}`);
}

export function addEvidenceFile(caseId: string, file: File) {
  const data = new FormData();
  data.append('case_id', caseId);
  data.append('file', file);
  return fetch('/api/evidence', { method: 'POST', body: data }).then(async (response) => {
    const body = await response.json() as { evidence?: EvidenceItem; error?: string };
    if (!response.ok) throw new Error(body.error || 'Could not add evidence.');
    return body;
  });
}

export function addEvidenceNote(caseId: string, note: string) {
  const data = new FormData();
  data.append('case_id', caseId);
  data.append('note', note);
  return fetch('/api/evidence', { method: 'POST', body: data }).then(async (response) => {
    const body = await response.json() as { evidence?: EvidenceItem; error?: string };
    if (!response.ok) throw new Error(body.error || 'Could not add the note.');
    return body;
  });
}

export function removeEvidence(caseId: string, evidenceId: string) {
  return apiJson<{ deleted: boolean }>('/api/evidence', { method: 'DELETE', body: JSON.stringify({ case_id: caseId, evidence_id: evidenceId }) });
}

export function fetchCities() {
  return apiJson<{ cities: Array<{ name: string }> }>('/api/nearest-police-station?cities=true');
}

export function fetchStations(city: string) {
  return apiJson<{ available_stations: Array<Record<string, unknown>> }>(
    `/api/nearest-police-station?list=true&city=${encodeURIComponent(city)}`,
  );
}

export function fetchNearest(lat: number, lng: number) {
  return apiJson<Record<string, unknown>>('/api/nearest-police-station', {
    method: 'POST',
    body: JSON.stringify({ user_lat: lat, user_lng: lng, radius_km: 10 }),
  });
}
