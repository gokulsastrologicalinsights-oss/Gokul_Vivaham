import { supabase } from '@/lib/supabase';

export const profileService = {
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async createUser(userData: { id: string; auth_user_id: string; email: string; mobile_number?: string }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          auth_user_id: userData.auth_user_id,
          email: userData.email,
          role: 'user',
          status: 'active'
        })
        .select()
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async createProfile(profileData: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async updateProfile(userId: string, data: any) {
    try {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      return { data: updated, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async createPartnerPreferences(prefData: any) {
    try {
      const { data, error } = await supabase
        .from('partner_preferences')
        .insert(prefData)
        .select()
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async createHoroscopeUpload(uploadData: { user_id: string; file_url: string; file_name: string; file_type: string }) {
    try {
      const { data, error } = await supabase
        .from('horoscope_uploads')
        .insert(uploadData)
        .select()
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
  
  async createGalleryImage(imageData: { user_id: string; image_url: string; is_profile_picture: boolean; is_private: boolean }) {
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .insert(imageData)
        .select()
        .maybeSingle();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
};
