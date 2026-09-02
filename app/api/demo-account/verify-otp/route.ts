import { createSessionForPhone, normalizePhone } from '../../case-store';

const json = (body: Record<string, unknown>, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function POST(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  let phone = '';
  let otp = '';
  try {
    const body = await request.json() as { phone?: unknown; otp?: unknown };
    phone = normalizePhone(body.phone);
    otp = typeof body.otp === 'string' ? body.otp : '';
  } catch {
    return json({ error: 'Enter your mobile number and verification code.' }, 400);
  }
  if (!phone || otp !== '123456') return json({ error: 'Use the verification code 123456.' }, 400);
  try {
    const session = await createSessionForPhone(request, phone);
    return json({ verified: true }, 200, { 'Set-Cookie': session.cookie });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Complaint storage is unavailable.' }, 503);
  }
}
