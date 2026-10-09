import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const grantTypes = z.enum([
  'cash_payment',
  'bank_transfer',
  'upi_direct_payment',
  'complimentary_access',
  'administrative_correction',
  'other',
]);

const planSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(''),
  price: z.number().finite().min(0),
  duration_days: z.number().int().positive().max(3650),
  features: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
  contact_view_limit: z.number().int().min(0).max(100000).default(0),
  messaging_enabled: z.boolean().default(false),
  profile_visibility_benefit: z.string().trim().max(500).default(''),
  photo_viewing_enabled: z.boolean().default(false),
  premium_badge_eligible: z.boolean().default(false),
  search_enabled: z.boolean().default(false),
  reason: z.string().trim().max(1000).optional(),
}).strict();

const membershipPayload = z.object({
  memberId: z.uuid(),
  subscriptionId: z.uuid().optional().nullable(),
  planId: z.uuid().optional().nullable(),
  grantType: grantTypes,
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  extendDays: z.number().int().min(-3650).max(3650).optional(),
  amountReceived: z.number().finite().min(0).max(100000000).default(0),
  paymentReference: z.string().trim().max(200).optional().nullable(),
  dateReceived: z.string().datetime({ offset: true }).optional().nullable(),
  internalNote: z.string().trim().max(4000).optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
}).strict();

const actionSchema = z.object({
  action: z.enum(['assign', 'change', 'extend', 'shorten', 'renew', 'revoke', 'restore']),
}).merge(membershipPayload);

function isAdmin(access: Awaited<ReturnType<typeof authLib.getServerAccess>>) {
  return Boolean(access?.isAdmin && (access.role === 'admin' || access.role === 'super_admin'));
}

function membershipMigrationError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message || '';
  return error?.code === 'PGRST202' && /admin_(membership_action|upsert_membership_plan|delete_membership_plan)/.test(message);
}

function migrationRequiredResponse() {
  return NextResponse.json({
    error: 'Membership management is not enabled in this database yet. Apply supabase/migrations/20261009170000_membership_management.sql to the development Supabase project, then reload the schema cache.',
    code: 'MEMBERSHIP_MIGRATION_REQUIRED',
  }, { status: 503 });
}

async function requireAdmin(request: Request, mutation = false) {
  if (mutation && request.headers.get('origin') !== new URL(request.url).origin) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const access = await authLib.getServerAccess();
  if (!access) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isAdmin(access)) return { response: NextResponse.json({ error: 'Administrator access required' }, { status: 403 }) };
  return { access };
}

function statusFor(row: any, now = Date.now()) {
  if (row.payment_status === 'Cancelled') return 'cancelled';
  if (row.payment_status === 'Pending' && (!row.start_date || new Date(row.start_date).getTime() > now)) return 'pending';
  if (row.payment_status === 'Completed' && row.end_date && new Date(row.end_date).getTime() > now && (!row.start_date || new Date(row.start_date).getTime() <= now)) return 'active';
  if (row.end_date && new Date(row.end_date).getTime() <= now) return 'expired';
  return String(row.payment_status || 'pending').toLowerCase();
}

async function loadMembershipRows() {
  const [subscriptions, plans, users, profiles, offline, admins] = await Promise.all([
    supabaseAdmin.from('subscriptions').select('*').order('end_date', { ascending: true }).limit(1000),
    supabaseAdmin.from('subscription_plans').select('*').limit(500),
    supabaseAdmin.from('users').select('id,email,mobile_number,status,deleted_at').limit(1000),
    supabaseAdmin.from('profiles').select('user_id,profile_id,first_name,last_name').limit(1000),
    supabaseAdmin.from('membership_offline_payments').select('*').order('created_at', { ascending: false }).limit(2000),
    supabaseAdmin.from('admin_users').select('id,full_name,email').limit(500),
  ]);
  const error = subscriptions.error || plans.error || users.error || profiles.error || offline.error || admins.error;
  if (error) throw error;
  const planMap = new Map((plans.data || []).map((p: any) => [p.id, p]));
  const userMap = new Map((users.data || []).map((u: any) => [u.id, u]));
  const profileMap = new Map((profiles.data || []).map((p: any) => [p.user_id, p]));
  const offlineMap = new Map<string, any>();
  for (const row of offline.data || []) if (!offlineMap.has(row.subscription_id)) offlineMap.set(row.subscription_id, row);
  const adminMap = new Map((admins.data || []).map((a: any) => [a.id, a]));
  return (subscriptions.data || []).map((row: any) => {
    const user = userMap.get(row.user_id) || {};
    const profile = profileMap.get(row.user_id) || {};
    const offlineRecord = offlineMap.get(row.id) || null;
    return {
      ...row,
      status: statusFor(row),
      plan: planMap.get(row.plan_id) || null,
      member: { id: row.user_id, email: user.email || '', mobile_number: user.mobile_number || '', profile_id: profile.profile_id || '', name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed member' },
      offline_payment: offlineRecord ? { ...offlineRecord, assigned_by_admin: adminMap.get(offlineRecord.assigned_by) || null } : null,
    };
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const view = params.get('view') || 'subscriptions';
    const search = (params.get('search') || '').trim().toLowerCase();
    const status = params.get('status') || 'all';
    const planId = params.get('planId') || 'all';
    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = Math.min(100, Math.max(10, Number(params.get('pageSize') || 25)));

    if (view === 'plans') {
      const { data, error } = await supabaseAdmin.from('subscription_plans').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const assignableOnly = params.get('eligible') === 'assignable';
      // Older installations may not have applied the active-status migration yet.
      // Treat a missing flag as active for catalogue compatibility; an explicit false
      // remains unavailable for new assignments and is revalidated by the write RPC.
      const plans = (data || []).map((plan: any) => ({ ...plan, is_active: plan.is_active !== false }));
      return NextResponse.json({ plans: assignableOnly ? plans.filter((plan: any) => plan.is_active) : plans, eligibleOnly: assignableOnly }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'members') {
      const [users, profiles, subscriptions] = await Promise.all([
        supabaseAdmin.from('users').select('id,email,mobile_number,status,deleted_at').eq('status', 'active').is('deleted_at', null).limit(1000),
        supabaseAdmin.from('profiles').select('user_id,profile_id,first_name,last_name').limit(1000),
        supabaseAdmin.from('subscriptions').select('*, plan:subscription_plans(*)').order('created_at', { ascending: false }).limit(2000),
      ]);
      const error = users.error || profiles.error || subscriptions.error;
      if (error) throw error;
      const profileMap = new Map((profiles.data || []).map((p: any) => [p.user_id, p]));
      const currentMap = new Map<string, any>();
      for (const row of subscriptions.data || []) if (!currentMap.has(row.user_id) && statusFor(row) === 'active') currentMap.set(row.user_id, row);
      const members = (users.data || []).map((user: any) => {
        const profile = profileMap.get(user.id) || {};
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        return { id: user.id, email: user.email || '', mobile_number: user.mobile_number || '', profile_id: profile.profile_id || '', name: name || 'Unnamed member', current_subscription: currentMap.get(user.id) || null };
      }).filter((member: any) => !search || [member.id, member.email, member.mobile_number, member.profile_id, member.name].some((value) => String(value).toLowerCase().includes(search)));
      return NextResponse.json({ members: members.slice(0, 100) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'audit') {
      const { data, error } = await supabaseAdmin.from('membership_audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return NextResponse.json({ audit: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'offline') {
      const { data, error } = await supabaseAdmin.from('membership_offline_payments').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return NextResponse.json({ offline: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let rows = await loadMembershipRows();
    rows = rows.filter((row: any) => (!search || [row.member.profile_id, row.member.name, row.member.email, row.member.mobile_number, row.user_id].some((value) => String(value).toLowerCase().includes(search))) && (status === 'all' || row.status === status) && (planId === 'all' || row.plan_id === planId));
    rows.sort((a: any, b: any) => new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime());
    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({ subscriptions: paged, total, page, pageSize }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin membership GET failed', error);
    return NextResponse.json({ error: 'Could not load membership records.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request, true);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  try {
    if (action === 'plan_create' || action === 'plan_update') {
      const parsed = planSchema.safeParse(body?.plan);
      if (!parsed.success) return NextResponse.json({ error: 'Check the plan fields.' }, { status: 400 });
      const planId = action === 'plan_update' ? z.uuid().safeParse(body?.planId) : { success: true, data: null };
      if (!planId.success) return NextResponse.json({ error: 'Plan ID is invalid.' }, { status: 400 });
      const { data, error } = await supabaseAdmin.rpc('admin_upsert_membership_plan', { actor_auth: auth.access!.user.id, target_plan: planId.data, plan_payload: parsed.data });
      if (membershipMigrationError(error)) return migrationRequiredResponse();
      if (error) return NextResponse.json({ error: error.message || 'Plan could not be saved.' }, { status: 409 });
      return NextResponse.json({ success: true, plan: data });
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Check the membership fields.' }, { status: 400 });
    const input = parsed.data;
    if (input.action === 'revoke' && !input.reason?.trim() && !input.internalNote?.trim()) return NextResponse.json({ error: 'A reason is required to revoke access.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('admin_membership_action', {
      actor_auth: auth.access!.user.id,
      action_name: input.action,
      target_user: input.memberId,
      target_subscription: input.subscriptionId || null,
      target_plan: input.planId || null,
      action_payload: {
        grant_type: input.grantType,
        start_date: input.startDate,
        end_date: input.endDate || null,
        extend_days: input.extendDays ?? null,
        amount_received: input.amountReceived,
        payment_reference: input.paymentReference || null,
        date_received: input.dateReceived || null,
        internal_note: input.internalNote || null,
        reason: input.reason || null,
      },
    });
    if (membershipMigrationError(error)) return migrationRequiredResponse();
    if (error) return NextResponse.json({ error: error.message || 'Membership change could not be saved.' }, { status: 409 });
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Admin membership mutation failed', error);
    return NextResponse.json({ error: 'Membership change could not be saved.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request, true);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const planId = z.uuid().safeParse(body?.planId);
  if (!planId.success) return NextResponse.json({ error: 'Plan ID is invalid.' }, { status: 400 });
  const reason = z.string().trim().max(1000).optional().safeParse(body?.reason);
  if (!reason.success) return NextResponse.json({ error: 'Delete reason is invalid.' }, { status: 400 });
  const { data, error } = await supabaseAdmin.rpc('admin_delete_membership_plan', { actor_auth: auth.access!.user.id, target_plan: planId.data, reason_text: reason.data || null });
  if (membershipMigrationError(error)) return migrationRequiredResponse();
  if (error) return NextResponse.json({ error: error.message || 'Plan cannot be deleted while it is in use.' }, { status: 409 });
  return NextResponse.json({ success: true, result: data });
}
