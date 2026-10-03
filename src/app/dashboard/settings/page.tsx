'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Lock, Eye, EyeOff, Save, Trash, HelpCircle, 
  ShieldCheck, ClipboardCheck, FileDown, UserX, CheckCircle, 
  AlertTriangle, ArrowRight, Download, Printer, ShieldAlert,
  Loader2, RefreshCw
} from 'lucide-react';
import { safetyService } from '@/services/safety.service';
import { complianceService } from '@/services/compliance.service';
import { supabase } from '@/lib/supabase';

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'consent' | 'download' | 'delete'>('privacy');
  const [loading, setLoading] = useState(false);

  // ==========================================
  // PRIVACY TAB STATES
  // ==========================================
  const [profileVisible, setProfileVisible] = useState(true);
  const [showPhotoToAll, setShowPhotoToAll] = useState(true);
  const [allowAstroMatch, setAllowAstroMatch] = useState(true);

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Blocked list state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

  // ==========================================
  // CONSENT TAB STATES
  // ==========================================
  const [consentStates, setConsentStates] = useState({
    eligibility: true,
    terms_privacy: true,
    data_processing: true,
    info_accuracy: true
  });
  const [consentLogs, setConsentLogs] = useState<any[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(true);

  // ==========================================
  // DATA EXPORT STATES
  // ==========================================
  const [exportData, setExportData] = useState<any>(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ==========================================
  // DELETION STATES
  // ==========================================
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmErasureText, setConfirmErasureText] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // ==========================================
  // INITIAL DATA LOADER
  // ==========================================
  useEffect(() => {
    fetchProfileAndPrivacy();
    fetchBlockedList();
    fetchConsentData();
    fetchDeletionRequestStatus();
  }, []);

  const fetchProfileAndPrivacy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Resolve users.id
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, visibility, phone_visible, is_suspended')
        .eq('user_id', userRow.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
        setProfileVisible(profile.visibility !== 'private' && !profile.is_suspended);
        setShowPhotoToAll(profile.phone_visible);
      }
    } catch (err) {
      console.error('Error fetching privacy settings:', err);
    }
  };

  const fetchBlockedList = async () => {
    setLoadingBlocks(true);
    try {
      const { data } = await safetyService.getBlockedUsers();
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Error fetching blocklist:', err);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const fetchConsentData = async () => {
    setLoadingConsents(true);
    try {
      const { data: logs } = await complianceService.getConsentLogs();
      setConsentLogs(logs || []);

      // Calculate current states from latest log values
      const current = {
        eligibility: true,
        terms_privacy: true,
        data_processing: true,
        info_accuracy: true
      };

      if (logs && logs.length > 0) {
        const types = ['eligibility', 'terms_privacy', 'data_processing', 'info_accuracy'] as const;
        types.forEach(t => {
          const latest = logs.find((l: any) => l.consent_type === t);
          if (latest) {
            current[t] = latest.accepted;
          }
        });
      }
      setConsentStates(current);
    } catch (err) {
      console.error('Error fetching consent logs:', err);
    } finally {
      setLoadingConsents(false);
    }
  };

  const fetchDeletionRequestStatus = async () => {
    try {
      const { data } = await complianceService.getDeletionRequest();
      setActiveRequest(data || null);
    } catch (err) {
      console.error('Error fetching deletion status:', err);
    }
  };

  // ==========================================
  // ACTIONS & HANDLERS
  // ==========================================
  const handlePrivacySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found');

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) throw new Error('User account not found');

      // Update database profile
      const { error } = await supabase
        .from('profiles')
        .update({
          visibility: profileVisible ? 'public' : 'private',
          phone_visible: showPhotoToAll
        })
        .eq('user_id', userRow.id);

      if (error) throw error;

      alert('Privacy & Visibility settings updated successfully!');
      fetchProfileAndPrivacy();
    } catch (err: any) {
      alert('Error saving privacy settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert('Account credentials password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert('Error updating password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId: string, name: string) => {
    const confirmUnblock = confirm(`Are you sure you want to unblock ${name}?`);
    if (!confirmUnblock) return;

    try {
      const { success, error } = await safetyService.unblockUser(blockedUserId);
      if (error) throw error;
      alert(`Unblocked member ${name}`);
      fetchBlockedList();
    } catch (e: any) {
      alert('Error unblocking: ' + e.message);
    }
  };

  const handleConsentToggle = async (type: keyof typeof consentStates) => {
    const nextVal = !consentStates[type];
    
    // Prompt warning for critical consents
    if (!nextVal && (type === 'eligibility' || type === 'terms_privacy')) {
      const revokeConfirm = confirm(
        `WARNING: Revoking your consent to "${
          type === 'eligibility' ? 'Age Eligibility' : 'Terms & Privacy Policy'
        }" will prevent you from utilizing our services. Administrators may restrict profile matching access. Proceed?`
      );
      if (!revokeConfirm) return;
    }

    setConsentStates(prev => ({ ...prev, [type]: nextVal }));
    try {
      const { error } = await complianceService.updateConsent(type, nextVal);
      if (error) throw error;
      fetchConsentData();
    } catch (err: any) {
      alert('Error logging consent change: ' + err.message);
      // Rollback UI toggle
      setConsentStates(prev => ({ ...prev, [type]: !nextVal }));
    }
  };

  const handlePrepareExportData = async () => {
    setLoadingExport(true);
    try {
      const { data, error } = await complianceService.exportUserData();
      if (error) throw error;
      setExportData(data);
      setShowPreview(true);
    } catch (err: any) {
      alert('Error generating data export: ' + err.message);
    } finally {
      setLoadingExport(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gv_matrimony_data_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const handleDeactivateProfile = async () => {
    const isConfirm = confirm(
      'Are you sure you want to temporarily deactivate your profile? You will be hidden from searches and matches, but all profile details will remain preserved for reactivation.'
    );
    if (!isConfirm) return;

    setLoading(true);
    try {
      const { error } = await complianceService.submitDeletionRequest(false);
      if (error) throw error;

      alert('Profile deactivated successfully! You are now hidden from matching indexes.');
      fetchProfileAndPrivacy();
      fetchDeletionRequestStatus();
    } catch (err: any) {
      alert('Deactivation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitErasureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionReason) {
      alert('Please select a reason for erasure.');
      return;
    }
    if (!confirmCheckbox) {
      alert('Please confirm that you understand the permanent nature of data erasure.');
      return;
    }
    if (confirmErasureText !== 'I want to permanently erase my data') {
      alert('Please type the confirmation phrase exactly.');
      return;
    }

    setSubmittingDeletion(true);
    try {
      const { error } = await complianceService.submitDeletionRequest(true);
      if (error) throw error;

      alert('Permanent account deletion request submitted. Administrators will review and scrub your data within 7 business days.');
      setDeletionReason('');
      setConfirmErasureText('');
      setConfirmCheckbox(false);
      fetchDeletionRequestStatus();
    } catch (err: any) {
      alert('Error submitting deletion request: ' + err.message);
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const handleCancelDeletion = async (reqId: string) => {
    const isConfirm = confirm('Are you sure you want to cancel your permanent data erasure request?');
    if (!isConfirm) return;

    setLoading(true);
    try {
      const { success, error } = await complianceService.cancelDeletionRequest(reqId);
      if (error || !success) throw error || new Error('Cancellation failed');
      alert('Data erasure request successfully cancelled.');
      fetchDeletionRequestStatus();
    } catch (err: any) {
      alert('Cancellation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'privacy', name: 'Privacy Settings', icon: Settings, desc: 'Visibility & Security' },
    { id: 'consent', name: 'Consent History', icon: ClipboardCheck, desc: 'DPDP Log Management' },
    { id: 'download', name: 'Download My Data', icon: FileDown, desc: 'Data Portability' },
    { id: 'delete', name: 'Delete Account', icon: UserX, desc: 'Erasure & Suspension' },
  ] as const;

  return (
    <div className="flex flex-col gap-8 text-left w-full print:p-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-sandal-200/50 dark:border-zinc-800/60 pb-6 print:hidden">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            Settings &amp; Compliance Console
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-xl">
            Control your privacy toggles, review historical DPDP Act consent tokens, export portability datasets, or request account erasure.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-sandal-100/50 dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-850 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest text-maroon-700 dark:text-gold-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-maroon-600 dark:text-gold-400" />
          <span>DPDP ACT COMPLIANT</span>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:flex flex-col gap-2 pb-6 border-b border-zinc-300">
        <h1 className="text-2xl font-serif font-bold text-black">Gokul Vivaham Matrimony</h1>
        <h2 className="text-lg font-bold text-zinc-700">Digital Personal Data Portability Summary</h2>
        <p className="text-xs text-zinc-500 font-mono">Export Date: {new Date().toLocaleString()} | Account Ref: {userProfile?.first_name} {userProfile?.last_name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full print:block">
        
        {/* LEFT COLUMN: TAB NAVIGATION */}
        <aside className="lg:col-span-3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none w-full print:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left shrink-0 lg:shrink w-auto lg:w-full border ${
                  isActive 
                    ? 'bg-maroon-500/10 dark:bg-gold-500/10 text-maroon-700 dark:text-gold-400 border-maroon-250 dark:border-gold-500/25 font-semibold shadow-inner' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 border-transparent hover:border-sandal-100 dark:hover:border-zinc-800'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-maroon-600 dark:text-gold-400' : 'text-zinc-400'}`} />
                <div className="flex flex-col">
                  <span className="text-xs leading-none font-bold tracking-wide">{tab.name}</span>
                  <span className="text-[9px] text-zinc-400 font-light mt-0.5 leading-none">{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* RIGHT COLUMN: TAB MAIN AREA */}
        <section className="lg:col-span-9 flex flex-col gap-8 w-full print:block">
          
          {/* ==========================================
              TAB 1: PRIVACY & CREDENTIALS
              ========================================== */}
          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-300 print:hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
                {/* Left side Forms */}
                <div className="lg:col-span-8 flex flex-col gap-8 w-full">
                  {/* Privacy Toggles */}
                  <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80">
                    <form onSubmit={handlePrivacySave} className="flex flex-col gap-6">
                      <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-850 pb-3.5 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-maroon-600 dark:text-gold-400" />
                        Profile Privacy Controls
                      </h2>

                      <div className="flex flex-col gap-4 text-xs font-semibold text-zinc-500">
                        <label className="flex items-center justify-between p-4 rounded-2xl bg-sandal-50/20 dark:bg-zinc-950/20 border border-sandal-100/50 dark:border-zinc-850/80 cursor-pointer select-none">
                          <div className="flex flex-col gap-1 text-left pr-4">
                            <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">Public Profile Visibility</span>
                            <span className="text-xs font-light text-zinc-400 leading-normal">
                              When active, your profile matches and details show up in searches. Disable to go invisible.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={profileVisible}
                            disabled={userProfile?.is_suspended}
                            onChange={(e) => setProfileVisible(e.target.checked)}
                            className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 rounded-2xl bg-sandal-50/20 dark:bg-zinc-950/20 border border-sandal-100/50 dark:border-zinc-850/80 cursor-pointer select-none">
                          <div className="flex flex-col gap-1 text-left pr-4">
                            <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">Contact Number Privacy</span>
                            <span className="text-xs font-light text-zinc-400 leading-normal">
                              Show your registered mobile coordinates to matched and verified members only.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={showPhotoToAll}
                            onChange={(e) => setShowPhotoToAll(e.target.checked)}
                            className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 rounded-2xl bg-sandal-50/20 dark:bg-zinc-950/20 border border-sandal-100/50 dark:border-zinc-850/80 cursor-pointer select-none">
                          <div className="flex flex-col gap-1 text-left pr-4">
                            <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">Allow Horoscope Matching</span>
                            <span className="text-xs font-light text-zinc-400 leading-normal">
                              Let compatible matches run star alignment metrics against your birth coordinates automatically.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={allowAstroMatch}
                            onChange={(e) => setAllowAstroMatch(e.target.checked)}
                            className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer"
                          />
                        </label>
                      </div>

                      {userProfile?.is_suspended && (
                        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Your profile is currently deactivated. Go to the "Delete Account" tab to reactivate visibility.</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-2.5 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow hover:opacity-90 flex items-center gap-2 cursor-pointer transition-opacity"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Visibility Rules
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Password Form */}
                  <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80">
                    <form onSubmit={handlePasswordSave} className="flex flex-col gap-6">
                      <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-850 pb-3.5 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-maroon-600 dark:text-gold-400" />
                        Update Password Credentials
                      </h2>

                      <div className="grid grid-cols-1 gap-4 text-xs font-semibold text-zinc-500">
                        <div className="flex flex-col gap-1 text-left">
                          <label className="uppercase tracking-wider">Old Password</label>
                          <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 dark:focus:ring-gold-400 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>

                        <div className="flex flex-col gap-1 text-left">
                          <label className="uppercase tracking-wider">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 dark:focus:ring-gold-400 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>

                        <div className="flex flex-col gap-1 text-left">
                          <label className="uppercase tracking-wider">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 dark:focus:ring-gold-400 text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-2.5 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow hover:opacity-90 flex items-center gap-2 cursor-pointer transition-opacity"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Update Credentials
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right side Blocked List */}
                <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-5 w-full">
                  <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                    Blocked Members
                  </h2>

                  {loadingBlocks ? (
                    <div className="flex flex-col items-center py-8 text-xs text-zinc-400 font-mono gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                      <span>Loading blocklist...</span>
                    </div>
                  ) : blockedUsers.length > 0 ? (
                    <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                      {blockedUsers.map((user) => (
                        <div 
                          key={user.id}
                          className="p-3.5 rounded-xl bg-sandal-50/20 dark:bg-zinc-950/40 border border-sandal-100/50 dark:border-zinc-850 flex items-center justify-between gap-3 text-left"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.blocked_name}</span>
                            <span className="text-[10px] text-zinc-450 font-mono mt-0.5">{user.blocked_profile_id}</span>
                            {user.reason && (
                              <span className="text-[9px] text-zinc-500 mt-1 italic leading-tight truncate" title={user.reason}>
                                Reason: {user.reason}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleUnblock(user.blocked_user_id, user.blocked_name)}
                            className="p-2 rounded-lg border border-zinc-100 dark:border-zinc-850 text-zinc-400 hover:text-red-500 hover:border-red-200/50 hover:bg-red-500/5 transition-all cursor-pointer shrink-0"
                            title="Unblock Member"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-400 font-mono text-[10px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20">
                      No blocked members.
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-light">
                    Blocked profiles cannot view your horoscope files, see phone details, or send connection expressions of interest.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: CONSENT HISTORY (DPDP LOGS)
              ========================================== */}
          {activeTab === 'consent' && (
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-6 animate-in fade-in duration-300 print:hidden">
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-850 pb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-maroon-600 dark:text-gold-400" />
                    Consent Log Management
                  </h2>
                  <span className="text-xs text-zinc-400 font-light">India DPDP Act (Section 6) compliance. Authorize and manage data processing consents.</span>
                </div>
                <button 
                  onClick={fetchConsentData}
                  className="p-2 rounded-lg border border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Reload Consent Log"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingConsents ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* DPDP Legal Summary */}
              <div className="p-4 rounded-2xl bg-sandal-50/30 dark:bg-zinc-950/20 border border-sandal-100/50 dark:border-zinc-850 text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-light flex gap-3.5 items-start">
                <ShieldCheck className="h-5 w-5 text-maroon-600 dark:text-gold-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-left">
                  <strong className="font-bold text-zinc-850 dark:text-zinc-200">Legal Processing Notice:</strong>
                  <span>Under the Digital Personal Data Protection Act, 2023, you have the right to grant, manage, or withdraw consent at any time. Revoking consent will not retroactively invalidate data processing completed while consent was active.</span>
                </div>
              </div>

              {/* Consent Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Age Eligibility */}
                <div className="p-5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/80 flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Age &amp; Marriage Eligibility</span>
                    <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                      Consent confirming you are above the legal marriageable age in India (18 for females, 21 for males).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentStates.eligibility}
                    onChange={() => handleConsentToggle('eligibility')}
                    className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer mt-1"
                  />
                </div>

                {/* 2. Terms & Privacy */}
                <div className="p-5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/80 flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Terms &amp; Privacy Policy Agreement</span>
                    <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                      General authorization allowing the processing and indexing of your personal information according to site privacy protocols.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentStates.terms_privacy}
                    onChange={() => handleConsentToggle('terms_privacy')}
                    className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer mt-1"
                  />
                </div>

                {/* 3. Data Processing */}
                <div className="p-5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/80 flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Matrimonial Search Match Indexing</span>
                    <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                      Consent allowing Gokul Vivaham algorithms to process, compute, and show matching criteria (caste, Rasi, star coordinates) to other active searchers.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentStates.data_processing}
                    onChange={() => handleConsentToggle('data_processing')}
                    className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer mt-1"
                  />
                </div>

                {/* 4. Information Accuracy */}
                <div className="p-5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/80 flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Information Accuracy Declarations</span>
                    <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                      Acknowledgement and legal consent declaring all matrimonial profile fields and verification files are genuine.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentStates.info_accuracy}
                    onChange={() => handleConsentToggle('info_accuracy')}
                    className="h-5 w-5 text-maroon-600 rounded border-zinc-300 accent-maroon-600 dark:accent-gold-400 shrink-0 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Consent Logs Table */}
              <div className="flex flex-col gap-4 mt-4">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-serif">Consent Audit History Trail</h3>
                
                {loadingConsents ? (
                  <div className="flex flex-col items-center py-10 text-xs text-zinc-400 font-mono gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    <span>Retrieving log entries...</span>
                  </div>
                ) : consentLogs.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-850/80">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-50 dark:bg-zinc-950/45 text-zinc-450 border-b border-zinc-100 dark:border-zinc-850">
                        <tr>
                          <th className="p-3">Log Timestamp</th>
                          <th className="p-3">Consent Scope</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Policy V.</th>
                          <th className="p-3">Access Log IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 text-zinc-300">
                        {consentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-950/10">
                            <td className="p-3 whitespace-nowrap text-zinc-400">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-3 font-semibold text-zinc-200 uppercase tracking-wider">
                              {log.consent_type.replace('_', ' ')}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                log.accepted 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-950/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-950/20'
                              }`}>
                                {log.accepted ? 'GRANTED' : 'REVOKED'}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-400">v{log.policy_version}</td>
                            <td className="p-3 text-zinc-400 truncate max-w-[120px]" title={log.device_metadata}>
                              {log.ip_address}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20">
                    No compliance consent logs found in system database.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: DOWNLOAD MY DATA (PORTABILITY)
              ========================================== */}
          {activeTab === 'download' && (
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-6 animate-in fade-in duration-300 print:shadow-none print:border-none print:bg-transparent print:p-0">
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-850 pb-4 print:hidden">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-maroon-600 dark:text-gold-400" />
                    Download My Data
                  </h2>
                  <span className="text-xs text-zinc-400 font-light">DPDP Act (Section 12) Data Portability compliance. Export all records.</span>
                </div>
              </div>

              {/* DPDP Legal Summary */}
              <div className="p-4 rounded-2xl bg-sandal-50/30 dark:bg-zinc-950/20 border border-sandal-100/50 dark:border-zinc-850 text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-light flex gap-3.5 items-start print:hidden">
                <FileDown className="h-5 w-5 text-maroon-600 dark:text-gold-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-left">
                  <strong className="font-bold text-zinc-850 dark:text-zinc-200">Portability Processing Details:</strong>
                  <span>Under the Section 12 right to information, you have the right to download a readable, portable copy of all matrimonial, financial, and usage logs recorded under your profile.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center print:hidden">
                <div className="flex flex-col gap-3 text-left">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Export Contents Included</h3>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4 font-light">
                    <li>Account credentials &amp; profile registry identifiers</li>
                    <li>Matrimonial bio, family profiles, education, and career details</li>
                    <li>Star signs, matching rasi parameters, and horoscope registry</li>
                    <li>IP login trails, device logs, and system activity records</li>
                    <li>Billing transaction invoices, subscription logs, and payments</li>
                    <li>DPDP compliance consent history and blocked accounts list</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3.5 p-6 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850">
                  <span className="text-[11px] font-bold font-serif text-zinc-600 dark:text-zinc-400 uppercase tracking-widest text-center">Prepare Export Payload</span>
                  <button
                    onClick={handlePrepareExportData}
                    disabled={loadingExport}
                    className="w-full h-11 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 transition-opacity"
                  >
                    {loadingExport ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Preparing Dataset...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" /> Generate Data Package
                      </>
                    )}
                  </button>
                </div>
              </div>

              {exportData && (
                <div className="flex flex-col gap-5 border-t border-zinc-150 dark:border-zinc-850 pt-6 mt-2 print:border-none print:pt-0">
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 items-center print:hidden">
                    <button
                      onClick={handleDownloadJSON}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gold-450 border border-gold-500/25 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4" /> Download JSON File
                    </button>
                    <button
                      onClick={handlePrintSummary}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      <Printer className="h-4 w-4" /> Print Data Report
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono">Size: ~{(JSON.stringify(exportData).length / 1024).toFixed(2)} KB</span>
                  </div>

                  {/* Visual Summary Sheet (Stunning table layout readable on UI and perfect for printing!) */}
                  <div className="flex flex-col gap-6 text-left p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850/80 font-sans print:border-none print:bg-transparent print:p-0">
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-850 pb-3">
                      <h4 className="text-sm font-bold uppercase tracking-wide font-serif text-maroon-700 dark:text-gold-450">Matrimonial Dataset Portability Index</h4>
                      <span className="text-[10px] text-zinc-500 font-mono hidden print:inline">GV-PORTABILITY-EXPORT</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed print:grid-cols-2">
                      {/* Account Table */}
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-150 dark:border-zinc-850 pb-1">1. User Credentials Registry</span>
                        <div className="flex flex-col gap-1.5 font-mono text-[11px] text-zinc-400">
                          <div className="flex justify-between"><span>User DB Identifier:</span> <span className="text-zinc-300">{exportData.user_account?.id}</span></div>
                          <div className="flex justify-between"><span>Email Address:</span> <span className="text-zinc-300">{exportData.user_account?.email}</span></div>
                          <div className="flex justify-between"><span>Role Category:</span> <span className="text-zinc-300">{exportData.user_account?.role}</span></div>
                          <div className="flex justify-between"><span>Account Status:</span> <span className="text-zinc-300 uppercase font-bold text-emerald-400">{exportData.user_account?.status}</span></div>
                        </div>
                      </div>

                      {/* Profile Details */}
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-150 dark:border-zinc-850 pb-1">2. Public Matrimony Bio</span>
                        <div className="flex flex-col gap-1.5 font-mono text-[11px] text-zinc-400">
                          <div className="flex justify-between"><span>Profile Registry ID:</span> <span className="text-zinc-300 font-bold">{exportData.personal_profile?.profile_id}</span></div>
                          <div className="flex justify-between"><span>Full Registrant Name:</span> <span className="text-zinc-300">{exportData.personal_profile?.first_name} {exportData.personal_profile?.last_name}</span></div>
                          <div className="flex justify-between"><span>Gender Group:</span> <span className="text-zinc-300">{exportData.personal_profile?.gender}</span></div>
                          <div className="flex justify-between"><span>Date of Birth:</span> <span className="text-zinc-300">{exportData.personal_profile?.date_of_birth}</span></div>
                          <div className="flex justify-between"><span>Home Location:</span> <span className="text-zinc-300">{exportData.personal_profile?.city || 'Not Registered'}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible raw preview toggle */}
                    <div className="flex flex-col gap-2.5 mt-3 print:hidden">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-left text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:underline flex items-center gap-1.5"
                      >
                        {showPreview ? '[-] Hide Raw JSON Payload Preview' : '[+] Inspect Raw JSON Payload Preview'}
                      </button>

                      {showPreview && (
                        <div className="relative animate-in slide-in-from-top-2 duration-200">
                          <pre className="bg-zinc-950 text-emerald-400/90 p-4 rounded-xl text-[10px] overflow-x-auto max-h-60 font-mono border border-zinc-850 shadow-inner">
                            {JSON.stringify(exportData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB 4: DELETE ACCOUNT (ERASURE & SUSPENSION)
              ========================================== */}
          {activeTab === 'delete' && (
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-8 animate-in fade-in duration-300 print:hidden">
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-850 pb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                    <UserX className="h-5 w-5 text-maroon-600 dark:text-gold-400" />
                    Account Deactivation &amp; Deletion
                  </h2>
                  <span className="text-xs text-zinc-400 font-light">DPDP Act (Section 13) Right to Erasure / Forgotten. Manage deactivation or erasure.</span>
                </div>
              </div>

              {/* Check active deletion request */}
              {activeRequest ? (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/25 flex flex-col gap-4 text-left">
                  <div className="flex items-center gap-2.5 text-amber-500">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-bold uppercase tracking-wider font-serif">Erasure Request Pending Review</span>
                  </div>
                  <div className="text-xs text-zinc-400 leading-relaxed font-light">
                    You have an active permanent data erasure request submitted on <strong className="font-semibold text-zinc-300">{new Date(activeRequest.requested_at).toLocaleDateString()}</strong>.
                    <p className="mt-2">
                      Under the DPDP Act 2023, data erasure requests are reviewed and permanently processed by our safety moderators within 7 business days. You can cancel this request at any time before it is finalized.
                    </p>
                  </div>
                  <div className="flex pt-2">
                    <button
                      onClick={() => handleCancelDeletion(activeRequest.id)}
                      disabled={loading}
                      className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider cursor-pointer border border-zinc-700 hover:border-zinc-650 transition-colors shadow flex items-center gap-1.5"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Cancel Erasure Request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
                  
                  {/* OPTION A: TEMPORARY SUSPENSION */}
                  <div className="p-6 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 flex flex-col gap-4 text-left h-full">
                    <span className="text-sm font-serif font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Option 1: Temporary Suspension</span>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Deactivating hides your public matrimonial profile immediately. Other searchers cannot view your details, photos, or horoscopes.
                    </p>
                    <div className="p-3 bg-sandal-50/20 dark:bg-zinc-900 border border-sandal-100/50 dark:border-zinc-850 rounded-xl text-[11px] text-zinc-450 leading-relaxed font-light">
                      • Preserves subscription settings.<br />
                      • Freezes chat messages.<br />
                      • Reactivate instantly by saving your visibility rules in Settings.
                    </div>
                    
                    <div className="mt-auto pt-4 flex">
                      {userProfile?.is_suspended ? (
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (user) {
                                const { data: userRow } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
                                if (userRow) {
                                  await supabase.from('profiles').update({ is_suspended: false, suspended_at: null, visibility: 'public' }).eq('user_id', userRow.id);
                                }
                              }
                              alert('Profile reactivated successfully! Visibility set to Public.');
                              fetchProfileAndPrivacy();
                            } catch (e: any) {
                              alert('Reactivation error: ' + e.message);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow transition-colors text-white"
                        >
                          Reactivate Matrimonial Profile
                        </button>
                      ) : (
                        <button
                          onClick={handleDeactivateProfile}
                          className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider cursor-pointer border border-zinc-700 hover:border-zinc-600 transition-colors shadow"
                        >
                          Deactivate Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* OPTION B: PERMANENT DATA ERASURE */}
                  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-950/20 flex flex-col gap-4 text-left">
                    <span className="text-sm font-serif font-bold text-red-500 uppercase tracking-wide">Option 2: Permanent Account Erasure</span>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Queues account deletion under the DPDP Act. Approved erasure scrubs all profile databases, horoscopes, photos, preferences, and payments.
                    </p>

                    <form onSubmit={handleSubmitErasureRequest} className="flex flex-col gap-4 mt-2">
                      <div className="flex flex-col gap-1 text-xs">
                        <label className="text-zinc-400">Select Deletion Reason:</label>
                        <select
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="h-10 px-2 rounded-lg bg-zinc-950 border border-zinc-850 text-zinc-300 text-xs focus:outline-none focus:border-red-900/40"
                        >
                          <option value="">-- Choose Reason --</option>
                          <option value="Found match on Gokul Vivaham">Found my match on Gokul Vivaham</option>
                          <option value="Found match elsewhere">Found my match elsewhere</option>
                          <option value="Privacy concerns under DPDP">Privacy concerns</option>
                          <option value="No longer searching">No longer searching / other</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        <label className="text-zinc-400">Type confirmation phrase:</label>
                        <span className="text-[10px] text-red-400/80 italic font-mono">"I want to permanently erase my data"</span>
                        <input
                          type="text"
                          value={confirmErasureText}
                          onChange={(e) => setConfirmErasureText(e.target.value)}
                          placeholder="Type phrase here..."
                          className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-850 text-xs focus:outline-none text-zinc-200"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={confirmCheckbox}
                          onChange={(e) => setConfirmCheckbox(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded text-red-600 border-zinc-700 accent-red-600 shrink-0"
                        />
                        <span className="text-[10px] text-zinc-400 leading-normal font-light">
                          I understand that this action is permanent. All photos, matchmaking logs, star coordinate profiles, and history will be irreversibly deleted.
                        </span>
                      </label>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submittingDeletion}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer transition-colors"
                        >
                          {submittingDeletion ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
                          Submit Erasure Request
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}
            </div>
          )}

        </section>

      </div>

    </div>
  );
}
