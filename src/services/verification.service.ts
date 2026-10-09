import { supabase } from '@/lib/supabase';
import { syncServerSession } from '@/lib/auth/session-client';
import { normalizeVerificationPhone } from '@/lib/verification/phone';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: 'id_proof' | 'horoscope';
  document_type: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'resubmit_requested';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Enriched fields for admin view
  profile_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export const verificationService = {
  async submitVerificationRequest(type: 'id_proof' | 'horoscope', documentUrl: string, documentType?: string) {
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response = await fetch('/api/verification/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,documentUrl,documentType:documentType || (type==='horoscope'?'Horoscope':'ID Proof')})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Submission failed.');
      return {data,error:null};
    } catch (error) { return {data:null,error:error instanceof Error ? error : new Error('Submission failed.')}; }
  },
  async getMyVerificationRequests() {
    try {
      if (isMockMode()) {
        return {
          data: [
            {
              id: 'req-mock-1',
              verification_type: 'id_proof',
              document_type: 'Aadhaar',
              document_url: 'https://gokul-vivaham.supabase/mock_id_proof.pdf',
              status: 'approved',
              created_at: new Date(Date.now() - 86400000 * 5).toISOString()
            }
          ] as any[],
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

      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userRow.id)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err: any) {
      console.error('Error fetching verification requests:', err);
      return { data: [], error: err };
    }
  },

  async syncContactVerification(field: 'email' | 'mobile') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again.');
    await syncServerSession(session.access_token);
    const response = await fetch('/api/verification/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Verification could not be saved.');
  },

  async sendContactOtp(field: 'email' | 'mobile', value: string) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Please sign in again.');
      if (field === 'email') {
        if (value.toLowerCase() !== user.email?.toLowerCase()) throw new Error('Verify your current account email.');
        const { error: sendError } = await supabase.auth.resend({
          type: 'signup',
          email: user.email!,
          options: { emailRedirectTo: window.location.origin + '/dashboard/verification?email_verified=1' },
        });
        if (sendError) throw sendError;
      } else {
        const { error: sendError } = await supabase.auth.updateUser({ phone: normalizeVerificationPhone(value) });
        if (sendError) throw sendError;
      }
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error : new Error('Could not send verification. Please retry.') }; }
  },

  async verifyEmailOrMobile(field: 'email' | 'mobile', value: string, token: string) {
    try {
      if (!/^\d{6,10}$/.test(token)) throw new Error('Enter the code sent to you.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('User not authenticated') };
      let result;
      if (field === 'email') {
        if (value.toLowerCase() !== user.email?.toLowerCase()) throw new Error('Verify your current account email.');
        result = await supabase.auth.verifyOtp({ email: user.email!, token, type: 'signup' });
      } else {
        result = await supabase.auth.verifyOtp({ phone: normalizeVerificationPhone(value), token, type: 'phone_change' });
      }
      if (result.error) throw result.error;
      if (result.data.user?.id !== user.id) throw new Error('Verification belongs to a different account.');
      await this.syncContactVerification(field);
      return { data: { success: true }, error: null };
    } catch (err: any) {
      console.error(`Error verifying ${field}:`, err);
      return { data: null, error: err };
    }
  },

  async adminGetPendingRequests() {
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/admin/documents',{cache:'no-store'});
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'Queue unavailable.');
      return {data:result.requests as VerificationRequest[],error:null};
    } catch (error) { return {data:[],error:error instanceof Error ? error : new Error('Queue unavailable.')}; }
  },
  async adminProcessRequest(requestId:string, targetUserId:string, type:'id_proof'|'horoscope', status:'approved'|'rejected'|'resubmit_requested', reason?:string) {
    try {
      // The server derives member and document type from the stored request.
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch('/api/admin/documents',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,status,reason})});
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'Review failed.');
      return {success:true,error:null};
    } catch (error) { return {success:false,error:error instanceof Error ? error : new Error('Review failed.')}; }
  }
};
