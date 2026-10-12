import { supabase } from '@/lib/supabase';

export const consultationService = {
  /**
   * Resolves the internal database UUID of the logged-in user from the auth_user_id
   */
  async resolveDbUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      return userRow?.id || user.id;
    } catch (err) {
      console.error('Failed to resolve database user ID:', err);
      return null;
    }
  },

  /**
   * Fetches all consultation bookings for the current user.
   */
  async getUserBookings(dbUserId: string) {
    try {
      const { data, error } = await supabase
        .from('consultation_bookings')
        .select('*, payment:payments(*)')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err: any) {
      console.error('Error fetching user bookings:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Fetches user's uploaded horoscope details.
   */
  async getHoroscopeUpload(dbUserId: string) {
    try {
      const { data, error } = await supabase
        .from('horoscope_uploads')
        .select('*')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { data, error };
    } catch (err: any) {
      console.error('Error fetching horoscope upload:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Cancels a consultation booking (by the user).
   */
  async cancelBooking(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('consultation_bookings')
        .update({ payment_status: 'cancelled' })
        .eq('id', bookingId)
        .eq('payment_status', 'pending')
        .select()
        .single();

      return { success: !error, data, error };
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      return { success: false, error: err };
    }
  },

  /**
   * (Admin) Fetches all bookings across the platform.
   * We also fetch profiles and merge them client-side to ensure full mock DB support
   * and bypass complex SQL join limitations in the mock proxy.
   */
  async getAllBookings() {
    try {
      // 1. Fetch bookings
      const { data: bookings, error: bookingsErr } = await supabase
        .from('consultation_bookings')
        .select('*, payment:payments(*)')
        .order('consultation_date', { ascending: false });

      if (bookingsErr) throw bookingsErr;
      if (!bookings || bookings.length === 0) return { data: [], error: null };

      // 2. Fetch profiles
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_id, gender');

      if (profilesErr) console.error('Failed to load profiles:', profilesErr);

      // 3. Fetch user emails
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, email');

      if (usersErr) console.error('Failed to load users:', usersErr);

      // 4. Merge data
      const merged = bookings.map((booking: any) => {
        const profile = profiles?.find((p: any) => p.user_id === booking.user_id);
        const user = users?.find((u: any) => u.id === booking.user_id);
        return {
          ...booking,
          user_profile: profile ? {
            name: `${profile.first_name} ${profile.last_name || ''}`.trim(),
            profile_id: profile.profile_id,
            gender: profile.gender
          } : {
            name: 'Member',
            profile_id: 'GV-UNKNOWN',
            gender: 'Unknown'
          },
          user_email: user?.email || 'N/A'
        };
      });

      return { data: merged, error: null };
    } catch (err: any) {
      console.error('Error fetching admin bookings:', err);
      return { data: [], error: err };
    }
  },

  /**
   * (Admin) Updates booking status (e.g. approve or cancel).
   */
  async updateBookingStatus(bookingId: string, status: 'pending' | 'approved' | 'cancelled') {
    try {
      const { data, error } = await supabase
        .from('consultation_bookings')
        .update({ payment_status: status })
        .eq('id', bookingId)
        .select()
        .single();

      return { success: !error, data, error };
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      return { success: false, error: err };
    }
  },

  /**
   * (Admin) Reschedules a booking date.
   */
  async rescheduleBooking(bookingId: string, consultationDate: string) {
    try {
      const { data, error } = await supabase
        .from('consultation_bookings')
        .update({
          consultation_date: consultationDate
        })
        .eq('id', bookingId)
        .select()
        .single();

      return { success: !error, data, error };
    } catch (err: any) {
      console.error('Error rescheduling booking:', err);
      return { success: false, error: err };
    }
  },
};
export type ConsultationService = typeof consultationService;
