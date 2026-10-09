import { supabase } from '@/lib/supabase';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export const subscriptionService = {
  async getBillingLogs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .select('id,user_id,plan_id,payment_status,start_date,end_date,grant_type,razorpay_payment_id,razorpay_subscription_id,created_at,updated_at,plan:subscription_plans(id,name,description,price,duration_days,features,is_active,contact_view_limit,messaging_enabled,profile_visibility_benefit,photo_viewing_enabled,premium_badge_eligible,search_enabled)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async getActiveSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .select('id,user_id,plan_id,payment_status,start_date,end_date,grant_type,razorpay_payment_id,razorpay_subscription_id,created_at,updated_at,plan:subscription_plans(id,name,description,price,duration_days,features,is_active,contact_view_limit,messaging_enabled,profile_visibility_benefit,photo_viewing_enabled,premium_badge_eligible,search_enabled)')
        .eq('user_id', user.id)
        .eq('payment_status', 'Completed')
        .lte('start_date', new Date().toISOString())
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getTransactions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .select('id,user_id,payment_id,invoice_number,amount,tax,total_amount,description,status,created_at,billing_snapshot,payment:payments(razorpay_payment_id,currency,status)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async cancelSubscription() {
    try {
      const res = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || err };
    }
  },

  async runCleanup() {
    try {
      const res = await fetch('/api/payments/subscription-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run cleanup');
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || err };
    }
  }
};
