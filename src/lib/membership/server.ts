import 'server-only';

import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export type MemberContext = {
  authUserId: string;
  memberId: string;
  isAdmin: boolean;
};

export async function requireMember(): Promise<MemberContext | null> {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return null;

  const { data: member, error } = await supabaseAdmin
    .from('users')
    .select('id,status,deleted_at')
    .eq('auth_user_id', access.user.id)
    .maybeSingle();

  if (error || !member || member.status !== 'active' || member.deleted_at) return null;
  return { authUserId: access.user.id, memberId: member.id, isAdmin: access.isAdmin };
}

export function membershipError(error: unknown): { message: string; status: number } {
  const raw = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : String(error || '');

  if (/schema cache|could not find the function|PGRST202/i.test(raw)) {
    return { message: 'Membership services are temporarily unavailable.', status: 503 };
  }
  if (/limit reached/i.test(raw)) return { message: raw, status: 429 };
  if (/required|not included|not available/i.test(raw)) return { message: raw, status: 403 };
  if (/unavailable|not found/i.test(raw)) return { message: raw, status: 404 };
  if (/idempotency|valid|future|reason/i.test(raw)) return { message: raw, status: 400 };
  return { message: 'The membership operation could not be completed.', status: 409 };
}

export async function getMemberEntitlements(memberId: string) {
  const { data, error } = await supabaseAdmin.rpc('get_member_entitlements', { actor: memberId });
  if (error) throw error;
  return data as Record<string, unknown>;
}
