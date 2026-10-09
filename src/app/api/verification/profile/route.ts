import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: account, error: accountError } = await supabaseAdmin
    .from('users')
    .select('id,email,mobile_number,email_verified,mobile_verified')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (accountError || !account) return NextResponse.json({ error: 'Member account not found.' }, { status: 404 });

  const [{ data: profile }, { data: request }] = await Promise.all([
    supabaseAdmin.from('profiles').select('profile_id,first_name,last_name').eq('user_id', account.id).maybeSingle(),
    supabaseAdmin.from('profile_verification_requests').select('id,status,mobile_status,requested_mobile_number,requested_at,rejection_reason').eq('user_id', account.id).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const mobileStatus = account.mobile_verified
    ? 'verified'
    : request?.status === 'pending' && request.mobile_status === 'requested'
      ? 'requested'
      : 'not_verified';

  return NextResponse.json({
    profile: profile || null,
    mobile: { status: mobileStatus, value: request?.requested_mobile_number || account.mobile_number || null },
    email: { status: account.email_verified ? 'verified' : 'not_verified', value: account.email || user.email || null },
    request: request || null,
    fullyVerified: Boolean(account.email_verified && account.mobile_verified),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
