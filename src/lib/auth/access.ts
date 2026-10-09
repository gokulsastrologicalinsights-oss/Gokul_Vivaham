import { createClient, type User } from '@supabase/supabase-js';

export type Access = { user: User; role: string; isAdmin: boolean; mfaRequired: boolean };

// Every request verifies its own token and reads trusted database permissions.
export async function resolveAccess(token: string | undefined): Promise<Access | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key || url.includes('placeholder') || key.includes('placeholder')) return null;
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return null;
    const [accountResult, profileResult, adminResult, assuranceResult] = await Promise.all([
      client.from('users').select('id,status,deleted_at').eq('auth_user_id', user.id).maybeSingle(),
      client.from('profiles').select('is_suspended,deleted_at').eq('user_id', user.id).maybeSingle(),
      client.from('admin_users').select('role,is_super_admin').eq('auth_user_id', user.id).maybeSingle(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(token),
    ]);
    const account = accountResult.data;
    if (accountResult.error || profileResult.error || adminResult.error || assuranceResult.error ||
        !account || account.status !== 'active' || account.deleted_at ||
        profileResult.data?.is_suspended || profileResult.data?.deleted_at) return null;
    const membership = adminResult.data;
    const elevated = assuranceResult.data.currentLevel === 'aal2';
    const mfaRequired = membership ? !elevated : assuranceResult.data.nextLevel === 'aal2' && !elevated;
    if (membership) {
      const role = membership.is_super_admin ? 'super_admin' : membership.role === 'moderator' ? 'moderator' : 'admin';
      return { user, role, isAdmin: elevated, mfaRequired };
    }
    const { data: subscription, error: subscriptionError } = await client.from('subscriptions')
      .select('plan:subscription_plans(name)').eq('user_id', account.id)
      .eq('payment_status', 'Completed').lte('start_date', new Date().toISOString()).gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (subscriptionError) return null;
    const plan = subscription?.plan as unknown as { name: string } | null;
    const name = plan?.name?.toLowerCase() || '';
    const role = name.includes('diamond') ? 'diamond' : name.includes('gold') ? 'gold' : name.includes('silver') ? 'silver' : 'user';
    return { user, role, isAdmin: false, mfaRequired };
  } catch { return null; }
}
