import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { resolveAccess } from '@/lib/auth/access';

function clearCookies(response: NextResponse) {
  for (const name of ['sb-access-token','supabase-auth-token']) {
    response.cookies.set(name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
  }
  return response;
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  if (originUrl.origin === requestUrl.origin) return true;

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  return process.env.NODE_ENV !== 'production'
    && originUrl.protocol === 'http:'
    && requestUrl.protocol === 'http:'
    && originUrl.port === requestUrl.port
    && localHosts.has(originUrl.hostname)
    && localHosts.has(requestUrl.hostname);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const access = await resolveAccess(token);
  if (!access || !token) return clearCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  const response = NextResponse.json({ role: access.mfaRequired ? 'user' : access.role, isAdmin: access.isAdmin, mfa_required: access.mfaRequired }, { headers: { 'Cache-Control': 'no-store' } });
  // Supabase verified this JWT before its expiry is read.
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  response.cookies.set('sb-access-token', token, { path: '/', httpOnly: true,
    secure: new URL(request.url).protocol === 'https:', sameSite: 'lax',
    maxAge: Math.max(0, Number(claims.exp) - Math.floor(Date.now()/1000)),
  });
  response.cookies.set('supabase-auth-token', '', { path: '/', maxAge: 0 });
  return response;
}
export async function GET() {
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ role: access.mfaRequired ? 'user' : access.role, isAdmin: access.isAdmin, mfa_required: access.mfaRequired }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return clearCookies(NextResponse.json({ success: true }));
}
