import { addEvidenceFile, addEvidenceNote, getEvidenceFile, listEvidence, removeEvidence, userFromSession } from '../case-store';
import { checksumFile, validateEvidenceFile, validateEvidenceFileContent } from '../../../domain/catalog';

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function authenticatedUser(request: Request) {
  const userId = await userFromSession(request);
  return userId || null;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const userId = await authenticatedUser(request);
  if (!userId) return json({ error: 'Verify your mobile number to view evidence.' }, 401);
  const url = new URL(request.url);
  const caseId = url.searchParams.get('case_id') || '';
  const evidenceId = url.searchParams.get('evidence_id');
  if (!caseId) return json({ error: 'Choose a complaint first.' }, 400);
  if (!evidenceId) {
    const items = await listEvidence(userId, caseId);
    return items ? json({ evidence: items }) : json({ error: 'Complaint not found.' }, 404);
  }
  const result = await getEvidenceFile(userId, caseId, evidenceId);
  if (!result) return json({ error: 'Evidence not found.' }, 404);
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': result.item.content_type || 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.item.file_name || 'evidence')}`,
  });
  result.object.writeHttpMetadata(headers);
  return new Response(result.object.body, { headers });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  const userId = await authenticatedUser(request);
  if (!userId) return json({ error: 'Verify your mobile number before adding evidence.' }, 401);
  const form = await request.formData();
  const caseId = typeof form.get('case_id') === 'string' ? form.get('case_id') as string : '';
  const note = typeof form.get('note') === 'string' ? (form.get('note') as string).trim().slice(0, 2_000) : '';
  const file = form.get('file');
  if (!caseId) return json({ error: 'Choose a complaint first.' }, 400);
  if (file instanceof File) {
    const error = validateEvidenceFile(file) || await validateEvidenceFileContent(file);
    if (error) return json({ error }, 400);
    const checksum = await checksumFile(file) || '';
    const evidence = await addEvidenceFile(userId, caseId, file, checksum);
    return evidence ? json({ evidence }, 201) : json({ error: 'Complaint not found.' }, 404);
  }
  if (note) {
    const evidence = await addEvidenceNote(userId, caseId, note);
    return evidence ? json({ evidence }, 201) : json({ error: 'Complaint not found.' }, 404);
  }
  return json({ error: 'Choose a file or write a note.' }, 400);
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  const userId = await authenticatedUser(request);
  if (!userId) return json({ error: 'Verify your mobile number before removing evidence.' }, 401);
  const body = await request.json() as { case_id?: unknown; evidence_id?: unknown };
  if (typeof body.case_id !== 'string' || typeof body.evidence_id !== 'string') return json({ error: 'Invalid evidence removal.' }, 400);
  return await removeEvidence(userId, body.case_id, body.evidence_id)
    ? json({ deleted: true })
    : json({ error: 'Evidence not found.' }, 404);
}
