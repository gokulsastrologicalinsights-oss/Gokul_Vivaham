import { supabase } from '../supabase/client';

export const authClient = {
  async signUp(email: string, password: string, fullName: string, metadata?: any) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined,
        data: {
          full_name: fullName,
          role: 'user',
          ...metadata
        }
      }
    });
  },

  async signInWithPassword(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  async signInWithOAuth(provider: 'google') {
    return await supabase.auth.signInWithOAuth({
      provider
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async resetPasswordForEmail(email: string) {
    return await supabase.auth.resetPasswordForEmail(email);
  }
};
