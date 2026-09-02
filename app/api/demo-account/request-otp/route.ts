import { normalizePhone } from '../../case-store';

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  let phone = '';
  try {
    phone = normalizePhone((await request.json() as { phone?: unknown }).phone);
  } catch {
    return json({ error: 'Enter a valid mobile number.' }, 400);
  }
  if (!phone) return json({ error: 'Enter a valid 10-digit mobile number.' }, 400);
  return json({ message: 'Use 123456 to continue.' });
}
