import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

// The provider's verified user record is the evidence, never client-supplied flags.
export async function POST(request: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Forbidden' }, 403);
  const user = await authLib.getServerUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const body = await request.json().catch(() => null);
  if (!body || !['email', 'mobile'].includes(body.field) || Object.keys(body).length !== 1) return reply({ error: 'Invalid request' }, 400);
  const email = body.field === 'email';
  const value = email ? user.email : user.phone;
  const confirmed = email ? user.email_confirmed_at : user.phone_confirmed_at;
  if (!value || !confirmed) return reply({ error: 'Complete provider verification first.' }, 409);
  const { data, error } = await supabaseAdmin.rpc('sync_member_contact_verification', { actor: user.id, field_name: body.field });
  if (error || !data) return reply({ error: 'Could not save verification status. Please retry.' }, 409);
  return reply({ success: true });
}
