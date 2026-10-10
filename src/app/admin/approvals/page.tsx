'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Check, X, Ban, Flag, ShieldAlert, Trash2, 
  User, Image, FileText, LogOut, Bell, ShieldCheck, CheckCircle2, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { verificationService } from '@/services/verification.service';
import { uploadService } from '@/services/upload.service';
import { safetyService } from '@/services/safety.service';

export default function AdminApprovalsPage() {
  const router = useRouter();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'profiles' | 'verifications' | 'reports' | 'photos' | 'deletion'>('verifications');
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState('');

  // Data states
  const [profilesQueue, setProfilesQueue] = useState<any[]>([]);
  const [verificationsQueue, setVerificationsQueue] = useState<any[]>([]);
  const [reportsQueue, setReportsQueue] = useState<any[]>([]);
  const [photosQueue, setPhotosQueue] = useState<any[]>([]);
  const [deletionQueue, setDeletionQueue] = useState<any[]>([]);

  // System audit logs list
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchModerationData = async () => {
    setLoading(true);
    setQueueError('');
    try {
      // 1. Fetch pending profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_suspended', false);
      
      // Filter for profiles that need verification/approval
      setProfilesQueue((profiles || []).filter((p: any) => !p.is_verified));

      // 2. Fetch pending document verifications
      const { data: verifs, error: verificationError } = await verificationService.adminGetPendingRequests();
      if (verificationError) throw verificationError;
      setVerificationsQueue(verifs || []);

      // 3. Fetch abuse reports
      const { data: reports } = await safetyService.adminGetAbuseReports();
      setReportsQueue(reports || []);

      // 4. Fetch pending photos through the MFA-protected backend queue.
      const photoResponse = await fetch('/api/admin/photos?status=pending', { cache: 'no-store' });
      const photoResult = await photoResponse.json().catch(() => null);
      if (!photoResponse.ok) throw new Error(photoResult?.error || 'Could not load pending photos.');
      setPhotosQueue((photoResult?.photos || []).map((photo: any) => ({
        ...photo,
        userName: `${photo.first_name || 'Unknown'} ${photo.last_name || 'User'}`.trim(),
        userId: photo.profile_id || 'GV-PENDING',
      })));

      // 5. Fetch deletion requests
      const { data: deletions } = await supabase
        .from('deletion_requests')
        .select('*');
      
      const enrichedDeletions = [];
      if (deletions) {
        for (const del of deletions) {
          const { data: pInfo } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id')
            .eq('user_id', del.user_id)
            .maybeSingle();
          
          enrichedDeletions.push({
            ...del,
            userName: pInfo ? `${pInfo.first_name} ${pInfo.last_name}` : 'Unknown User',
            userId: pInfo?.profile_id || 'GV-PENDING'
          });
        }
      }
      setDeletionQueue(enrichedDeletions.filter((d: any) => d.status === 'pending'));

      // 6. Fetch audit logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .or('action.ilike.%MODERATOR%,action.eq.ADMIN_REVIEW_DOCUMENT')
        .order('created_at', { ascending: false });
      setAuditLogs(logs || []);

    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Could not load the review queue.');
      console.error('Error fetching admin moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  // Action handlers
  const handleApproveProfile = async (profile: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true, moderation_status: 'approved', moderated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: 'MODERATOR_APPROVE_PROFILE',
        metadata: { target_profile_id: profile.profile_id, target_name: `${profile.first_name} ${profile.last_name}` }
      });

      alert(`Approved profile verification for: ${profile.first_name}`);
      fetchModerationData();
    } catch (e: any) {
      alert('Error approving profile: ' + e.message);
    }
  };

  const handleRejectProfile = async (profile: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ moderation_status: 'rejected', moderated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: 'MODERATOR_REJECT_PROFILE',
        metadata: { target_profile_id: profile.profile_id }
      });

      alert(`Rejected profile verification for: ${profile.first_name}`);
      fetchModerationData();
    } catch (e: any) {
      alert('Error rejecting profile: ' + e.message);
    }
  };

  const handleProcessVerification = async (req: any, status: 'approved' | 'rejected' | 'resubmit_requested') => {
    let reason = '';
    if (status === 'rejected' || status === 'resubmit_requested') {
      const promptMsg = status === 'rejected' ? 'Enter rejection reason:' : 'Enter resubmission instructions for user:';
      const val = prompt(promptMsg);
      if (val === null) return;
      if (!val.trim()) {
        alert('Reason is required.');
        return;
      }
      reason = val.trim();
    }

    try {
      const { success, error } = await verificationService.adminProcessRequest(
        req.id,
        req.user_id,
        req.verification_type,
        status,
        reason
      );

      if (error) throw error;
      alert(`Verification request status updated to ${status}.`);
      fetchModerationData();
    } catch (e: any) {
      alert('Error processing request: ' + e.message);
    }
  };

  const handleViewDocument = async (req: any) => {
    const bucket = req.verification_type === 'id_proof' ? 'id-proofs' : 'horoscopes';
    try {
      const { url, error } = await uploadService.getSignedUrl(bucket, req.document_url);
      if (error || !url) throw error || new Error('Could not generate signed URL');
      window.open(url, '_blank');
    } catch (e: any) {
      alert('Error opening document: ' + e.message);
    }
  };

  const handleApprovePhoto = async (photo: any) => {
    try {
      const response = await fetch('/api/admin/photos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: photo.id, action: 'approve' }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Photo approval failed.');

      alert('Photo approved successfully.');
      fetchModerationData();
    } catch (e: any) {
      alert('Error approving photo: ' + e.message);
    }
  };

  const handleRejectPhoto = async (photo: any) => {
    try {
      const reason = prompt('Enter the rejection reason (required):');
      if (reason === null || !reason.trim()) return;
      const response = await fetch('/api/admin/photos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: photo.id, action: 'reject', reason: reason.trim() }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Photo rejection failed.');

      alert('Photo rejected and removed from gallery.');
      fetchModerationData();
    } catch (e: any) {
      alert('Error rejecting photo: ' + e.message);
    }
  };

  const handleProcessSafetyAction = async (report: any, action: 'warn' | 'suspend' | 'ban' | 'dismiss') => {
    let notes = '';
    if (action !== 'dismiss') {
      const promptNotes = `Enter moderator notes / reason for safety action: ${action.toUpperCase()}`;
      const val = prompt(promptNotes);
      if (val === null) return;
      notes = val.trim();
    } else {
      const confirmDismiss = confirm('Are you sure you want to dismiss this abuse report?');
      if (!confirmDismiss) return;
    }

    try {
      const { success, error } = await safetyService.adminProcessReportAction(
        report.id,
        report.reported_user_id,
        action,
        notes
      );

      if (error) throw error;
      alert(`Safety action ${action.toUpperCase()} completed successfully.`);
      fetchModerationData();
    } catch (e: any) {
      alert('Error applying action: ' + e.message);
    }
  };

  const handleProcessErasure = async (request: any) => {
    const confirmErasure = confirm(`WARNING: This will permanently delete user ${request.userName} and all related database records. This action is irreversible. Proceed?`);
    if (!confirmErasure) return;

    try {
      // 1. Delete user profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', request.user_id);
      if (profileErr) throw profileErr;

      // 2. Delete main auth user mock link
      const { error: userErr } = await supabase
        .from('users')
        .delete()
        .eq('id', request.user_id);
      if (userErr) throw userErr;

      // 3. Mark deletion request as completed
      const { error: delErr } = await supabase
        .from('deletion_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (delErr) throw delErr;

      await supabase.from('activity_logs').insert({
        action: 'MODERATOR_PERMANENT_ERASURE_COMPLETED',
        metadata: { deleted_user_id: request.user_id, name: request.userName }
      });

      alert('Account and all related personal data permanently erased from database.');
      fetchModerationData();
    } catch (e: any) {
      alert('Error executing erasure: ' + e.message);
    }
  };

  const handleSignOut = async () => {
    await useAuthStore.getState().logout();
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {queueError && <div role="alert" className="p-4 text-red-600">{queueError} <button onClick={fetchModerationData} className="underline">Retry</button></div>}
      
      {/* HEADER */}
      <header className="h-20 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary animate-pulse" />
          <div className="flex flex-col">
            <span className="text-base font-serif font-bold text-foreground">Gokul Vivaham Moderation Center</span>
            <span className="text-[10px] text-muted font-mono uppercase tracking-wider font-bold">Role: System Moderator</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="text-xs font-mono text-primary hover:underline">
            [Main Dashboard]
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-xs text-primary shadow-sm">
              MOD
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full border border-border hover:bg-surface text-muted cursor-pointer transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border text-xs uppercase tracking-widest font-mono flex-wrap">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'verifications' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Doc Verifications ({verificationsQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'profiles' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Profile Approvals ({profilesQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'reports' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Abuse Reports ({reportsQueue.filter(r => !r.isSuspended).length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'photos' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Photo Queue ({photosQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('deletion')}
            className={`px-5 py-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === 'deletion' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Deletion Requests ({deletionQueue.length})
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted font-mono text-xs">
            Fetching verification lists...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* TABS CONTAINER CONTENT */}
            
            {/* 0. DOCUMENT VERIFICATIONS */}
            {activeTab === 'verifications' && (
              <div className="flex flex-col gap-4">
                {verificationsQueue.length > 0 ? (
                  verificationsQueue.map((req) => (
                    <div key={req.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-sm">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground font-serif">{req.first_name} {req.last_name}</span>
                          <span className="text-[10px] text-primary font-mono font-bold">ID: {req.profile_id}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            req.verification_type === 'id_proof' 
                              ? 'bg-brand-red/10 text-brand-red border-brand-red/20' 
                              : 'bg-brand-gold/20 text-foreground dark:text-brand-gold border-brand-gold/30'
                          }`}>
                            {req.verification_type === 'id_proof' ? 'ID Proof' : 'Horoscope'}
                          </span>
                          <span className="text-[10px] text-muted">({req.document_type})</span>
                        </div>
                        <p className="text-xs text-muted leading-normal font-light">
                          Email: {req.email} • Submitted: {new Date(req.created_at).toLocaleString()}
                        </p>
                        
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => handleViewDocument(req)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-background text-foreground text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer select-none"
                          >
                            <FileText className="h-3.5 w-3.5" /> View Submitted Document <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          onClick={() => handleProcessVerification(req, 'resubmit_requested')}
                          className="px-3 h-8.5 rounded-lg border border-warning/35 bg-warning/10 text-warning hover:brightness-110 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
                        >
                          Resubmit
                        </button>
                        <button
                          onClick={() => handleProcessVerification(req, 'rejected')}
                          className="px-3 h-8.5 rounded-lg border border-destructive/35 bg-destructive/10 text-destructive hover:brightness-110 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleProcessVerification(req, 'approved')}
                          className="flex items-center gap-1 px-4 h-8.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
                    No pending document verifications found.
                  </div>
                )}
              </div>
            )}

            {/* 1. PROFILE APPROVALS */}
            {activeTab === 'profiles' && (
              <div className="flex flex-col gap-4">
                {profilesQueue.length > 0 ? (
                  profilesQueue.map((profile) => (
                    <div key={profile.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground font-serif">{profile.first_name} {profile.last_name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted font-bold uppercase">{profile.gender}</span>
                          <span className="text-[10px] text-primary font-mono font-bold">ID: {profile.profile_id}</span>
                        </div>
                        <p className="text-xs text-muted leading-normal font-light">
                          Age: {profile.age} yrs • Caste: {profile.caste} • Tongue: {profile.mother_tongue} • City: {profile.city}
                        </p>
                        <blockquote className="text-[11px] text-muted italic mt-2 border-l-2 border-border pl-2">
                          "{profile.about_me || 'No description provided.'}"
                        </blockquote>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          onClick={() => handleRejectProfile(profile)}
                          className="px-3 h-8.5 rounded-lg border border-destructive/35 bg-destructive/10 text-destructive hover:brightness-110 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveProfile(profile)}
                          className="flex items-center gap-1 px-4 h-8.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Check className="h-4 w-4" /> Verify Profile
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
                    No pending profile verifications found.
                  </div>
                )}
              </div>
            )}

            {/* 2. ABUSE REPORTS */}
            {activeTab === 'reports' && (
              <div className="flex flex-col gap-4">
                {reportsQueue.length > 0 ? (
                  reportsQueue.map((report) => (
                    <div key={report.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-sm">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-muted uppercase tracking-wider text-[9px]">Reporter:</span>
                          <span className="font-semibold text-foreground">{report.reporter_name || report.reporterName} ({report.reporter_profile_id || report.reporterId})</span>
                          <span className="text-muted">➔</span>
                          <span className="font-bold text-destructive uppercase tracking-wider text-[9px]">Accused:</span>
                          <span className="font-semibold text-foreground">{report.reported_name || report.reportedName} ({report.reported_profile_id || report.reportedId})</span>
                          
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-surface text-muted border border-border">
                            {report.report_type === 'message' ? 'Message Flag' : 'Profile Flag'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">
                            {report.category}
                          </span>
                        </div>

                        <p className="text-xs text-muted leading-normal font-light mt-1.5">
                          <span className="font-semibold text-foreground">Reason:</span> {report.reason}
                        </p>

                        {/* Display flagged message if message report */}
                        {report.report_type === 'message' && report.reported_message_text && (
                          <div className="p-3 bg-surface border border-border rounded-xl mt-2 max-w-xl">
                            <span className="text-[9px] font-bold text-muted uppercase tracking-wider font-mono">Flagged Chat Message:</span>
                            <blockquote className="text-xs text-foreground italic mt-1 font-serif">
                              "{report.reported_message_text}"
                            </blockquote>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap max-w-xs md:max-w-none">
                        <button
                          onClick={() => handleProcessSafetyAction(report, 'dismiss')}
                          className="px-3 h-8.5 rounded-lg border border-border text-foreground hover:bg-surface text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleProcessSafetyAction(report, 'warn')}
                          className="px-3 h-8.5 rounded-lg border border-warning/35 bg-warning/10 text-warning hover:brightness-110 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Warn
                        </button>
                        <button
                          onClick={() => handleProcessSafetyAction(report, 'suspend')}
                          className="px-3 h-8.5 rounded-lg border border-warning/35 bg-warning/20 text-warning hover:brightness-110 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleProcessSafetyAction(report, 'ban')}
                          className="px-4 h-8.5 rounded-lg bg-destructive hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                        >
                          Ban
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
                    No pending abuse reports found.
                  </div>
                )}
              </div>
            )}

            {/* 3. PHOTO QUEUE */}
            {activeTab === 'photos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {photosQueue.length > 0 ? (
                  photosQueue.map((photo) => (
                    <div key={photo.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm">
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-serif font-bold text-foreground truncate max-w-[120px]">{photo.userName}</span>
                          <span className="text-[10px] text-primary font-mono font-bold">{photo.userId}</span>
                        </div>
                        {/* Photo Display Container */}
                        <div className="w-full h-44 rounded-xl bg-surface flex items-center justify-center overflow-hidden border border-border mt-1 relative select-none">
                          <img 
                            src={photo.preview_url || photo.image_url}
                            alt="Awaiting Moderation" 
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 bg-surface/50 border-t border-border flex justify-between gap-2">
                        <button
                          onClick={() => handleRejectPhoto(photo)}
                          className="flex-1 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovePhoto(photo)}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
                    No images pending safety approval.
                  </div>
                )}
              </div>
            )}

            {/* 4. DELETION REQUESTS */}
            {activeTab === 'deletion' && (
              <div className="flex flex-col gap-4">
                {deletionQueue.length > 0 ? (
                  deletionQueue.map((req) => (
                    <div key={req.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground font-serif">{req.userName}</span>
                          <span className="text-[10px] text-primary font-mono font-bold">ID: {req.userId}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25 font-bold uppercase tracking-wider font-mono">Erasure Request</span>
                        </div>
                        <p className="text-xs text-muted leading-normal font-light">
                          Requested: {new Date(req.requested_at).toLocaleString()} • Compliance Mandate: DPDP Right of Erasure
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          onClick={() => handleProcessErasure(req)}
                          className="flex items-center gap-1.5 px-4 h-8.5 rounded-lg bg-destructive hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Erase Account Data
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
                    No data deletion/erasure requests pending processing.
                  </div>
                )}
              </div>
            )}

            {/* SYSTEM AUDIT LOGS TRAIL */}
            <div className="h-px bg-border my-6" />

            <div className="bg-card border border-border rounded-2xl shadow-lg p-5 md:p-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-serif font-bold text-foreground">System Moderator Audit Trail Logs</h3>
              </div>
              
              {auditLogs.length > 0 ? (
                <div className="flex flex-col gap-2 font-mono text-[10px] text-muted max-h-[250px] overflow-y-auto pr-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-2 rounded bg-surface border border-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 select-none">
                      <div>
                        <span className="text-primary font-bold">[{log.action}]</span>
                        <span className="ml-2 text-foreground">{JSON.stringify(log.metadata)}</span>
                      </div>
                      <span className="text-muted text-[9px]">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted text-xs font-mono">
                  No moderation logs registered in current session.
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
