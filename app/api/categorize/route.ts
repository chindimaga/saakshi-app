import { CATEGORY_INSTRUCTION, parseCategoryAssessment } from '../category-contract';

const GEMINI_MODEL = 'gemini-flash-lite-latest';
const MAX_ACCOUNT_CHARS = 20_000;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function isRateLimited(request: Request): boolean {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return false;
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin categorisation is not allowed.' }, 403);
  }
  if (isRateLimited(request)) {
    return json({ error: 'Category help is busy. Choose from the descriptions instead.' }, 429);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'Category help is not configured.' }, 503);

  let account = '';
  try {
    const body = await request.json() as { account?: unknown };
    account = typeof body.account === 'string' ? body.account.trim() : '';
  } catch {
    return json({ error: 'Send the account as JSON.' }, 400);
  }
  if (!account || account.length > MAX_ACCOUNT_CHARS) {
    return json({ error: 'The account must be between 1 and 20,000 characters.' }, 400);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${CATEGORY_INSTRUCTION}\n\nACCOUNT:\n${account}` }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) throw new Error('Category service unavailable');
    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = result.candidates?.[0]?.content?.parts?.map(({ text }) => text ?? '').join('').trim() ?? '';
    return json({ assessment: parseCategoryAssessment(raw, account) });
  } catch {
    return json({ error: 'Category help is unavailable right now.' }, 502);
  }
}
