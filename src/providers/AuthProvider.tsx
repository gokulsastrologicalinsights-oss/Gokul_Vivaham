'use client';

import { ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, resetMemberStores } from '@/stores/authStore';
import { syncServerSession, clearServerSession } from '@/lib/auth/session-client';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setRole = useAuthStore((state) => state.setRole);
  useEffect(() => {
    let generation = 0;
    let previousUserId: string | undefined;
    let active = true;
    const synchronize = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const current = ++generation;
      if (previousUserId !== session?.user.id) resetMemberStores();
      previousUserId = session?.user.id;
      setSession(session);
      setRole('user');
      try {
        if (session) {
          const access = await syncServerSession(session.access_token);
          if (active && current === generation) setRole(access.role);
        } else {
          await clearServerSession();
        }
      } catch {
        if (active && current === generation) setRole('user');
      } finally {
        if (active && current === generation) setLoading(false);
      }
    };
    // Keep the callback synchronous; Supabase authentication methods must not
    // be awaited inside its auth event lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void synchronize(session);
    });
    void supabase.auth.getSession().then(({ data }) => synchronize(data.session));
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, [setSession, setLoading, setRole]);
  return <>{children}</>;
}
