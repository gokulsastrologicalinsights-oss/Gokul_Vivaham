import { create } from 'zustand';
import { clearServerSession } from '@/lib/auth/session-client';
import { supabase } from '@/lib/supabase/client';
import { queryClient } from '@/lib/query/query-client';
import { useProfileStore } from './profileStore';
import { useMatchStore } from './matchStore';
import { useChatStore } from './chatStore';
import { useNotificationStore } from './notificationStore';
import { useSubscriptionStore } from './subscriptionStore';
import { useAdminStore } from './adminStore';

export interface AuthState {
  user: any;
  session: any;
  role: string;
  loading: boolean;
  setUser: (user: any) => void;
  setSession: (session: any) => void;
  setRole: (role: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export function resetMemberStores() {
  useProfileStore.setState({ profile: null });
  useMatchStore.setState({ matches: [] });
  useChatStore.setState({ conversations: [], activeChat: null });
  useNotificationStore.setState({ notifications: [] });
  useSubscriptionStore.setState({ plan: 'Free' });
  useAdminStore.setState({ users: [] });
  queryClient.clear();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: 'user',
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user || null }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    await clearServerSession();
    // Only call signOut if a session exists to prevent infinite callbacks
    const currentSession = useAuthStore.getState().session;
    if (currentSession) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }

    // 1. Reset other Zustand stores to avoid stale state crossover/leak on logout
    resetMemberStores();

    // 2. Clear React Query cache
    try {
      queryClient.clear();
    } catch (err) {
      console.error('Failed to clear React Query cache:', err);
    }

    // 3. Clear localStorage, sessionStorage, and cookies
    if (typeof window !== 'undefined') {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('gokul_mock_')) localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('Storage clear error:', err);
      }

      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `supabase-auth-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;

      // 4. Replace the current history entry so the public homepage is the
      // only landing page shown after a successful logout.
      window.location.replace('/');
    }

    set({ user: null, session: null, role: 'user', loading: false });
  }
}));
