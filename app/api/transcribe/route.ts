import { parseCategoryAssessment } from '../category-contract';

// One bounded attempt. Retrying after the client's 12-second budget would keep
// processing audio after the interface has already returned to typing.
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const ATTEMPT_TIMEOUT_MS = 10_000;

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const SUPPORTED_LANGUAGES = new Set(['English', 'தமிழ் · Tamil', 'ಕನ್ನಡ · Kannada']);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
// ponytail: isolate-local rate limiting is a same-day abuse brake; use a
// Cloudflare rate-limit binding before opening this endpoint beyond the demo.
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const json = (body: Record<string, unknown>, status = 200) =>
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

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin transcription is not allowed.' }, 403);
  }
  if (isRateLimited(request)) {
    return json({ error: 'Voice is busy. Type your account instead.' }, 429);
  }
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_AUDIO_BYTES + 1_000_000) {
    return json({ error: 'The recording is too large.' }, 413);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'Transcription is not configured.' }, 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Send the recording as multipart form data.' }, 400);
  }

  const audio = formData.get('audio');
  const requestedLanguage = formData.get('language');
  const language =
    typeof requestedLanguage === 'string' && SUPPORTED_LANGUAGES.has(requestedLanguage)
      ? requestedLanguage
      : 'the language spoken in the recording';

  if (!(audio instanceof File) || !audio.type.startsWith('audio/')) {
    return json({ error: 'A valid audio recording is required.' }, 400);
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return json({ error: 'The recording must be between 1 byte and 12 MB.' }, 413);
  }

  const base64Audio = Buffer.from(await audio.arrayBuffer()).toString('base64');
  const payload = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: `Transcribe only clearly intelligible spoken words in ${language}. Preserve exact words and mixed-language speech. Never infer, complete, summarise, or invent an incident. Also assess a provisional category using only these IDs: rgr_sexually_abusive_content, sexually_obscene_material, sexually_explicit_act, cseam. Return JSON only: {"transcript":"exact transcript or [NO_SPEECH]","category_assessment":{"outcome":"suggested or uncertain","top_category":"allowed ID or null","evidence":[{"quote":"exact transcript words","supports":"allowed ID"}],"alternatives":["allowed ID"]}}. Use uncertain whenever the words are insufficient or more than one category fits. Never return legal sections, routes, labels, or advice.`,
          },
          {
            inline_data: {
              mime_type: audio.type,
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  let geminiResponse: Response | null = null;
  try {
    const attempt = await fetch(endpointFor(GEMINI_MODEL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: payload,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (attempt.ok) geminiResponse = attempt;
  } catch {
    // A failed voice path returns to typing; it never blocks the account.
  }

  if (!geminiResponse) {
    return json({ error: 'The recording could not be transcribed right now.' }, 502);
  }

  const result = (await geminiResponse.json()) as GeminiResponse;
  const raw = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!raw) {
    return json({ error: 'No speech transcript was returned.' }, 422);
  }
  if (raw.includes('[NO_SPEECH]')) {
    return json({ error: 'No clear speech was heard. Type your account instead.' }, 422);
  }
  let transcript = '';
  let assessmentInput: unknown = null;
  try {
    const parsed = JSON.parse(raw) as { transcript?: unknown; category_assessment?: unknown };
    transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
    assessmentInput = parsed.category_assessment;
  } catch {
    return json({ error: 'The transcript response could not be read.' }, 422);
  }
  if (transcript === '[NO_SPEECH]') {
    return json({ error: 'No clear speech was heard. Type your account instead.' }, 422);
  }
  if (!transcript) return json({ error: 'No speech transcript was returned.' }, 422);

  const categoryAssessment = parseCategoryAssessment(JSON.stringify(assessmentInput), transcript);
  return json({ transcript, category_assessment: categoryAssessment });
}
