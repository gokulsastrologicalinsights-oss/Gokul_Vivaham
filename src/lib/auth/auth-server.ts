import { supabaseAdmin } from '../supabase/server';

export const authServer = {
  async getUser(token: string) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  },

  async getUserRole(userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (error || !data) return 'user';
    return data.role || 'user';
  }
};
