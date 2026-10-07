import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createMemberSchema, memberAge } from '@/lib/admin/create-member';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!access.isAdmin || access.mfaRequired || !['admin', 'super_admin'].includes(access.role)) return NextResponse.json({ error: 'Administrator verification is required' }, { status: 403 });
  const parsed = createMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { password, confirmPassword: _confirmation, adminAttestation: _attestation, email, mobileNumber, visibility, country, state, ...details } = parsed.data;
  // Never put passwords or admin privileges in user-editable metadata.
  const created = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { created_by_admin: access.user.id, verification_method: 'admin_attested' },
    user_metadata: { ...details, full_name: details.fullName, age: memberAge(details.dob), userAgent: 'Administrator-assisted registration' },
  });
  if (created.error || !created.data.user) {
    const duplicate = ['email_exists', 'email_already_exists', 'user_already_exists'].includes(created.error?.code || '') || /already.*registered|already.*exists/i.test(created.error?.message || '');
    return NextResponse.json({ error: duplicate ? 'This email already has an account. Find it in Profile Management to view or edit it.' : 'Profile creation failed. Check the details and try again.' }, { status: duplicate ? 409 : 500 });
  }
  const id = created.data.user.id;
  try {
    const { error } = await supabaseAdmin.rpc('admin_edit_member', {
      actor: access.user.id, target: id,
      account_patch: { email_verified: true, mobile_number: mobileNumber, mobile_verified: false, status: 'active' },
      profile_patch: { is_verified: true, moderation_status: 'approved', visibility, country, state: state || null },
    });
    if (error) throw error;
    const profile = await supabaseAdmin.from('profiles').select('profile_id').eq('user_id', id).single();
    if (profile.error) throw profile.error;
    const audit = await supabaseAdmin.from('activity_logs').insert({ user_id: access.user.id, action: 'ADMIN_CREATE_MEMBER', metadata: { target_user_id: id, verification_method: 'admin_attested', member_authorization_confirmed: true } });
    if (audit.error) throw audit.error;
    return NextResponse.json({ id, profileId: profile.data.profile_id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Roll back the new auth account and its cascading profile if setup cannot finish.
    const cleanup = await supabaseAdmin.auth.admin.deleteUser(id);
    return NextResponse.json({ error: cleanup.error ? 'Account setup is incomplete. Find this email in Profile Management before retrying.' : 'Profile setup failed. No account was kept; please retry.' }, { status: 500 });
  }
}
export async function GET(request: Request) {
  const access=await authLib.getServerAccess();
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!access.isAdmin || !['admin','super_admin'].includes(access.role)) return NextResponse.json({error:'Forbidden'},{status:403});
  const params=new URL(request.url).searchParams;
  const page=Math.max(1,Number(params.get('page'))||1);
  const q=(params.get('q')||'').trim().slice(0,100);
  let query=supabaseAdmin.from('users').select('*,profile:profiles(*)',{count:'exact'}).order('created_at',{ascending:false});
  if(params.get('deleted')!=='true') query=query.is('deleted_at',null);
  if(q) {
    const safe=q.replace(/[^a-zA-Z0-9@ ._+-]/g,'');
    const {data:profiles}=await supabaseAdmin.from('profiles').select('user_id').or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,profile_id.ilike.%${safe}%`).limit(100);
    const ids=(profiles||[]).map(p=>p.user_id);
    query=query.or(`email.ilike.%${safe}%,mobile_number.ilike.%${safe}%${ids.length?`,id.in.(${ids.join(',')})`:''}`);
  }
  const {data,error,count}=await query.range((page-1)*25,page*25-1);
  if(error) return NextResponse.json({error:'Could not load members.'},{status:500});
  const {data:admins}=await supabaseAdmin.from('admin_users').select('auth_user_id');
  const adminIds=new Set((admins||[]).map(a=>a.auth_user_id));
  return NextResponse.json({users:(data||[]).map(u=>({...u,is_admin:adminIds.has(u.auth_user_id)})),total:count||0,page},{headers:{'Cache-Control':'no-store'}});
}
