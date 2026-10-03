import { supabase } from '@/lib/supabase';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

const seedMockMonetization = () => {
  if (typeof window === 'undefined') return;
  
  const existingPayments = localStorage.getItem('gokul_mock_payments');
  if (existingPayments) return; // Already seeded

  const defaultPlans = [
    {
      id: '0ffd3070-7aba-4554-8790-93c76b318df6',
      name: 'Startup Plan',
      price: 0,
      duration_days: 3650,
      features: { chat_access: false, contact_viewing: false }
    },
    {
      id: '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf',
      name: 'Silver Plan',
      price: 1499,
      duration_days: 30,
      features: { chat_access: true, contact_viewing: true }
    },
    {
      id: 'd50e37d5-21df-454b-8ed8-0e7ddb33827c',
      name: 'Gold Plan',
      price: 2999,
      duration_days: 90,
      features: { chat_access: true, contact_viewing: true }
    },
    {
      id: 'b987dc02-0102-4279-b787-50987762532b',
      name: 'Diamond Plan',
      price: 5999,
      duration_days: 180,
      features: { chat_access: true, contact_viewing: true }
    }
  ];
  localStorage.setItem('gokul_mock_subscription_plans', JSON.stringify(defaultPlans));

  const defaultProfiles = [
    { user_id: 'mock-user-1', first_name: 'Ramesh', last_name: 'Sundar', gender: 'Male', city: 'Chennai', age: 28, caste: 'Iyer', is_premium: true, is_verified: true, profile_id: 'GV100201' },
    { user_id: 'mock-user-2', first_name: 'Lakshmi', last_name: 'Narayanan', gender: 'Female', city: 'Coimbatore', age: 25, caste: 'Pillai', is_premium: true, is_verified: true, profile_id: 'GV100202' },
    { user_id: 'mock-user-3', first_name: 'Vijay', last_name: 'Kumar', gender: 'Male', city: 'Bangalore', age: 30, caste: 'Naidu', is_premium: true, is_verified: true, profile_id: 'GV100203' },
    { user_id: 'mock-user-4', first_name: 'Anitha', last_name: 'Gopalan', gender: 'Female', city: 'Madurai', age: 26, caste: 'Chettiar', is_premium: false, is_verified: true, profile_id: 'GV100204' },
    { user_id: 'mock-user-5', first_name: 'Srinivasan', last_name: 'K.', gender: 'Male', city: 'Trichy', age: 29, caste: 'Iyengar', is_premium: true, is_verified: false, profile_id: 'GV100205' },
    { user_id: 'mock-user-6', first_name: 'Meenakshi', last_name: 'N.', gender: 'Female', city: 'Salem', age: 24, caste: 'Mudaliar', is_premium: false, is_verified: false, profile_id: 'GV100206' }
  ];
  localStorage.setItem('gokul_mock_profiles', JSON.stringify(defaultProfiles));

  const defaultUsers = [
    { id: 'mock-user-1', email: 'ramesh@gmail.com', role: 'user', status: 'active' },
    { id: 'mock-user-2', email: 'lakshmi@gmail.com', role: 'user', status: 'active' },
    { id: 'mock-user-3', email: 'vijay@gmail.com', role: 'user', status: 'active' },
    { id: 'mock-user-4', email: 'anitha@gmail.com', role: 'user', status: 'active' },
    { id: 'mock-user-5', email: 'srinivasan@gmail.com', role: 'user', status: 'active' },
    { id: 'mock-user-6', email: 'meenakshi@gmail.com', role: 'user', status: 'active' }
  ];
  localStorage.setItem('gokul_mock_users', JSON.stringify(defaultUsers));

  const payments: any[] = [];
  const subscriptions: any[] = [];
  const transactions: any[] = [];

  const plans = defaultPlans;
  const userIds = ['mock-user-1', 'mock-user-2', 'mock-user-3', 'mock-user-5'];
  
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const payDate = new Date();
    payDate.setDate(now.getDate() - i);
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const plan = plans[1 + Math.floor(Math.random() * (plans.length - 1))];
    
    const isCompleted = Math.random() > 0.15;
    const payId = 'pay_' + Math.random().toString(36).substr(2, 9);
    const orderId = 'order_' + Math.random().toString(36).substr(2, 9);
    
    const payment = {
      id: payId,
      user_id: userId,
      amount: plan.price,
      currency: 'INR',
      status: isCompleted ? 'completed' : 'failed',
      payment_type: 'subscription',
      razorpay_order_id: orderId,
      razorpay_payment_id: isCompleted ? 'pay_g' + Math.random().toString(36).substr(2, 7) : null,
      razorpay_subscription_id: 'sub_g' + Math.random().toString(36).substr(2, 7),
      created_at: payDate.toISOString(),
      updated_at: payDate.toISOString()
    };
    payments.push(payment);

    if (isCompleted) {
      const start = new Date(payDate);
      const end = new Date(payDate);
      end.setDate(start.getDate() + plan.duration_days);

      const isExpired = end < now;
      const subStatus = isExpired ? 'Expired' : 'Completed';

      const subscription = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        plan_id: plan.id,
        payment_status: subStatus,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_subscription_id: payment.razorpay_subscription_id,
        created_at: start.toISOString(),
        updated_at: now.toISOString()
      };
      subscriptions.push(subscription);

      const txId = 'txn_' + Math.random().toString(36).substr(2, 9);
      const invoiceNum = `INV-${payDate.getFullYear()}-${1000 + transactions.length}`;
      let tax = 0;
      let subtotal = plan.price;
      if (Math.abs(plan.price - 1499) < 2) {
        subtotal = 1270;
        tax = 229;
      } else if (Math.abs(plan.price - 2999) < 2) {
        subtotal = 2542;
        tax = 457;
      } else if (Math.abs(plan.price - 5999) < 2) {
        subtotal = 5084;
        tax = 915;
      } else if (Math.abs(plan.price - 199) < 2) {
        subtotal = 169;
        tax = 30;
      } else {
        tax = Math.round(plan.price * 0.18);
        subtotal = plan.price - tax;
      }

      const transaction = {
        id: txId,
        user_id: userId,
        payment_id: payId,
        invoice_number: invoiceNum,
        amount: subtotal,
        tax: tax,
        total_amount: plan.price,
        description: `Premium Subscription Activation: ${plan.name}`,
        status: 'completed',
        created_at: payDate.toISOString()
      };
      transactions.push(transaction);
    } else {
      const start = new Date(payDate);
      const end = new Date(payDate);
      end.setDate(start.getDate() + plan.duration_days);

      const subscription = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        plan_id: plan.id,
        payment_status: 'Failed',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        razorpay_payment_id: null,
        razorpay_subscription_id: payment.razorpay_subscription_id,
        created_at: start.toISOString(),
        updated_at: now.toISOString()
      };
      subscriptions.push(subscription);
    }
  }

  localStorage.setItem('gokul_mock_payments', JSON.stringify(payments));
  localStorage.setItem('gokul_mock_subscriptions', JSON.stringify(subscriptions));
  localStorage.setItem('gokul_mock_transactions', JSON.stringify(transactions));
};

export const adminService = {
  async getAuditLogs() {
    return [];
  },

  async getAdminStats() {
    try {
      if (isMockMode()) {
        return { data: {
          totalUsers: 1420,
          newRegistrations: 28,
          premiumMembers: 312,
          pendingApprovals: 8,
          horoscopesPending: 12,
          activeMatches: 654,
          revenueThisMonth: 148500
        }, error: null };
      }

      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: pendingApprovals } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false);
      const { count: premiumMembers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      const { count: horoscopesPending } = await supabase.from('horoscope_uploads').select('*', { count: 'exact', head: true });

      const { data: subscriptions } = await supabase.from('subscriptions').select('plan_id, payment_status');
      const revenueThisMonth = (subscriptions || [])
        .filter(s => s.payment_status === 'Completed')
        .length * 4999;

      return {
        data: {
          totalUsers: totalUsers || 0,
          newRegistrations: 28,
          premiumMembers: premiumMembers || 0,
          pendingApprovals: pendingApprovals || 0,
          horoscopesPending: horoscopesPending || 0,
          activeMatches: 654,
          revenueThisMonth
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getPendingProfiles() {
    try {
      if (isMockMode()) {
        return { data: [
          { id: 1, name: 'Srinivasan K.', age: 27, gender: 'Male', caste: 'Iyer', location: 'Chennai', date: '2 hours ago' },
          { id: 2, name: 'Meenakshi N.', age: 24, gender: 'Female', caste: 'Pillai', location: 'Madurai', date: '4 hours ago' },
          { id: 3, name: 'Balaji R.', age: 29, gender: 'Male', caste: 'Naidu', location: 'Bangalore', date: '1 day ago' },
          { id: 4, name: 'Gayathri S.', age: 25, gender: 'Female', caste: 'Chettiar', location: 'Coimbatore', date: '1 day ago' }
        ], error: null };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_verified', false);
      
      const formatted = data?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: `${p.first_name} ${p.last_name}`,
        age: p.age,
        gender: p.gender,
        caste: p.caste,
        location: p.city,
        date: 'Recently'
      }));

      return { data: formatted || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async approveProfile(userId: string) {
    try {
      if (isMockMode()) {
        return { success: true };
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', userId);
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getPendingHoroscopes() {
    try {
      if (isMockMode()) {
        return { data: [
          { id: 101, name: 'Venkatesh Prasad', star: 'Aswini', rasi: 'Mesham', url: '#', date: '5 hours ago' },
          { id: 102, name: 'Anitha Gopalan', star: 'Krittika', rasi: 'Rishabham', url: '#', date: '1 day ago' }
        ], error: null };
      }

      const { data: uploads, error: uploadErr } = await supabase
        .from('horoscope_uploads')
        .select('*');
      
      if (uploadErr || !uploads || uploads.length === 0) {
        return { data: [], error: uploadErr };
      }

      const userIds = uploads.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const formatted = uploads.map(u => {
        const profile = profiles?.find(p => p.user_id === u.user_id);
        return {
          id: u.id,
          name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
          star: profile?.nakshatra || 'N/A',
          rasi: profile?.rasi || 'N/A',
          url: u.file_url,
          date: 'Recently'
        };
      });

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async verifyHoroscope(uploadId: string) {
    try {
      if (isMockMode()) {
        return { success: true };
      }
      const { error } = await supabase
        .from('horoscope_uploads')
        .delete()
        .eq('id', uploadId);
      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },

  // ==========================================
  // MONETIZATION & SUBSCRIPTIONS ANALYTICS API
  // ==========================================

  async getMonetizationStats() {
    try {
      if (isMockMode()) {
        seedMockMonetization();
        const payments = JSON.parse(localStorage.getItem('gokul_mock_payments') || '[]');
        const subscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
        const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');

        const now = new Date();
        const activeSubs = subscriptions.filter(
          (s: any) => s.payment_status === 'Completed' && new Date(s.end_date) > now
        );
        const failedPayments = payments.filter((p: any) => p.status === 'failed');
        const completedPayments = payments.filter((p: any) => p.status === 'completed');
        
        const totalRevenue = completedPayments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
        const premiumUsers = profiles.filter((p: any) => p.is_premium).length;

        // MRR is sum of active subscription equivalent value
        // Silver 1499/30d (~1499/mo), Gold 2999/90d (~1000/mo), Diamond 5999/180d (~1000/mo)
        const planPricing: Record<string, number> = {
          '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf': 1499, // Silver
          'd50e37d5-21df-454b-8ed8-0e7ddb33827c': 1000, // Gold
          'b987dc02-0102-4279-b787-50987762532b': 1000, // Diamond
        };

        const mrr = activeSubs.reduce((acc: number, sub: any) => {
          const val = planPricing[sub.plan_id] || 0;
          return acc + val;
        }, 0);

        // Daily revenue trend (last 30 days)
        const dailyRevenue: Record<string, number> = {};
        const dailyGrowth: Record<string, number> = {};
        const plansSplit: Record<string, number> = { Silver: 0, Gold: 0, Diamond: 0 };
        
        const plansMap: Record<string, string> = {
          '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf': 'Silver',
          'd50e37d5-21df-454b-8ed8-0e7ddb33827c': 'Gold',
          'b987dc02-0102-4279-b787-50987762532b': 'Diamond'
        };

        // Initialize 30 days history
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateString = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          dailyRevenue[dateString] = 0;
          dailyGrowth[dateString] = 0;
        }

        completedPayments.forEach((p: any) => {
          const dateString = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          if (dateString in dailyRevenue) {
            dailyRevenue[dateString] += Number(p.amount);
          }
        });

        activeSubs.forEach((sub: any) => {
          const planName = plansMap[sub.plan_id] || 'Gold';
          plansSplit[planName] = (plansSplit[planName] || 0) + 1;
        });

        // Compute cumulative growth mock trend
        let runningSubs = activeSubs.length - 12;
        Object.keys(dailyGrowth).forEach((dateStr, index) => {
          runningSubs += Math.floor(Math.random() * 2);
          dailyGrowth[dateStr] = Math.max(runningSubs, 0);
        });

        const revenueChartData = Object.entries(dailyRevenue).map(([date, amount]) => ({
          date,
          amount
        }));

        const growthChartData = Object.entries(dailyGrowth).map(([date, activeSubscribers]) => ({
          date,
          activeSubscribers
        }));

        const planDistributionData = Object.entries(plansSplit).map(([name, count]) => ({
          name,
          value: count
        }));

        return {
          data: {
            stats: {
              totalRevenue,
              activeSubscriptions: activeSubs.length,
              failedPayments: failedPayments.length,
              premiumUsers,
              mrr
            },
            charts: {
              revenueChartData,
              growthChartData,
              planDistributionData
            }
          },
          error: null
        };
      }

      // Supabase Active Live Mode
      const { data: payments } = await supabase.from('payments').select('*');
      const { data: subscriptions } = await supabase.from('subscriptions').select('*, plan:subscription_plans(*)');
      const { count: premiumCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      
      const now = new Date();
      const completed = (payments || []).filter(p => p.status === 'completed');
      const failed = (payments || []).filter(p => p.status === 'failed');
      const totalRevenue = completed.reduce((acc, p) => acc + Number(p.amount), 0);

      const activeSubs = (subscriptions || []).filter(
        s => s.payment_status === 'Completed' && new Date(s.end_date) > now
      );

      const mrr = activeSubs.reduce((acc, s: any) => {
        const price = Number(s.plan?.price || 0);
        const duration = Number(s.plan?.duration_days || 30);
        const monthlyEquivalent = (price / duration) * 30;
        return acc + Math.round(monthlyEquivalent);
      }, 0);

      const dailyRevenue: Record<string, number> = {};
      const dailyGrowth: Record<string, number> = {};
      const plansSplit: Record<string, number> = { Silver: 0, Gold: 0, Diamond: 0 };

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateString = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dailyRevenue[dateString] = 0;
        dailyGrowth[dateString] = 0;
      }

      completed.forEach(p => {
        const dateString = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dateString in dailyRevenue) {
          dailyRevenue[dateString] += Number(p.amount);
        }
      });

      activeSubs.forEach((sub: any) => {
        const name = sub.plan?.name || 'Gold Plan';
        const cleanName = name.replace(' Plan', '');
        plansSplit[cleanName] = (plansSplit[cleanName] || 0) + 1;
      });

      let subAccumulator = 0;
      Object.keys(dailyGrowth).forEach(dateStr => {
        const matchedActiveCount = (subscriptions || []).filter((s: any) => {
          const createdStr = new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return createdStr === dateStr && s.payment_status === 'Completed';
        }).length;
        subAccumulator += matchedActiveCount;
        dailyGrowth[dateStr] = Math.max(activeSubs.length - 10 + subAccumulator, 0);
      });

      return {
        data: {
          stats: {
            totalRevenue,
            activeSubscriptions: activeSubs.length,
            failedPayments: failed.length,
            premiumUsers: premiumCount || 0,
            mrr
          },
          charts: {
            revenueChartData: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
            growthChartData: Object.entries(dailyGrowth).map(([date, activeSubscribers]) => ({ date, activeSubscribers })),
            planDistributionData: Object.entries(plansSplit).map(([name, count]) => ({ name, value: count }))
          }
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getPaymentLogs() {
    try {
      if (isMockMode()) {
        seedMockMonetization();
        const payments = JSON.parse(localStorage.getItem('gokul_mock_payments') || '[]');
        const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');

        const formatted = payments.map((p: any) => {
          const profile = profiles.find((prof: any) => prof.user_id === p.user_id);
          return {
            id: p.id,
            user_id: p.user_id,
            user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
            user_email: `${profile?.first_name?.toLowerCase() || 'member'}@gmail.com`,
            amount: p.amount,
            status: p.status,
            payment_type: p.payment_type || 'subscription',
            razorpay_payment_id: p.razorpay_payment_id || 'N/A',
            razorpay_order_id: p.razorpay_order_id || 'N/A',
            created_at: p.created_at
          };
        });

        formatted.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { data: formatted, error: null };
      }

      const { data: pays, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error || !pays) return { data: [], error };

      const userIds = pays.map(p => p.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const { data: users } = await supabase.from('users').select('*').in('id', userIds);

      const formatted = pays.map(p => {
        const profile = profiles?.find(prof => prof.user_id === p.user_id);
        const user = users?.find(u => u.id === p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
          user_email: user?.email || 'N/A',
          amount: Number(p.amount),
          status: p.status,
          payment_type: p.payment_type,
          razorpay_payment_id: p.razorpay_payment_id || 'N/A',
          razorpay_order_id: p.razorpay_order_id || 'N/A',
          created_at: p.created_at
        };
      });

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async getSubscriptionLogs() {
    try {
      if (isMockMode()) {
        seedMockMonetization();
        const subscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
        const plans = JSON.parse(localStorage.getItem('gokul_mock_subscription_plans') || '[]');
        const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');

        const formatted = subscriptions.map((s: any) => {
          const profile = profiles.find((prof: any) => prof.user_id === s.user_id);
          const plan = plans.find((p: any) => p.id === s.plan_id);
          return {
            id: s.id,
            user_id: s.user_id,
            user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
            user_email: `${profile?.first_name?.toLowerCase() || 'member'}@gmail.com`,
            plan_name: plan ? plan.name : 'Silver Plan',
            plan_price: plan ? plan.price : 1999,
            payment_status: s.payment_status,
            start_date: s.start_date,
            end_date: s.end_date,
            razorpay_subscription_id: s.razorpay_subscription_id || 'N/A',
            created_at: s.created_at
          };
        });

        formatted.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { data: formatted, error: null };
      }

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .order('created_at', { ascending: false });

      if (error || !subs) return { data: [], error };

      const userIds = subs.map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const { data: users } = await supabase.from('users').select('*').in('id', userIds);

      const formatted = subs.map((s: any) => {
        const profile = profiles?.find(prof => prof.user_id === s.user_id);
        const user = users?.find(u => u.id === s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
          user_email: user?.email || 'N/A',
          plan_name: s.plan?.name || 'Gold Plan',
          plan_price: Number(s.plan?.price || 4999),
          payment_status: s.payment_status,
          start_date: s.start_date,
          end_date: s.end_date,
          razorpay_subscription_id: s.razorpay_subscription_id || 'N/A',
          created_at: s.created_at
        };
      });

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async cancelSubscriptionAdmin(subscriptionId: string) {
    try {
      if (isMockMode()) {
        const subscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
        const updated = subscriptions.map((s: any) => {
          if (s.id === subscriptionId) {
            return { ...s, payment_status: 'Expired', end_date: new Date().toISOString() };
          }
          return s;
        });
        localStorage.setItem('gokul_mock_subscriptions', JSON.stringify(updated));
        
        const sub = subscriptions.find((s: any) => s.id === subscriptionId);
        if (sub) {
          const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
          const updatedProfiles = profiles.map((p: any) => {
            if (p.user_id === sub.user_id) {
              return { ...p, is_premium: false };
            }
            return p;
          });
          localStorage.setItem('gokul_mock_profiles', JSON.stringify(updatedProfiles));
        }

        return { success: true, error: null };
      }

      const { data: subData, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();
      
      if (fetchErr || !subData) throw new Error('Subscription not found');

      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({ payment_status: 'Expired', end_date: new Date().toISOString() })
        .eq('id', subscriptionId);

      if (updateErr) throw updateErr;

      await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('user_id', subData.user_id);

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || err };
    }
  },

  async extendSubscriptionAdmin(subscriptionId: string, days: number) {
    try {
      if (isMockMode()) {
        const subscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
        const updated = subscriptions.map((s: any) => {
          if (s.id === subscriptionId) {
            const currentEnd = new Date(s.end_date);
            const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
            newEnd.setDate(newEnd.getDate() + days);
            return { ...s, payment_status: 'Completed', end_date: newEnd.toISOString() };
          }
          return s;
        });
        localStorage.setItem('gokul_mock_subscriptions', JSON.stringify(updated));

        const sub = subscriptions.find((s: any) => s.id === subscriptionId);
        if (sub) {
          const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
          const updatedProfiles = profiles.map((p: any) => {
            if (p.user_id === sub.user_id) {
              return { ...p, is_premium: true };
            }
            return p;
          });
          localStorage.setItem('gokul_mock_profiles', JSON.stringify(updatedProfiles));
        }

        return { success: true, error: null };
      }

      const { data: subData, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();
      
      if (fetchErr || !subData) throw new Error('Subscription not found');

      const currentEnd = new Date(subData.end_date);
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()));
      newEnd.setDate(newEnd.getDate() + days);

      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({ payment_status: 'Completed', end_date: newEnd.toISOString() })
        .eq('id', subscriptionId);

      if (updateErr) throw updateErr;

      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('user_id', subData.user_id);

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || err };
    }
  },

  async refundPaymentAdmin(_paymentId: string) {
    return {success:false,error:'Provider-confirmed refunds are not configured. Use the Razorpay dashboard and reconcile the confirmed refund before changing entitlements.'};
  },
  async getTransactions() {
    return this.getPaymentLogs();
  }
};

