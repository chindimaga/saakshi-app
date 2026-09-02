import { cleanText, createCase, listCases, setCaseStage, updateCaseDetails, userFromSession } from '../case-store';
import { COMPLAINT_STAGES, type ComplaintStage } from '../../../domain/stages';

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function authenticatedUser(request: Request) {
  const userId = await userFromSession(request);
  if (!userId) return null;
  return userId;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUser(request);
    if (!userId) return json({ error: 'Verify your mobile number to view your complaints.' }, 401);
    return json({ cases: await listCases(userId) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Case storage is unavailable.' }, 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  try {
    const userId = await authenticatedUser(request);
    if (!userId) return json({ error: 'Verify your mobile number first.' }, 401);
    const body = await request.json() as Record<string, unknown>;
    const summary = cleanText(body.summary, 600);
    const categoryLabel = cleanText(body.category_label, 160) || 'Not categorised';
    if (!summary) return json({ error: 'A case summary is required.' }, 400);
    let detailsJson = '{}';
    if (body.details !== undefined) {
      if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) return json({ error: 'Invalid case details.' }, 400);
      detailsJson = JSON.stringify(body.details);
      if (detailsJson.length > 30_000) return json({ error: 'Case details are too long.' }, 400);
    }
    const record = await createCase(userId, {
      category_id: cleanText(body.category_id, 80) || 'none',
      category_label: categoryLabel,
      summary,
      platform: cleanText(body.platform, 120),
      police_station: cleanText(body.police_station, 180),
      details_json: detailsJson,
    });
    return json({ case: record }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The case could not be saved.' }, 503);
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  try {
    const userId = await authenticatedUser(request);
    if (!userId) return json({ error: 'Verify your mobile number first.' }, 401);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.case_id !== 'string') return json({ error: 'Invalid case update.' }, 400);
    if (typeof body.status === 'string') {
      if (!COMPLAINT_STAGES.some((stage) => stage.id === body.status)) return json({ error: 'Invalid case update.' }, 400);
      if (!await setCaseStage(userId, body.case_id, body.status as ComplaintStage)) return json({ error: 'Case not found.' }, 404);
      return json({ updated: true });
    }
    if (body.action !== 'update_details') return json({ error: 'Invalid case update.' }, 400);
    const summary = cleanText(body.summary, 600);
    const categoryLabel = cleanText(body.category_label, 160) || 'Not categorised';
    if (!summary) return json({ error: 'Your account is required.' }, 400);
    if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) return json({ error: 'Invalid complaint details.' }, 400);
    const detailsJson = JSON.stringify(body.details);
    if (detailsJson.length > 30_000) return json({ error: 'Complaint details are too long.' }, 400);
    if (!await updateCaseDetails(userId, body.case_id, {
      category_id: cleanText(body.category_id, 80) || 'none',
      category_label: categoryLabel,
      summary,
      platform: cleanText(body.platform, 120),
      police_station: cleanText(body.police_station, 180),
      details_json: detailsJson,
    })) return json({ error: 'Case not found.' }, 404);
    return json({ updated: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The case could not be updated.' }, 503);
  }
}
