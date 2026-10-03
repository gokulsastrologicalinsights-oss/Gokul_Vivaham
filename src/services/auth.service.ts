import { authClient } from '@/lib/auth/auth-client';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const authService = {
  async signUp(email: string, password: string, fullName: string, metadata?: any) {
    try {
      const { data, error } = await authClient.signUp(email, password, fullName, metadata);

      // Dev mock fallback
      if (error && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
        const mockId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
        return {
          data: {
            user: {
              email,
              id: mockId,
              user_metadata: { full_name: fullName, role: 'user', ...metadata }
            },
            session: { access_token: 'mock-token-' + mockId, user: { email, id: mockId } }
          },
          error: null
        };
      }
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async signInWithPassword(email: string, password: string) {
    try {
      const { data, error } = await authClient.signInWithPassword(email, password);
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async signInWithOAuth(provider: 'google') {
    try {
      const { data, error } = await authClient.signInWithOAuth(provider);
      if (error && process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
        return { data: { url: '/dashboard' }, error: null };
      }
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async signOut() {
    return await authClient.signOut();
  },

  async getSession() {
    return await supabase.auth.getSession();
  },

  async checkEmailRegistered(email: string): Promise<boolean> {
    try {
      const configured = isSupabaseConfigured();

      if (!configured) {
        if (typeof window !== 'undefined') {
          const users = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
          return users.some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        }
        return false;
      }

      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error('Failed to check email registration status');
      }
      const data = await res.json();
      return !!data.registered;
    } catch (err) {
      console.error('Error checking email registration:', err);
      throw err;
    }
  }
};

