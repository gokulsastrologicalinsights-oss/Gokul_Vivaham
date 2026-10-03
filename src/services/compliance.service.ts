import { supabase } from '@/lib/supabase';
import { syncServerSession } from '@/lib/auth/session-client';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

// Seed mock data for compliance in localStorage if it doesn't exist
const seedMockCompliance = () => {
  if (typeof window === 'undefined') return;

  const mockUsers = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
  const mockProfiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');

  if (mockUsers.length === 0) {
    // If not seeded yet, seed some basic users
    const defaultUsers = [
      { id: 'mock-user-1', email: 'ramesh@gmail.com', role: 'user', status: 'active' },
      { id: 'mock-user-2', email: 'lakshmi@gmail.com', role: 'user', status: 'active' },
      { id: 'mock-user-3', email: 'vijay@gmail.com', role: 'user', status: 'active' },
      { id: 'mock-user-4', email: 'anitha@gmail.com', role: 'user', status: 'active' },
      { id: 'mock-user-5', email: 'srinivasan@gmail.com', role: 'user', status: 'active' },
      { id: 'mock-user-6', email: 'meenakshi@gmail.com', role: 'user', status: 'active' }
    ];
    localStorage.setItem('gokul_mock_users', JSON.stringify(defaultUsers));
  }

  if (mockProfiles.length === 0) {
    const defaultProfiles = [
      { user_id: 'mock-user-1', first_name: 'Ramesh', last_name: 'Sundar', gender: 'Male', city: 'Chennai', age: 28, caste: 'Iyer', is_premium: true, is_verified: true, profile_id: 'GV100201' },
      { user_id: 'mock-user-2', first_name: 'Lakshmi', last_name: 'Narayanan', gender: 'Female', city: 'Coimbatore', age: 25, caste: 'Pillai', is_premium: true, is_verified: true, profile_id: 'GV100202' },
      { user_id: 'mock-user-3', first_name: 'Vijay', last_name: 'Kumar', gender: 'Male', city: 'Bangalore', age: 30, caste: 'Naidu', is_premium: true, is_verified: true, profile_id: 'GV100203' },
      { user_id: 'mock-user-4', first_name: 'Anitha', last_name: 'Gopalan', gender: 'Female', city: 'Madurai', age: 26, caste: 'Chettiar', is_premium: false, is_verified: true, profile_id: 'GV100204' },
      { user_id: 'mock-user-5', first_name: 'Srinivasan', last_name: 'K.', gender: 'Male', city: 'Trichy', age: 29, caste: 'Iyengar', is_premium: true, is_verified: false, profile_id: 'GV100205' },
      { user_id: 'mock-user-6', first_name: 'Meenakshi', last_name: 'N.', gender: 'Female', city: 'Salem', age: 24, caste: 'Mudaliar', is_premium: false, is_verified: false, profile_id: 'GV100206' }
    ];
    localStorage.setItem('gokul_mock_profiles', JSON.stringify(defaultProfiles));
  }

  const existingConsent = localStorage.getItem('gokul_mock_consent_logs');
  if (!existingConsent) {
    const initialConsentLogs = [
      {
        id: 'consent-1',
        user_id: 'mock-user-1',
        consent_type: 'eligibility',
        accepted: true,
        policy_version: '1.0',
        ip_address: '192.168.1.5',
        device_metadata: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
      },
      {
        id: 'consent-2',
        user_id: 'mock-user-1',
        consent_type: 'terms_privacy',
        accepted: true,
        policy_version: '1.0',
        ip_address: '192.168.1.5',
        device_metadata: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
      },
      {
        id: 'consent-3',
        user_id: 'mock-user-1',
        consent_type: 'data_processing',
        accepted: true,
        policy_version: '1.0',
        ip_address: '192.168.1.5',
        device_metadata: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
      },
      {
        id: 'consent-4',
        user_id: 'mock-user-1',
        consent_type: 'info_accuracy',
        accepted: true,
        policy_version: '1.0',
        ip_address: '192.168.1.5',
        device_metadata: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
      }
    ];
    localStorage.setItem('gokul_mock_consent_logs', JSON.stringify(initialConsentLogs));
  }

  const existingRequests = localStorage.getItem('gokul_mock_deletion_requests');
  if (!existingRequests) {
    const initialDeletionRequests = [
      {
        id: 'del-mock-1',
        user_id: 'mock-user-5',
        status: 'pending',
        is_permanent: true,
        requested_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        completed_at: null
      },
      {
        id: 'del-mock-2',
        user_id: 'mock-user-6',
        status: 'completed',
        is_permanent: false,
        requested_at: new Date(Date.now() - 3600000 * 96).toISOString(),
        completed_at: new Date(Date.now() - 3600000 * 90).toISOString()
      }
    ];
    localStorage.setItem('gokul_mock_deletion_requests', JSON.stringify(initialDeletionRequests));
  }
};

export const complianceService = {
  // ==========================================
  // CONSENT LOGS OPERATIONS
  // ==========================================

  async getConsentLogs(customUserId?: string) {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const logs = JSON.parse(localStorage.getItem('gokul_mock_consent_logs') || '[]');
        const targetUser = customUserId || 'mock-user-1';
        const filtered = logs.filter((l: any) => l.user_id === targetUser);
        // Sort descending by created_at
        filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { data: filtered, error: null };
      }

      // Live Supabase Mode
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: [], error: new Error('User row not found') };
      const currentUserId = customUserId || userRow.id;

      const { data, error } = await supabase
        .from('consent_logs')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err: any) {
      console.error('Error fetching consent logs:', err);
      return { data: [], error: err };
    }
  },

  async updateConsent(consentType: string, accepted: boolean, policyVersion = '1.0') {
    try {
      const ipAddress = typeof window !== 'undefined' ? '127.0.0.1' : 'server';
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'NodeJS';

      if (isMockMode()) {
        seedMockCompliance();
        const logs = JSON.parse(localStorage.getItem('gokul_mock_consent_logs') || '[]');
        const newLog = {
          id: 'consent-' + Math.random().toString(36).substr(2, 9),
          user_id: 'mock-user-1',
          consent_type: consentType,
          accepted,
          policy_version: policyVersion,
          ip_address: ipAddress,
          device_metadata: userAgent.substring(0, 100),
          created_at: new Date().toISOString()
        };
        logs.push(newLog);
        localStorage.setItem('gokul_mock_consent_logs', JSON.stringify(logs));
        return { data: newLog, error: null };
      }

      // Live Supabase Mode
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: null, error: new Error('User row not found') };
      const currentUserId = userRow.id;

      const { data, error } = await supabase
        .from('consent_logs')
        .insert({
          user_id: currentUserId,
          consent_type: consentType,
          accepted,
          policy_version: policyVersion,
          ip_address: ipAddress,
          device_metadata: userAgent.substring(0, 150)
        })
        .select()
        .single();

      return { data, error };
    } catch (err: any) {
      console.error('Error updating consent:', err);
      return { data: null, error: err };
    }
  },

  // ==========================================
  // DATA EXPORT (DOWNLOAD MY DATA)
  // ==========================================

  async exportUserData() {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const targetUserId = 'mock-user-1';
        
        const mockProfiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
        const mockUsers = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
        const mockPayments = JSON.parse(localStorage.getItem('gokul_mock_payments') || '[]');
        const mockSubscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
        const mockConsents = JSON.parse(localStorage.getItem('gokul_mock_consent_logs') || '[]');
        const mockBlocks = JSON.parse(localStorage.getItem('gokul_mock_blocks') || '[]');

        const profile = mockProfiles.find((p: any) => p.user_id === targetUserId) || {};
        const account = mockUsers.find((u: any) => u.id === targetUserId) || {};
        const payments = mockPayments.filter((p: any) => p.user_id === targetUserId);
        const subscriptions = mockSubscriptions.filter((s: any) => s.user_id === targetUserId);
        const consents = mockConsents.filter((c: any) => c.user_id === targetUserId);
        const blocks = mockBlocks.filter((b: any) => b.blocker_user_id === targetUserId);

        const exportedData = {
          export_metadata: {
            platform: 'Gokul Vivaham Matrimony',
            regulation: 'India Digital Personal Data Protection (DPDP) Act 2023',
            exported_at: new Date().toISOString(),
            status: 'Authorized Profile Data Portability Export'
          },
          user_account: {
            id: account.id,
            email: account.email,
            role: account.role,
            status: account.status
          },
          personal_profile: profile,
          preferences: {
            message: 'Default partner matching filter parameters enabled.'
          },
          consents: consents.map((c: any) => ({
            consent_type: c.consent_type,
            accepted: c.accepted,
            policy_version: c.policy_version,
            logged_at: c.created_at,
            ip_address: c.ip_address,
            device_metadata: c.device_metadata
          })),
          subscription_history: subscriptions,
          payment_records: payments,
          blocklist: blocks
        };

        return { data: exportedData, error: null };
      }

      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/account/export',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || 'Unable to export account data.');
      return {data,error:null};
    } catch (err: any) {
      console.error('Error exporting user data:', err);
      return { data: null, error: err };
    }
  },

  // ==========================================
  // DELETION & ERASURE REQUESTS
  // ==========================================

  async getDeletionRequest() {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const requests = JSON.parse(localStorage.getItem('gokul_mock_deletion_requests') || '[]');
        const userRequest = requests.find((r: any) => r.user_id === 'mock-user-1' && r.status === 'pending');
        return { data: userRequest || null, error: null };
      }

      // Live Supabase Mode
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: null, error: new Error('User row not found') };
      const currentUserId = userRow.id;

      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();

      return { data, error };
    } catch (err: any) {
      console.error('Error fetching user deletion requests:', err);
      return { data: null, error: err };
    }
  },

  async submitDeletionRequest(isPermanent: boolean) {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const requests = JSON.parse(localStorage.getItem('gokul_mock_deletion_requests') || '[]');
        
        // Remove existing pending requests for user first
        const cleaned = requests.filter((r: any) => !(r.user_id === 'mock-user-1' && r.status === 'pending'));

        const newRequest = {
          id: 'del-mock-' + Math.random().toString(36).substr(2, 9),
          user_id: 'mock-user-1',
          status: isPermanent ? 'pending' : 'completed',
          is_permanent: isPermanent,
          requested_at: new Date().toISOString(),
          completed_at: isPermanent ? null : new Date().toISOString()
        };

        cleaned.push(newRequest);
        localStorage.setItem('gokul_mock_deletion_requests', JSON.stringify(cleaned));

        // If it's a temporary deactivation, immediately suspend the profile
        if (!isPermanent) {
          const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
          const updatedProfiles = profiles.map((p: any) => {
            if (p.user_id === 'mock-user-1') {
              return { ...p, is_suspended: true, suspended_at: new Date().toISOString() };
            }
            return p;
          });
          localStorage.setItem('gokul_mock_profiles', JSON.stringify(updatedProfiles));
          
          // Trigger profileStore updates if in browser environment
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('mock_profile_suspended'));
          }
        }

        return { data: newRequest, error: null };
      }

      // Live Supabase Mode
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: null, error: new Error('User row not found') };
      const currentUserId = userRow.id;

      // Handle immediate temporary suspension
      if (!isPermanent) {
        // 1. Suspend profile
        await supabase
          .from('profiles')
          .update({
            is_suspended: true,
            suspended_at: new Date().toISOString()
          })
          .eq('user_id', currentUserId);

        // 2. Add Activity Log
        await supabase.from('activity_logs').insert({
          user_id: currentUserId,
          action: 'USER_DEACTIVATE_ACCOUNT',
          metadata: { mode: 'temporary_suspension' }
        });

        // 3. Record immediate completion deletion request row
        const { data, error } = await supabase
          .from('deletion_requests')
          .insert({
            user_id: currentUserId,
            status: 'completed',
            is_permanent: false,
            completed_at: new Date().toISOString()
          })
          .select()
          .single();

        return { data, error };
      }

      // Handle permanent erasure queueing
      const { data, error } = await supabase
        .from('deletion_requests')
        .insert({
          user_id: currentUserId,
          status: 'pending',
          is_permanent: true
        })
        .select()
        .single();

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: currentUserId,
        action: 'USER_REQUEST_PERMANENT_ERASURE',
        metadata: { request_id: data?.id }
      });

      return { data, error };
    } catch (err: any) {
      console.error('Error submitting deletion request:', err);
      return { data: null, error: err };
    }
  },

  async cancelDeletionRequest(requestId: string) {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const requests = JSON.parse(localStorage.getItem('gokul_mock_deletion_requests') || '[]');
        const updated = requests.map((r: any) => {
          if (r.id === requestId) {
            return { ...r, status: 'cancelled' };
          }
          return r;
        });
        localStorage.setItem('gokul_mock_deletion_requests', JSON.stringify(updated));
        return { success: true, error: null };
      }

      // Live Supabase Mode
      const { data, error } = await supabase
        .from('deletion_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId).eq('status', 'pending').select('id').single();

      return { success: !error, error };
    } catch (err: any) {
      console.error('Error cancelling deletion request:', err);
      return { success: false, error: err };
    }
  },

  // ==========================================
  // ADMIN COMPLIANCE QUEUE OPERATIONS
  // ==========================================

  async adminGetDeletionRequests() {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const requests = JSON.parse(localStorage.getItem('gokul_mock_deletion_requests') || '[]');
        const profiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
        const users = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');

        const enriched = requests.map((r: any) => {
          const profile = profiles.find((p: any) => p.user_id === r.user_id);
          const user = users.find((u: any) => u.id === r.user_id);
          return {
            ...r,
            user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Member',
            user_email: user?.email || 'N/A',
            profile_id: profile?.profile_id || 'GV-UNKNOWN'
          };
        });

        // Sort pending first, then newest requested_at
        enriched.sort((a: any, b: any) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
        });

        return { data: enriched, error: null };
      }

      // Live Supabase Mode
      const { data: requests, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error || !requests) return { data: [], error };

      const enriched = await Promise.all(
        requests.map(async (r) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', r.user_id)
            .maybeSingle();
          
          const { data: userRow } = await supabase
            .from('users')
            .select('email')
            .eq('id', r.user_id)
            .maybeSingle();

          return {
            ...r,
            user_name: profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Unknown Member',
            user_email: userRow?.email || 'N/A',
            profile_id: profile?.profile_id || 'GV-UNKNOWN'
          };
        })
      );

      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const jobResponse=await fetch('/api/admin/erasure',{cache:'no-store'});
      if(!jobResponse.ok) throw new Error('Unable to load erasure job status.');
      const jobs=await jobResponse.json();
      const jobRequests=jobs.filter((job:any)=>!enriched.some(request=>request.id===job.request_id)).map((job:any)=>({id:job.request_id,user_id:job.target_user_id,is_permanent:true,status:job.state==='completed'?'completed':'pending',requested_at:job.created_at,completed_at:job.completed_at,user_name:'Erasure job',user_email:'Removed or unavailable',profile_id:'Removed or unavailable'}));
      return { data: [...enriched,...jobRequests], error: null };
    } catch (err: any) {
      console.error('Error fetching admin deletion requests:', err);
      return { data: [], error: err };
    }
  },

  async adminProcessDeletionRequest(requestId: string, approve: boolean) {
    try {
      if (isMockMode()) {
        seedMockCompliance();
        const requests = JSON.parse(localStorage.getItem('gokul_mock_deletion_requests') || '[]');
        const req = requests.find((r: any) => r.id === requestId);
        
        if (!req) return { success: false, error: new Error('Request not found') };

        const updated = requests.map((r: any) => {
          if (r.id === requestId) {
            return {
              ...r,
              status: approve ? 'completed' : 'cancelled',
              completed_at: approve ? new Date().toISOString() : null
            };
          }
          return r;
        });

        localStorage.setItem('gokul_mock_deletion_requests', JSON.stringify(updated));

        // If approved and permanent, execute erasure from mock tables
        if (approve && req.is_permanent) {
          const targetUser = req.user_id;
          
          // Delete from all mock collections
          const mockProfiles = JSON.parse(localStorage.getItem('gokul_mock_profiles') || '[]');
          localStorage.setItem('gokul_mock_profiles', JSON.stringify(mockProfiles.filter((p: any) => p.user_id !== targetUser)));

          const mockUsers = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
          localStorage.setItem('gokul_mock_users', JSON.stringify(mockUsers.filter((u: any) => u.id !== targetUser)));

          const mockPayments = JSON.parse(localStorage.getItem('gokul_mock_payments') || '[]');
          localStorage.setItem('gokul_mock_payments', JSON.stringify(mockPayments.filter((p: any) => p.user_id !== targetUser)));

          const mockSubscriptions = JSON.parse(localStorage.getItem('gokul_mock_subscriptions') || '[]');
          localStorage.setItem('gokul_mock_subscriptions', JSON.stringify(mockSubscriptions.filter((s: any) => s.user_id !== targetUser)));

          const mockConsents = JSON.parse(localStorage.getItem('gokul_mock_consent_logs') || '[]');
          localStorage.setItem('gokul_mock_consent_logs', JSON.stringify(mockConsents.filter((c: any) => c.user_id !== targetUser)));
        }

        return { success: true, error: null };
      }

      // Live Supabase Mode
      // 1. Fetch details of request
      const { data: request, error: fetchErr } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if ((fetchErr || !request) && approve) {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session) throw new Error('Please sign in again.');
        await syncServerSession(session.access_token);
        const response=await fetch('/api/admin/erasure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId})});
        const result=await response.json();
        if(!response.ok) throw new Error(result.error);
        return {success:true,error:null};
      }
      if (fetchErr || !request) throw new Error('Request not found');

      if (!approve) {
        // Simply cancel the request
        const { error: cancelErr } = await supabase
          .from('deletion_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId);
        return { success: !cancelErr, error: cancelErr };
      }

      // APPROVE ACTION - COMPLETE DELETION WORKFLOW
      const targetUserId = request.user_id;

      if (request.is_permanent) {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session) throw new Error('Please sign in again.');
        await syncServerSession(session.access_token);
        const response=await fetch('/api/admin/erasure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId})});
        const result=await response.json();
        if(!response.ok) throw new Error(result.error);
      } else {
        // Temporary suspension - complete request and ensure user status suspended
        await Promise.all([
          supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString() }).eq('user_id', targetUserId),
          supabase.from('deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId)
        ]);
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error processing admin deletion request:', err);
      return { success: false, error: err };
    }
  }
};
