'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, 
  Mail, Phone, Upload, Loader2, ArrowRight, 
  ShieldAlert, Award, FileText, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadService } from '@/services/upload.service';
import { verificationService } from '@/services/verification.service';

export default function UserVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userRow, setUserRow] = useState<any>(null);
  const [contactMessage, setContactMessage] = useState('');

  // Upload/Verification States
  const [idType, setIdType] = useState('Aadhaar');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idUploading, setIdUploading] = useState(false);

  const [horoscopeFile, setHoroscopeFile] = useState<File | null>(null);
  const [horoscopeUploading, setHoroscopeUploading] = useState(false);

  // Email verification dialog states
  const [emailValue, setEmailValue] = useState('');
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Mobile verification dialog states
  const [mobileValue, setMobileValue] = useState('');
  const [showMobileOtp, setShowMobileOtp] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileVerifying, setMobileVerifying] = useState(false);

  const [dbUserId, setDbUserId] = useState<string>('');

  const loadVerificationData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        if (user.email_confirmed_at) await verificationService.syncContactVerification('email');
        if (user.phone && user.phone_confirmed_at) await verificationService.syncContactVerification('mobile');
      } catch (error) { setContactMessage(error instanceof Error ? error.message : 'Verification status could not be synchronized.'); }

      // 1. Fetch user row
      const { data: uRow } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (uRow) {
        setUserRow(uRow);
        setDbUserId(uRow.id);
        setEmailValue(user.email || '');
        setMobileValue(uRow.mobile_number || '');
      }

      // 2. Fetch profile
      const { data: pRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', uRow?.id || user.id)
        .maybeSingle();

      if (pRow) {
        setProfile(pRow);
      }
    } catch (err) {
      console.error('Error fetching verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

  // Handlers for Email Verify
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMessage('');
    setEmailVerifying(true);
    try {
      const { error } = await verificationService.sendContactOtp('email', emailValue);
      if (error) throw error;
      setShowEmailOtp(true);
    } catch (error) { setContactMessage(error instanceof Error ? error.message : 'Email delivery failed.'); }
    finally { setEmailVerifying(false); }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailVerifying(true);
    try {
      const { error } = await verificationService.verifyEmailOrMobile('email', emailValue, emailOtp);
      if (error) throw error;
      alert('Email verified successfully!');
      setShowEmailOtp(false);
      setEmailOtp('');
      loadVerificationData();
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setEmailVerifying(false);
    }
  };

  // Handlers for Mobile Verify
  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMessage('');
    setMobileVerifying(true);
    try {
      const { error } = await verificationService.sendContactOtp('mobile', mobileValue);
      if (error) throw error;
      setShowMobileOtp(true);
    } catch (error) { setContactMessage(error instanceof Error ? error.message : 'SMS delivery failed.'); }
    finally { setMobileVerifying(false); }
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMobileVerifying(true);
    try {
      const { error } = await verificationService.verifyEmailOrMobile('mobile', mobileValue, mobileOtp);
      if (error) throw error;
      alert('Mobile number verified successfully!');
      setShowMobileOtp(false);
      setMobileOtp('');
      loadVerificationData();
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setMobileVerifying(false);
    }
  };

  // Handler for ID Proof Upload
  const handleIdUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile) return;

    setIdUploading(true);
    try {
      const { url, error } = await uploadService.uploadFile(idFile, 'id-proofs');
      if (error) throw error;

      if (url) {
        const { error: reqErr } = await verificationService.submitVerificationRequest('id_proof', url, idType);
        if (reqErr) throw reqErr;

        alert('Government ID uploaded and submitted for moderation.');
        setIdFile(null);
        loadVerificationData();
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIdUploading(false);
    }
  };

  // Handler for Horoscope Upload
  const handleHoroscopeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horoscopeFile) return;

    setHoroscopeUploading(true);
    try {
      const { url, error } = await uploadService.uploadFile(horoscopeFile, 'horoscopes');
      if (error) throw error;

      if (url) {
        const { error: reqErr } = await verificationService.submitVerificationRequest('horoscope', url, 'Horoscope');
        if (reqErr) throw reqErr;

        alert('Horoscope document uploaded and submitted for moderation.');
        setHoroscopeFile(null);
        loadVerificationData();
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setHoroscopeUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] text-sm text-zinc-500 font-mono gap-3">
        <Loader2 className="h-8 w-8 border-4 border-maroon-500 border-t-transparent rounded-full animate-spin text-maroon-600" />
        Syncing verification status...
      </div>
    );
  }

  // Get current status formats
  const idStatus = !profile?.id_verification_status || profile.id_verification_status === 'unverified' ? 'none' : profile.id_verification_status;
  const idReason = profile?.id_verification_rejection_reason;
  const horoscopeStatus = !profile?.horoscope_verification_status || profile.horoscope_verification_status === 'unverified' ? 'none' : profile.horoscope_verification_status;
  const horoscopeReason = profile?.horoscope_verification_rejection_reason;

  const emailVerified = userRow?.email_verified || false;
  const mobileVerified = userRow?.mobile_verified || false;

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full">
      {contactMessage && <p role="alert" className="p-3 rounded-xl border border-red-300 text-sm text-red-700 dark:text-red-300">{contactMessage}</p>}
      {/* Title */}
      <div className="flex flex-col gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-500" /> Profile Verification Center
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-xl">
          Matrimonial trust starts with authenticity. Verify your profile, upload your documents securely, and get badges to stand out to compatible partners.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Digital Identity Verifications (Email & Mobile) */}
        <div className="md:col-span-6 flex flex-col gap-6">
          
          {/* Card 1: Email Verification */}
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${emailVerified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Email Verification</span>
                  <span className="text-[10px] text-zinc-400 font-light">Confirms your digital matching identity</span>
                </div>
              </div>

              {emailVerified ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-bold uppercase tracking-wider">
                  Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  Unverified
                </span>
              )}
            </div>

            {emailVerified ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>Verified: <strong className="font-semibold">{userRow?.email}</strong></span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {!showEmailOtp ? (
                  <form onSubmit={handleSendEmailOtp} className="flex gap-2">
                    <input 
                      type="email"
                      aria-label="Account email"
                      value={emailValue} 
                      readOnly
                      placeholder="Enter email address"
                      className="flex-1 px-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-maroon-500"
                      required
                    />
                    <button 
                      type="submit"
                      disabled={emailVerifying}
                      className="px-4 py-2 rounded-xl bg-maroon-500 hover:bg-maroon-600 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailOtp} className="flex flex-col gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                    <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                      Check <strong className="text-zinc-700 dark:text-zinc-300">{emailValue}</strong> for a verification code or sign-in link. Enter the code below, or follow the link and return here.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={10}
                        value={emailOtp} 
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="Email verification code"
                        aria-label="Email verification code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="flex-1 px-4 py-2 text-center text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 tracking-widest focus:outline-none"
                        required
                      />
                      <button 
                        type="submit"
                        disabled={emailVerifying}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1"
                      >
                        {emailVerifying && <Loader2 className="h-3 w-3 animate-spin" />} Submit
                      </button>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowEmailOtp(false)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-650 self-start"
                    >
                      Back / resend
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Mobile Verification */}
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${mobileVerified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Mobile Verification</span>
                  <span className="text-[10px] text-zinc-400 font-light">Unlocks direct communication channels</span>
                </div>
              </div>

              {mobileVerified ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-bold uppercase tracking-wider">
                  Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  Unverified
                </span>
              )}
            </div>

            {mobileVerified ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>Verified: <strong className="font-semibold">{userRow?.mobile_number}</strong></span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {!showMobileOtp ? (
                  <form onSubmit={handleSendMobileOtp} className="flex gap-2">
                    <input 
                      type="tel"
                      aria-label="Mobile number with country code"
                      value={mobileValue} 
                      onChange={(e) => setMobileValue(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="flex-1 px-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-maroon-500"
                      required
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-maroon-500 hover:bg-maroon-600 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                      disabled={mobileVerifying}
                    >
                      Verify
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyMobileOtp} className="flex flex-col gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
                    <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                      Verification code sent to <strong className="text-zinc-700 dark:text-zinc-300">{mobileValue}</strong>. Enter your SMS code below. Expired codes must be resent.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={6} 
                        value={mobileOtp} 
                        onChange={(e) => setMobileOtp(e.target.value)}
                        placeholder="6-digit OTP code"
                        aria-label="SMS verification code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="flex-1 px-4 py-2 text-center text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 tracking-widest focus:outline-none"
                        required
                      />
                      <button 
                        type="submit"
                        disabled={mobileVerifying}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1"
                      >
                        {mobileVerifying && <Loader2 className="h-3 w-3 animate-spin" />} Submit
                      </button>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowMobileOtp(false)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-650 self-start"
                    >
                      Change Number
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Document verifications (ID Proof & Horoscope) */}
        <div className="md:col-span-6 flex flex-col gap-6">
          
          {/* Card 3: Government ID Verification */}
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4 text-left">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${idStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : idStatus === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">ID Proof Verification</span>
                  <span className="text-[10px] text-zinc-400 font-light">Official government credential check</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                idStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-600' :
                idStatus === 'pending' ? 'bg-amber-500/15 text-amber-600 animate-pulse' :
                idStatus === 'resubmit_requested' ? 'bg-orange-550/15 text-orange-655' :
                idStatus === 'rejected' ? 'bg-red-500/15 text-red-600' :
                'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-450'
              }`}>
                {idStatus === 'none' ? 'Not Uploaded' : idStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Render ID based on status */}
            {idStatus === 'approved' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-light">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="font-semibold">Identity Verified Successfully</span>
                    <span>Your document <strong className="font-semibold">({profile?.id_verification_type})</strong> has been verified. Other members will see the "ID Verified" badge on your profile.</span>
                  </div>
                </div>
              </div>
            )}

            {idStatus === 'pending' && (
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/5 border border-amber-500/10 rounded-2xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-450 font-light">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col text-left gap-1">
                  <span className="font-semibold">Awaiting Verification Review</span>
                  <span>Your government ID document has been submitted and is currently in the queue for manual administrator review. This process normally completes in 12-24 hours.</span>
                  <span className="text-[10px] text-zinc-450 mt-1">Your document is private and available to authorized reviewers.</span>
                </div>
              </div>
            )}

            {(idStatus === 'rejected' || idStatus === 'resubmit_requested') && (
              <div className="flex flex-col gap-4">
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-light ${
                  idStatus === 'rejected' 
                    ? 'bg-red-50/50 dark:bg-red-950/5 border-red-500/10 text-red-700 dark:text-red-400' 
                    : 'bg-orange-50/50 dark:bg-orange-950/5 border-orange-500/10 text-orange-700 dark:text-orange-400'
                }`}>
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left gap-1">
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {idStatus === 'rejected' ? 'ID Proof Rejected' : 'Resubmission Requested'}
                    </span>
                    <span>Moderator feedback: <strong className="font-semibold font-serif italic text-zinc-900 dark:text-white">"{idReason || 'No comment provided'}"</strong></span>
                    <span className="mt-1">Please upload a valid, clear government-issued ID document to fix this error.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Controls for ID */}
            {(idStatus === 'none' || idStatus === 'rejected' || idStatus === 'resubmit_requested') && (
              <form onSubmit={handleIdUpload} className="flex flex-col gap-4.5">
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="verification-id-type" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Select ID Type</label>
                  <select 
                    id="verification-id-type"
                    value={idType} 
                    onChange={(e) => setIdType(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="Aadhaar">Aadhaar Card (First 8 digits can be masked)</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Passport">Indian Passport</option>
                    <option value="VoterID">Voter ID Card</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="verification-id-file" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-left">Upload Document File (JPEG, PNG, WebP or PDF)</label>
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-maroon-500/50 dark:hover:border-gold-500/40 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
                    <input 
                      type="file"
                      id="verification-id-file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <div className="flex flex-col items-center gap-1.5 text-zinc-400 select-none">
                      <Upload className="h-6 w-6 text-zinc-400 group-hover:text-maroon-600 dark:group-hover:text-gold-450 transition-colors" />
                      {idFile ? (
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium font-mono">{idFile.name}</span>
                      ) : (
                        <span className="text-[11px] font-light text-zinc-450">Drag &amp; drop or click to select ID file</span>
                      )}
                      <span className="text-[9px] text-zinc-500">Max size limit: 5MB</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!idFile || idUploading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  {idUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading &amp; Submitting...
                    </>
                  ) : (
                    'Submit ID Proof for Review'
                  )}
                </button>
              </form>
            )}

          </div>

          {/* Card 4: Horoscope Document Verification */}
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm flex flex-col gap-4 text-left">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${horoscopeStatus === 'approved' ? 'bg-amber-500/10 text-amber-600' : horoscopeStatus === 'pending' ? 'bg-amber-500/10 text-amber-600 animate-pulse' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Horoscope Verification</span>
                  <span className="text-[10px] text-zinc-400 font-light">Traditional astrological natal chart review</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                horoscopeStatus === 'approved' ? 'bg-amber-500/15 text-amber-600' :
                horoscopeStatus === 'pending' ? 'bg-amber-550/15 text-amber-605 animate-pulse' :
                horoscopeStatus === 'resubmit_requested' ? 'bg-orange-550/15 text-orange-655' :
                horoscopeStatus === 'rejected' ? 'bg-red-500/15 text-red-600' :
                'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-450'
              }`}>
                {horoscopeStatus === 'none' ? 'Not Uploaded' : horoscopeStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Render Horoscope based on status */}
            {horoscopeStatus === 'approved' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-500/10 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-400 font-light">
                  <CheckCircle2 className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="font-semibold">Horoscope Chart Approved</span>
                    <span>Your natal chart document has been verified. Other members will see the "Astro Verified" badge on your profile.</span>
                  </div>
                </div>
              </div>
            )}

            {horoscopeStatus === 'pending' && (
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/5 border border-amber-500/10 rounded-2xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-405 font-light">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-650 shrink-0 mt-0.5" />
                <div className="flex flex-col text-left gap-1">
                  <span className="font-semibold">Natal Chart Under Review</span>
                  <span>Your astrological chart PDF has been submitted and is currently in the queue for manual moderator alignment review. Usually verified within 12 hours.</span>
                </div>
              </div>
            )}

            {(horoscopeStatus === 'rejected' || horoscopeStatus === 'resubmit_requested') && (
              <div className="flex flex-col gap-4">
                <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs font-light ${
                  horoscopeStatus === 'rejected' 
                    ? 'bg-red-50/50 dark:bg-red-950/5 border-red-500/10 text-red-700 dark:text-red-400' 
                    : 'bg-orange-50/50 dark:bg-orange-950/5 border-orange-500/10 text-orange-700 dark:text-orange-400'
                }`}>
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left gap-1">
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {horoscopeStatus === 'rejected' ? 'Horoscope Rejected' : 'Resubmission Requested'}
                    </span>
                    <span>Moderator feedback: <strong className="font-semibold font-serif italic text-zinc-900 dark:text-white">"{horoscopeReason || 'No comment provided'}"</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Controls for Horoscope */}
            {(horoscopeStatus === 'none' || horoscopeStatus === 'rejected' || horoscopeStatus === 'resubmit_requested') && (
              <form onSubmit={handleHoroscopeUpload} className="flex flex-col gap-4.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="verification-horoscope-file" className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-left">Upload Horoscope Document (PDF Only)</label>
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-maroon-500/50 dark:hover:border-gold-500/40 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      id="verification-horoscope-file"
                      onChange={(e) => setHoroscopeFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <div className="flex flex-col items-center gap-1.5 text-zinc-400 select-none">
                      <FileText className="h-6 w-6 text-zinc-400 group-hover:text-maroon-600 dark:group-hover:text-gold-450 transition-colors" />
                      {horoscopeFile ? (
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium font-mono">{horoscopeFile.name}</span>
                      ) : (
                        <span className="text-[11px] font-light text-zinc-455">Select Horoscope PDF file</span>
                      )}
                      <span className="text-[9px] text-zinc-550">Max size limit: 5MB</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!horoscopeFile || horoscopeUploading}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  {horoscopeUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading &amp; Submitting...
                    </>
                  ) : (
                    'Submit Horoscope for Review'
                  )}
                </button>
              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
