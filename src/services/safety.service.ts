import { supabase } from '@/lib/supabase';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export interface BlockRow {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  reason?: string;
  created_at: string;
  // Enriched
  blocked_profile_id?: string;
  blocked_name?: string;
}

export interface AbuseReport {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  reason: string;
  status: 'pending' | 'reviewed';
  report_type: 'profile' | 'message';
  message_id?: string;
  category: 'Fake Profile' | 'Spam' | 'Harassment' | 'Inappropriate Content' | 'Other';
  action_taken: 'none' | 'warned' | 'suspended' | 'banned';
  moderator_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  // Enriched
  reporter_name?: string;
  reporter_profile_id?: string;
  reported_name?: string;
  reported_profile_id?: string;
  reported_message_text?: string;
}

export const safetyService = {
  async blockUser(blockedUserId: string, reason = 'Blocked by member') {
    try {
      if (isMockMode()) {
        console.log(`[Safety Service] Mock: Blocking user ${blockedUserId}. Reason: ${reason}`);
        return { data: { success: true }, error: null };
      }

      // 1. Resolve current user DB ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: null, error: new Error('User row not found') };
      const currentUserId = userRow.id;

      if (currentUserId === blockedUserId) {
        return { data: null, error: new Error('You cannot block yourself') };
      }

      // 2. Insert block row
      const { data, error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_user_id: currentUserId,
          blocked_user_id: blockedUserId,
          reason
        })
        .select()
        .single();

      if (error) throw error;

      // Interest requests are lifetime records. Keep them intact so a block
      // cannot erase a declined/cancelled history or reopen a send direction.

      // 3. Delete any active chats between these two users (cascade deletes messages)
      await supabase
        .from('chats')
        .delete()
        .or(`and(user_one.eq.${currentUserId},user_two.eq.${blockedUserId}),and(user_one.eq.${blockedUserId},user_two.eq.${currentUserId})`);

      // 5. Add Activity Log
      await supabase.from('activity_logs').insert({
        user_id: currentUserId,
        action: 'USER_BLOCK_MEMBER',
        metadata: { blocked_user_id: blockedUserId, reason }
      });

      return { data, error: null };
    } catch (err: any) {
      console.error('Error blocking user:', err);
      return { data: null, error: err };
    }
  },

  async unblockUser(blockedUserId: string) {
    try {
      if (isMockMode()) {
        console.log(`[Safety Service] Mock: Unblocking user ${blockedUserId}`);
        return { success: true, error: null };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { success: false, error: new Error('User row not found') };
      const currentUserId = userRow.id;

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_user_id', currentUserId)
        .eq('blocked_user_id', blockedUserId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: currentUserId,
        action: 'USER_UNBLOCK_MEMBER',
        metadata: { unblocked_user_id: blockedUserId }
      });

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error unblocking user:', err);
      return { success: false, error: err };
    }
  },

  async getBlockedUsers() {
    try {
      if (isMockMode()) {
        return {
          data: [
            { id: 'req-block-1', blocker_user_id: 'self', blocked_user_id: 'mock-user-4', reason: 'Fake profile photo', created_at: new Date().toISOString(), blocked_profile_id: 'GV100204', blocked_name: 'Anitha Gopalan' }
          ] as BlockRow[],
          error: null
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: [], error: new Error('User row not found') };
      const currentUserId = userRow.id;

      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: [], error };

      const enriched = await Promise.all(
        data.map(async (row) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', row.blocked_user_id)
            .maybeSingle();
            
          return {
            ...row,
            blocked_profile_id: profile?.profile_id || 'GV-UNKNOWN',
            blocked_name: profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Unknown Member'
          };
        })
      );

      return { data: enriched, error: null };
    } catch (err: any) {
      console.error('Error fetching blocked users:', err);
      return { data: [], error: err };
    }
  },

  async reportProfile(reportedUserId: string, category: string, reason: string) {
    try {
      if (isMockMode()) {
        console.log(`[Safety Service] Mock: Reporting profile ${reportedUserId}. Cat: ${category}, Reason: ${reason}`);
        return { data: { success: true }, error: null };
      }

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
        .from('reports')
        .insert({
          reporter_user_id: currentUserId,
          reported_user_id: reportedUserId,
          report_type: 'profile',
          category,
          reason,
          status: 'pending'
        })
        .select()
        .single();

      return { data, error };
    } catch (err: any) {
      console.error('Error reporting profile:', err);
      return { data: null, error: err };
    }
  },

  async reportMessage(messageId: string, reportedUserId: string, category: string, reason: string) {
    try {
      if (isMockMode()) {
        console.log(`[Safety Service] Mock: Reporting message ${messageId} from user ${reportedUserId}. Cat: ${category}, Reason: ${reason}`);
        return { data: { success: true }, error: null };
      }

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
        .from('reports')
        .insert({
          reporter_user_id: currentUserId,
          reported_user_id: reportedUserId,
          report_type: 'message',
          message_id: messageId,
          category,
          reason,
          status: 'pending'
        })
        .select()
        .single();

      return { data, error };
    } catch (err: any) {
      console.error('Error reporting message:', err);
      return { data: null, error: err };
    }
  },

  // Admin Queue
  async adminGetAbuseReports() {
    try {
      if (isMockMode()) {
        return {
          data: [
            {
              id: 'rep-mock-1',
              reporter_user_id: 'mock-user-1',
              reported_user_id: 'mock-user-5',
              reason: 'They are using a fake photo of a famous celebrity.',
              status: 'pending',
              report_type: 'profile',
              category: 'Fake Profile',
              action_taken: 'none',
              created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              reporter_name: 'Ramesh Sundar',
              reporter_profile_id: 'GV100201',
              reported_name: 'Srinivasan K.',
              reported_profile_id: 'GV100205'
            },
            {
              id: 'rep-mock-2',
              reporter_user_id: 'mock-user-2',
              reported_user_id: 'mock-user-6',
              reason: 'Sending inappropriate commercial spam links in messages.',
              status: 'pending',
              report_type: 'message',
              message_id: 'mock-msg-3',
              category: 'Spam',
              action_taken: 'none',
              created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
              reporter_name: 'Lakshmi Narayanan',
              reporter_profile_id: 'GV100202',
              reported_name: 'Meenakshi N.',
              reported_profile_id: 'GV100206',
              reported_message_text: 'Buy matrimonial gold jewelry now! Call 9444-gold-spam.'
            }
          ] as AbuseReport[],
          error: null
        };
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error || !data) return { data: [], error };

      const enriched = await Promise.all(
        data.map(async (row) => {
          const { data: reporterProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', row.reporter_user_id)
            .maybeSingle();

          const { data: reportedProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', row.reported_user_id)
            .maybeSingle();

          let msgText = undefined;
          if (row.report_type === 'message' && row.message_id) {
            const { data: msgRow } = await supabase
              .from('chat_messages')
              .select('message')
              .eq('id', row.message_id)
              .maybeSingle();
            msgText = msgRow?.message;
          }

          return {
            ...row,
            reporter_name: reporterProfile ? `${reporterProfile.first_name} ${reporterProfile.last_name || ''}`.trim() : 'Unknown Reporter',
            reporter_profile_id: reporterProfile?.profile_id || 'GV-UNKNOWN',
            reported_name: reportedProfile ? `${reportedProfile.first_name} ${reportedProfile.last_name || ''}`.trim() : 'Unknown Member',
            reported_profile_id: reportedProfile?.profile_id || 'GV-UNKNOWN',
            reported_message_text: msgText
          };
        })
      );

      return { data: enriched, error: null };
    } catch (err: any) {
      console.error('Error fetching admin reports:', err);
      return { data: [], error: err };
    }
  },

  async adminProcessReportAction(reportId: string, _targetUserId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss', notes?: string) {
    try {
      const response = await fetch('/api/admin/reports', {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({reportId,action,notes})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Review failed');
      return {success:true,error:null};
    } catch(error) {return {success:false,error};}
  }
};
