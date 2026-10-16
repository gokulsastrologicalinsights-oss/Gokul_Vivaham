import 'server-only';
import { createRequestClient } from '@/lib/supabase/server';

// Use the request JWT, never supabaseAdmin: the database derives the viewer.
// Fail closed on schema-cache, network and authorization errors.
export async function canDiscoverProfile(targetUserId: string): Promise<boolean> {
  const client = await createRequestClient();
  const { data, error } = await client.rpc('can_discover_profile', { target_user: targetUserId });
  return !error && data === true;
}
