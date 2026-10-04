import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';

/** Resolve plan key from a plan name string */
function resolvePlanKey(planName: string): string {
  const n = planName.toLowerCase();
  if (n.includes('diamond')) return 'DIAMOND';
  if (n.includes('gold')) return 'GOLD';
  if (n.includes('silver')) return 'SILVER';
  return 'FREE';
}


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
  /**
   * Checks whether the current user has remaining free consultation credits.
   * Returns { allowed, used, limit, remaining }.
   */
  async checkFreeConsultationCredit(dbUserId: string): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    planName: string;
  }> {
    try {
      // Fetch active subscription
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(name)')
        .eq('user_id', dbUserId)
        .eq('payment_status', 'Completed')
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSub) {
        return { allowed: false, used: 0, limit: 0, remaining: 0, planName: 'Startup Plan' };
      }

      const planKey = resolvePlanKey(activeSub.plan?.name || '');
      const limit = SUBSCRIPTION_PLANS[planKey]?.entitlements?.consultations_limit ?? 0;
      const planName = SUBSCRIPTION_PLANS[planKey]?.name || 'Unknown Plan';

      if (limit === 0) {
        return { allowed: false, used: 0, limit: 0, remaining: 0, planName };
      }

      // Count used consultations since subscription start
      const { count } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', dbUserId)
        .eq('action', 'use_free_consultation')
        .gte('created_at', activeSub.start_date);

      const used = count || 0;
      const remaining = Math.max(0, limit - used);
      return { allowed: remaining > 0, used, limit, remaining, planName };
    } catch (err: any) {
      console.error('checkFreeConsultationCredit error:', err);
      return { allowed: false, used: 0, limit: 0, remaining: 0, planName: 'Unknown' };
    }
  },

  /**
   * Records a free consultation usage event in activity_logs.
   * Call this after a successful free consultation booking.
   */
  async logFreeConsultationUsed(dbUserId: string, bookingId?: string): Promise<void> {
    try {
      await supabase.from('activity_logs').insert({
        user_id: dbUserId,
        action: 'use_free_consultation',
        metadata: { booking_id: bookingId || null },
      });
    } catch (err) {
      console.error('logFreeConsultationUsed error:', err);
    }
  },
};
export type ConsultationService = typeof consultationService;
