'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Check, X, Search, 
  Trash2, Eye, UserX, Clock, FileCheck, RefreshCw, Loader2,
  Lock, ArrowRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { complianceService } from '@/services/compliance.service';
import { supabase } from '@/lib/supabase';
import { syncServerSession } from '@/lib/auth/session-client';

export default function AdminDeletionRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Inspector Sidebar
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Load compliance queue
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await complianceService.adminGetDeletionRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching admin deletion requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectRequest = async (req: any) => {
    setSelectedReq(req);
    setInspectData(null);
    setLoadingInspect(true);
    try {
      // Fetch entire user data profile package for admin verification
      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error('Please sign in again.');
      await syncServerSession(session.access_token);
      const response=await fetch(`/api/admin/users/${encodeURIComponent(req.user_id)}`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || 'Unable to inspect this member.');
      setInspectData({personal_profile:data.profile,payment_history:data.payments,gallery_photos:data.gallery,granted_consents:data.consents});
    } catch (err) {
      console.error('Error loading inspection package:', err);
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleProcessRequest = async (requestId: string, approve: boolean, isPermanent: boolean, name: string) => {
    const actionWord = approve ? 'APPROVE & EXECUTE' : 'REJECT & DISMISS';
    const warningMsg = approve && isPermanent
      ? `CRITICAL WARNING: You are about to permanently erase all records for ${name}. This will delete their login info, profile details, preferences, subscriptions, payments, horoscopes, and photos from the database. This action is IRREVERSIBLE.\n\nType 'CONFIRM DELETE' to proceed:`
      : `Are you sure you want to ${approve ? 'approve' : 'reject'} the deactivation/erasure request for ${name}?`;

    if (approve && isPermanent) {
      const promptConfirm = prompt(warningMsg);
      if (promptConfirm !== 'CONFIRM DELETE') {
        alert('Action cancelled: Confirmation phrase did not match.');
        return;
      }
    } else {
      const confirmAction = confirm(warningMsg);
      if (!confirmAction) return;
    }

    setProcessingId(requestId);
    try {
      const { success, error } = await complianceService.adminProcessDeletionRequest(requestId, approve);
      if (error || !success) throw error || new Error('Processing failed');

      alert(`Request processed successfully. Action: ${approve ? 'Completed Deletion' : 'Dismissed Deletion'}`);
      
      // Close sidebar if active
      if (selectedReq?.id === requestId) {
        setSelectedReq(null);
      }

      fetchRequests();
    } catch (err: any) {
      alert('Error processing request: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Compute stat counters
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const permanentErasureCount = requests.filter(r => r.status === 'pending' && r.is_permanent).length;

  // Filter queue records
  const filteredRequests = requests.filter(r => {
    const statusMatch = statusFilter === 'all' || r.status === statusFilter;
    const searchMatch = 
      r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.profile_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-primary fill-primary/10" />
            DPDP Act Erasure &amp; Deletion Queue
          </h1>
          <p className="text-xs text-muted font-light max-w-2xl">
            Process permanent right-to-be-forgotten requests (Section 13) and temporary suspensions. Validate data summaries before executing permanent purging.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-foreground hover:bg-background transition-colors cursor-pointer text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* COMPLIANCE STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Total Queue */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-mono font-bold text-foreground">{totalCount}</span>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Total Queue Items</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-muted">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Card 2: Pending requests */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-mono font-bold text-warning">{pendingCount}</span>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Pending Actions</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
            <Clock className="h-4.5 w-4.5 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Permanent Erasures */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-mono font-bold text-destructive">{permanentErasureCount}</span>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Permanent Erasures</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
            <Trash2 className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Card 4: Completed queue items */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-2xl md:text-3xl font-mono font-bold text-success">{completedCount}</span>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">Completed Erasures</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <FileCheck className="h-4.5 w-4.5" />
          </div>
        </div>

      </div>

      {/* CONTROL & LIST CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* QUEUE CONTROLLER & LIST */}
        <div className={`flex flex-col bg-card border border-border rounded-3xl p-5 md:p-6 gap-6 shadow-xl ${
          selectedReq ? 'lg:col-span-7' : 'lg:col-span-12'
        } transition-all duration-300`}>
          
          {/* FILTERING CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-border pb-5">
            {/* Status pills */}
            <div className="flex gap-2 p-1 bg-surface rounded-xl border border-border select-none">
              {(['pending', 'completed', 'cancelled', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    statusFilter === tab 
                      ? 'bg-primary/10 text-primary shadow-inner' 
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search box */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search user, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9.5 pr-3.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-muted text-foreground font-mono"
              />
            </div>
          </div>

          {/* TABLE CONTAINER */}
          {loading ? (
            <div className="flex flex-col items-center py-20 text-xs text-muted font-mono gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span>Retrieving compliance queue records...</span>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-muted border-b border-border pb-3">
                    <th className="py-3 font-semibold uppercase text-[10px] tracking-wider">Member Profile</th>
                    <th className="py-3 font-semibold uppercase text-[10px] tracking-wider">Scope</th>
                    <th className="py-3 font-semibold uppercase text-[10px] tracking-wider">Requested At</th>
                    <th className="py-3 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                    <th className="py-3 font-semibold uppercase text-[10px] tracking-wider text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isPerm = req.is_permanent;
                    return (
                      <tr 
                        key={req.id} 
                        className={`text-foreground/95 hover:bg-surface/40 transition-colors ${
                          selectedReq?.id === req.id ? 'bg-surface border-l-2 border-primary' : ''
                        }`}
                      >
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">{req.user_name}</span>
                            <span className="text-[10px] text-muted mt-0.5">{req.user_email} • <strong className="text-primary">{req.profile_id}</strong></span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isPerm 
                              ? 'bg-destructive/10 text-destructive border-destructive/20' 
                              : 'bg-surface text-muted border-border'
                          }`}>
                            {isPerm ? 'PERMANENT ERASURE' : 'DEACTIVATION'}
                          </span>
                        </td>
                        <td className="py-4 text-muted">
                          {new Date(req.requested_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                            req.status === 'pending'
                              ? 'bg-warning/10 text-warning border-warning/20 animate-pulse'
                              : req.status === 'completed'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-surface text-muted border-border'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInspectRequest(req)}
                              className="p-1.5 rounded-lg border border-border hover:border-muted bg-background text-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Inspect User Records"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleProcessRequest(req.id, false, req.is_permanent, req.user_name)}
                                  disabled={processingId !== null}
                                  className="p-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                                  title="Reject Erasure Request"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleProcessRequest(req.id, true, req.is_permanent, req.user_name)}
                                  disabled={processingId !== null}
                                  className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-success hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                                  title="Approve & Complete"
                                >
                                  {processingId === req.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Execute
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-muted font-mono text-xs border border-dashed border-border rounded-2xl bg-surface">
              No deletion requests matching filters found.
            </div>
          )}

        </div>

        {/* SIDE INSPECTOR PANEL */}
        {selectedReq && (
          <aside className="lg:col-span-5 flex flex-col bg-card border border-border rounded-3xl p-5 md:p-6 gap-6 shadow-2xl animate-in slide-in-from-right duration-350 select-none">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-primary font-mono font-bold tracking-widest uppercase">DPDP Portability Inspector</span>
                <h3 className="text-sm font-serif font-bold text-foreground mt-1">Data Package: {selectedReq.user_name}</h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 rounded-lg bg-background hover:bg-surface text-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingInspect ? (
              <div className="flex flex-col items-center py-24 text-xs text-muted font-mono gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Assembling user data export package...</span>
              </div>
            ) : inspectData ? (
              <div className="flex flex-col gap-5 text-left text-xs font-mono">
                {/* Warnings */}
                {selectedReq.is_permanent ? (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive leading-normal flex gap-2.5 items-start">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Permanent Erasure Request (Section 13). Approving this will execute database queries to erase all records. Check below to review active registries.</span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 text-[11px] text-warning leading-normal flex gap-2.5 items-start">
                    <UserX className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Temporary Suspension Request. Executing this will update profiles.is_suspended to TRUE. Login credential remains intact.</span>
                  </div>
                )}

                {/* Inspect Summary list */}
                <div className="flex flex-col gap-2 bg-surface p-4 rounded-xl border border-border">
                  <span className="font-bold text-foreground border-b border-border pb-1.5 text-[10px] uppercase tracking-wider">Account Data Audit Index</span>
                  <div className="flex flex-col gap-1.5 text-[10px] text-muted mt-1">
                    <div className="flex justify-between"><span>Registry ID:</span> <span className="text-foreground font-bold">{inspectData.personal_profile?.profile_id || 'GV-PENDING'}</span></div>
                    <div className="flex justify-between"><span>Star Alignment Rasi:</span> <span className="text-foreground">{inspectData.personal_profile?.rasi || 'N/A'} ({inspectData.personal_profile?.nakshatra || 'N/A'})</span></div>
                    <div className="flex justify-between"><span>Verification Status:</span> <span className="text-foreground">{inspectData.personal_profile?.is_verified ? 'Verified ✓' : 'Unverified'}</span></div>
                    <div className="flex justify-between"><span>Premium Subscription:</span> <span className="text-foreground">{inspectData.personal_profile?.is_premium ? 'Active Premium' : 'Free tier'}</span></div>
                    <div className="flex justify-between"><span>Payment Records:</span> <span className="text-foreground">{inspectData.payment_history?.length || 0} transactions</span></div>
                    <div className="flex justify-between"><span>Photos Registry:</span> <span className="text-foreground">{inspectData.gallery_photos?.length || 0} files</span></div>
                    <div className="flex justify-between"><span>Consent Log Audits:</span> <span className="text-foreground">{inspectData.granted_consents?.length || 0} audits</span></div>
                  </div>
                </div>

                {/* Interactive inspect data collapse */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Raw Portability JSON Preview</span>
                  <pre className="bg-background text-foreground p-4 rounded-xl text-[9px] overflow-x-auto max-h-56 border border-border shadow-inner leading-relaxed">
                    {JSON.stringify(inspectData, null, 2)}
                  </pre>
                </div>

                {/* Footer buttons inside inspector */}
                {selectedReq.status === 'pending' && (
                  <div className="flex gap-2.5 pt-3 border-t border-border mt-auto">
                    <button
                      onClick={() => handleProcessRequest(selectedReq.id, false, selectedReq.is_permanent, selectedReq.user_name)}
                      disabled={processingId !== null}
                      className="flex-1 h-9 rounded-lg border border-border text-muted hover:text-foreground transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer bg-background"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleProcessRequest(selectedReq.id, true, selectedReq.is_permanent, selectedReq.user_name)}
                      disabled={processingId !== null}
                      className="flex-2 h-9 rounded-lg bg-success hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {processingId === selectedReq.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve Deletion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-muted text-xs">
                Failed to retrieve data package.
              </div>
            )}
          </aside>
        )}

      </div>

    </div>
  );
}
