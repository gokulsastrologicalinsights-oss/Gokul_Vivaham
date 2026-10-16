import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOperationalSettings } from '@/lib/operational-settings';
import { supportSchema } from '@/validations/support.schema';
import { isSameOrigin } from '@/lib/request-origin';

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const user = await authLib.getServerUser();
  if (!user) return reply({ error: 'Please sign in to view support requests' }, 401);
  const { data, error } = await supabaseAdmin.from('support_requests').select('id,name,subject,message,status,reply,created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  if (error) return reply({ error: 'Unable to load requests' }, 503);
  return reply(data);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: 'Forbidden' }, 403);
  const user = await authLib.getServerUser();
  if (!user) return reply({ error: 'Please sign in before sending a request, or use our published email or phone.' }, 401);
  if (Number(request.headers.get('content-length')) > 32768) return reply({ error: 'Request is too large' }, 413);
  // Check actual body size too: Content-Length may be absent or untrusted.
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 32768) return reply({ error: 'Request is too large' }, 413);
  let value: unknown;
  try { value = JSON.parse(body); } catch { return reply({ error: 'Invalid request' }, 400); }
  const parsed = supportSchema.safeParse(value);
  if (!parsed.success) return reply({ error: 'Enter a valid name (2–100 characters), email, optional phone and message (10–5000 characters).' }, 400);
  try {
    if (!(await getOperationalSettings()).support_requests_enabled) return reply({ error: 'New support requests are temporarily paused. Please use our published contact details.' }, 503);
    // Persistent per-account throttle, shared by application instances. Fail closed on lookup errors.
    const { count, error: countError } = await supabaseAdmin.from('support_requests').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError || count === null) return reply({ error: 'Support is temporarily unavailable. Please use our published contact details.' }, 503);
    if (count >= 5) return NextResponse.json({ error: 'Too many inquiries. Please wait up to one hour or use our published support contact.' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } });
    const { name, email, mobile, subject, message } = parsed.data;
    const inquiry = { name, email, mobile, subject, message };
    const { data, error } = await supabaseAdmin.from('support_requests').insert({ ...inquiry, user_id: user.id }).select('id').single();
    if (error || !data?.id) return reply({ error: 'Unable to save request. Please retry or contact our published support email.' }, 503);
    return reply({ id: data.id }, 201);
  } catch {
    return reply({ error: 'Support is temporarily unavailable. Please retry or use our published contact details.' }, 503);
  }
}
