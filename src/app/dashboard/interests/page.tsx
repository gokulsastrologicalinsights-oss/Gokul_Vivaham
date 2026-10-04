'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Heart, Compass, Check, X, Phone, Mail, 
  Lock, Unlock, MessageSquare, Copy, CheckCircle2, Loader2 
} from 'lucide-react';
import { useInterests } from '@/hooks/useInterests';
import { matchService } from '@/services/match.service';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { useCheckout } from '@/hooks/useCheckout';

interface ContactInfo {
  email: string;
  phone: string;
  error?: string;
}

export default function Interests() {
  const queryClient = useQueryClient();
  const { data: interests, isLoading, error } = useInterests();
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');

  // Mutation and request tracking states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [unlockedContacts, setUnlockedContacts] = useState<Record<string, ContactInfo>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Unlocked profile IDs state
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const { initiateCheckout, loading: checkoutLoading } = useCheckout();

  const fetchUnlockedProfiles = async () => {
    try {
      const res = await fetch('/api/profile/contact-unlocks');
      const data = await res.json();
      if (res.ok && data.success) {
        const ids = new Set((data.unlocks || []).map((u: any) => u.profile?.profile_id).filter(Boolean) as string[]);
        setUnlockedProfiles(ids);
      }
    } catch (e) {
      console.error('Error fetching unlocked profiles:', e);
    }
  };

  const handleUnlockContact = (profileUuid: string) => {
    if (!profileUuid) return;
    initiateCheckout({
      paymentType: 'contact_unlock',
      targetProfileId: profileUuid,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['matchRequests'] });
        window.location.reload();
      }
    });
  };

  useEffect(() => {
    fetchUnlockedProfiles();
  }, []);

  // Group and partition the query results
  const data = interests || [];
  const pendingRequests = data.filter((item: any) => item.status === 'pending');
  const acceptedConnections = data.filter((item: any) => item.status === 'accepted');

  // Handle Accept or Decline mutations
  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    setActionInProgress(requestId);
    try {
      const { error } = await matchService.respondToRequest(requestId, status);
      if (error) {
        alert(`Failed to update request: ${error.message}`);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['matchRequests'] });
      }
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Securely unlock contact details using API Route
  const handleViewContacts = async (profileId: string) => {
    setUnlockingId(profileId);
    try {
      const response = await fetch('/api/profile/contact-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileId }),
      });

      const resData = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          if (resData.upgrade_required) {
            // Credits exhausted — show the premium upgrade modal
            setShowUpgradeModal(true);
          } else {
            setUnlockedContacts(prev => ({
              ...prev,
              [profileId]: { email: '', phone: '', error: 'premium_required' }
            }));
          }
        } else {
          alert(resData.error || 'Failed to unlock contact details');
        }
      } else {
        setUnlockedContacts(prev => ({
          ...prev,
          [profileId]: { email: resData.email, phone: resData.phone }
        }));
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setUnlockingId(null);
    }
  };

  // Copy-to-clipboard handler
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Loading skeleton screen
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 text-left animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-80 bg-zinc-200 dark:bg-zinc-850 rounded-xl animate-pulse" />
        <div className="flex flex-col gap-4 mt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-sandal-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex flex-col gap-2">
                  <div className="h-4.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error page fallback
  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 rounded-3xl text-left max-w-xl mx-auto flex flex-col items-center gap-4">
        <div className="p-3 bg-red-500/20 text-red-650 rounded-full shrink-0">
          <X className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="font-serif font-bold text-base text-zinc-900 dark:text-zinc-50">Failed to load match requests</p>
          <p className="text-xs mt-1 text-zinc-500 font-light leading-relaxed">{(error as Error).message}</p>
        </div>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['matchRequests'] })}
          className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Match Interests &amp; Connections
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
          Manage invitations you have received or sent, and view details of accepted matches.
        </p>
      </div>

      {/* Tab controls */}
      <div className="flex bg-sandal-100 dark:bg-zinc-800 p-1 rounded-xl max-w-md w-full">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-zinc-700 text-maroon-700 dark:text-gold-400 shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Pending ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'accepted'
              ? 'bg-white dark:bg-zinc-700 text-maroon-700 dark:text-gold-400 shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Accepted ({acceptedConnections.length})
        </button>
      </div>

      {/* Lists display */}
      <div className="flex flex-col gap-4">
        {activeTab === 'pending' ? (
          /* Render Pending Requests */
          pendingRequests.length === 0 ? (
            <div className="p-12 text-center text-zinc-550 dark:text-zinc-400 font-mono text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 flex flex-col items-center gap-3">
              <Heart className="h-8 w-8 text-zinc-300 dark:text-zinc-700 animate-pulse" />
              <span>No pending requests. Explore profiles to initiate connection requests!</span>
              <Link
                href="/dashboard/matches"
                className="mt-2 px-5 py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow hover:opacity-90 transition-all cursor-pointer"
              >
                Explore Matches
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingRequests.map((item: any) => (
                <div
                  key={item.id}
                  className="p-5 bg-white dark:bg-zinc-900 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 text-left">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-sandal-300 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sandal-200 to-rose-50 dark:from-zinc-850 dark:to-maroon-950/20 border-2 border-sandal-300 flex items-center justify-center font-serif text-lg font-bold text-maroon-700 dark:text-gold-400 shadow-inner shrink-0 animate-in fade-in">
                        {item.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-50 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-maroon-500/10 text-maroon-750 dark:text-gold-400 font-bold shrink-0">
                          {item.score || 85}% Match
                        </span>
                      </div>
                      <span className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 font-light leading-normal truncate">
                        ID: {item.profileId} • {item.age} yrs • {item.education} • {item.location} • Star: {item.star} ({item.rasi})
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Received: {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    {item.isIncoming ? (
                      <>
                        <button
                          onClick={() => handleRespond(item.id, 'declined')}
                          disabled={actionInProgress !== null}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer disabled:opacity-50 transition-colors"
                          title="Decline"
                        >
                          {actionInProgress === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRespond(item.id, 'accepted')}
                          disabled={actionInProgress !== null}
                          className="flex items-center gap-1.5 px-4 h-9.5 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow hover:opacity-90 transition-all"
                        >
                          {actionInProgress === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4" /> Accept
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-gold-650 dark:text-gold-400 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider select-none animate-in zoom-in-95 duration-200">
                        Awaiting Response
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Render Accepted Connections */
          acceptedConnections.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 flex flex-col items-center gap-3">
              <Heart className="h-8 w-8 text-zinc-350 dark:text-zinc-700" />
              <span>No accepted connections yet. Accept received interests or wait for others to accept your requests!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {acceptedConnections.map((item: any) => {
                const contacts = unlockedContacts[item.profileId];
                const isUnlocking = unlockingId === item.profileId;

                return (
                  <div
                    key={item.id}
                    className="p-5 bg-white dark:bg-zinc-900 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-left">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-gold-450 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sandal-200 to-rose-50 dark:from-zinc-850 dark:to-maroon-950/20 border-2 border-gold-450 flex items-center justify-center font-serif text-lg font-bold text-maroon-700 dark:text-gold-400 shadow-inner shrink-0">
                            {item.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-50 truncate flex items-center gap-1">
                              {item.name}
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shrink-0 select-none">
                              Connected
                            </span>
                            {unlockedProfiles.has(item.profileId) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold shrink-0 select-none uppercase tracking-wide flex items-center gap-0.5">
                                <Unlock className="h-3 w-3" /> Unlocked
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 font-light leading-normal truncate">
                            ID: {item.profileId} • {item.age} yrs • {item.education} • {item.location} • Star: {item.star} ({item.rasi})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <Link
                          href={`/dashboard/chat?userId=${item.otherUserId}`}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-400 transition-colors"
                          title="Open Chat Messages"
                        >
                          <MessageSquare className="h-4.5 w-4.5" />
                        </Link>

                        {!contacts && (
                          <button
                            onClick={() => handleViewContacts(item.profileId)}
                            disabled={isUnlocking}
                            className="flex items-center gap-1.5 px-4 h-9.5 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow hover:opacity-90 transition-all"
                          >
                            {isUnlocking ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Unlocking...
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 text-gold-300" /> View Contacts
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contact Details box (if unlocked or error) */}
                    {contacts && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        {contacts.error === 'premium_required' ? (
                          /* Premium Upgrade Card */
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-gold-50/70 to-sandal-100/50 dark:from-zinc-900/60 dark:to-zinc-850/60 border border-gold-400/30 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left font-sans">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-gold-400/20 text-gold-700 dark:text-gold-450 rounded-full shrink-0">
                                <Lock className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">🔒 Premium Feature</span>
                                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-0.5 leading-relaxed font-light">
                                  Upgrade to a Premium membership plan or unlock just this contact permanently.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 shrink-0 items-center">
                              <Link
                                href="/dashboard/subscription"
                                className="px-4 py-2 rounded-xl bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all shadow shrink-0 cursor-pointer text-center flex items-center justify-center font-sans"
                              >
                                Upgrade Plan
                              </Link>
                              <div className="flex flex-col gap-1 items-center shrink-0">
                                <button
                                  onClick={() => handleUnlockContact(item.profileUuid)}
                                  disabled={checkoutLoading}
                                  className="px-4 py-2 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider transition-all shadow shrink-0 cursor-pointer text-center flex items-center justify-center font-sans"
                                >
                                  {checkoutLoading ? 'Processing...' : 'Unlock Contact (₹199)'}
                                </button>
                                <span className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-none">
                                  Service price: ₹199
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Secure contacts box */
                          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-200">
                            {/* Email */}
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900">
                              <div className="flex items-center gap-2.5 text-left min-w-0">
                                <Mail className="h-4.5 w-4.5 text-emerald-650 dark:text-emerald-400 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Email Address</span>
                                  <span className="text-xs font-semibold text-zinc-855 dark:text-zinc-150 truncate">{contacts.email}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleCopyText(contacts.email, `${item.profileId}-email`)}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-550 dark:text-zinc-400 transition-colors cursor-pointer"
                                  title="Copy Email"
                                >
                                  {copiedId === `${item.profileId}-email` ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                <a
                                  href={`mailto:${contacts.email}`}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-550 dark:text-zinc-400 transition-colors flex items-center justify-center"
                                  title="Send Email"
                                >
                                  <Unlock className="h-4 w-4 text-emerald-600" />
                                </a>
                              </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-900">
                              <div className="flex items-center gap-2.5 text-left min-w-0">
                                <Phone className="h-4.5 w-4.5 text-emerald-650 dark:text-emerald-400 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Phone Number</span>
                                  <span className="text-xs font-semibold text-zinc-855 dark:text-zinc-150 truncate">{contacts.phone}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleCopyText(contacts.phone, `${item.profileId}-phone`)}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-550 dark:text-zinc-400 transition-colors cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedId === `${item.profileId}-phone` ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                <a
                                  href={`https://wa.me/91${contacts.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(item.name)},%20we%20matched%20on%20Gokul%20Vivaham.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-550 dark:text-zinc-400 transition-colors flex items-center justify-center"
                                  title="WhatsApp Chat"
                                >
                                  <Phone className="h-4 w-4 text-emerald-600" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Explore suggestions link */}
      <Link
        href="/dashboard/matches"
        className="self-center mt-4 px-6 py-2.5 rounded-full border border-maroon-500/20 text-maroon-700 dark:text-gold-450 text-xs font-bold uppercase tracking-wider hover:bg-maroon-500/5 transition-all shadow-sm cursor-pointer"
      >
        Explore Matches list
      </Link>

      {showUpgradeModal && (
        <UpgradeModal
          feature="contact"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
