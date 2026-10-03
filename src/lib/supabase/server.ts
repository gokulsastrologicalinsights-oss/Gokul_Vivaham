import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabase as clientSupabase } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
const isMock = supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder');
if (!isMock && serviceRoleKey.includes('placeholder')) {
  throw new Error('A server-only Supabase secret key is required for backend APIs.');
}

const realAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdmin = isMock
  ? clientSupabase
  : realAdmin;

export async function createRequestClient() {
  if (isMock) {
    return clientSupabase;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value || cookieStore.get('supabase-auth-token')?.value;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
