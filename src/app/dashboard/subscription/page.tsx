'use client';
import { contactConfig } from '@/config/contact.config';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Star, ShieldCheck, Check, HelpCircle, X, 
  Printer, Landmark, Settings, Clock, ArrowRight, Phone
} from 'lucide-react';
import { subscriptionService } from '@/services/subscription.service';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';
import Toast from '@/components/ui/toast/Toast';

type UnlockedContact = {
  id: string;
  phone?: string;
  email?: string;
  unlocked_at: string;
  profile?: { first_name: string; last_name?: string; profile_id: string };
};

const planMetadata = [
  {
    key: 'FREE',
    name: 'Startup Plan',
    desc: 'Get started with profile creation and receive matches.',
    features: [
      'Create Profile',
      'Browse Profiles',
      'Receive Interests and Messages',
      'Basic Horoscope Match Percentage',
      'Limited Daily Profile Views'
    ]
  },
  {
    key: 'SILVER',
    name: 'Silver Plan',
    desc: 'Connect directly and view verified contacts.',
    features: [
      'Filter According To Your Preferences',
      'Browse Profiles',
      'Verified Badge',
      'Send and Receive Interests & Messages',
      'View Up To 15 Contact Numbers',
      'Unlimited Horoscope Match Percentage',
      'One Detailed Horoscope Matching Report'
    ]
  },
  {
    key: 'GOLD',
    name: 'Gold Plan',
    desc: 'Best value for astro matching and consultations.',
    features: [
      'Filter According To Your Preferences',
      'Browse Profiles',
      'Verified Badge',
      'Send and Receive Interests & Messages',
      'View Up To 30 Contact Numbers',
      'Unlimited Horoscope Match Percentage',
      'Up To 5 Detailed Horoscope Matching Reports',
      '1 Free Live/Call Horoscope Consultation'
    ]
  },
  {
    key: 'DIAMOND',
    name: 'Diamond Plan',
    desc: 'Full astrological assistance and maximum contacts.',
    features: [
      'Filter According To Your Preferences',
      'Browse Profiles',
      'Verified Badge',
      'Send and Receive Interests & Messages',
      'View Up To 60 Contact Numbers',
      'Unlimited Horoscope Match Percentage',
      'Up To 10 Detailed Horoscope Matching Reports',
      '5 Free Live/Call Horoscope Consultations'
    ]
  }
];

export default function Subscription() {
  const { initiateCheckout, loading: checkoutLoading, error: checkoutError, setError: setCheckoutError } = useCheckout();

  const [activeSub, setActiveSub] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [unlockedContacts, setUnlockedContacts] = useState<UnlockedContact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Billing Profile States
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPin, setBillingPin] = useState('');
  const [billingGstin, setBillingGstin] = useState('');

  // Selected Transaction for Invoice Modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const { user: billingUser } = useAuth();
  const [billingError, setBillingError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setBillingError('');
    try {
      const [subRes, txRes] = await Promise.all([
        subscriptionService.getActiveSubscription(),
        subscriptionService.getTransactions()
      ]);

      if (subRes.error || txRes.error) {
        setBillingError('Unable to load billing records. Please retry.');
      }

      setActiveSub(subRes.data || null);
      setTransactions(txRes.data || []);
      try {
        const response = await fetch('/api/profile/contact-unlocks');
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error('Unable to load unlocked contacts. Please try again.');
        }
        setUnlockedContacts(result.unlocks || []);
        setContactsError(null);
      } catch {
        setUnlockedContacts([]);
        setContactsError('Unable to load unlocked contacts. Please try again.');
      }
    } catch (err) {
      setBillingError('Unable to load billing records. Please retry.');
      console.error('Failed to load billing dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCheckoutError(null);
    try {
      const res = await subscriptionService.cancelSubscription();
      if (res.success) {
        setSuccessMsg('Subscription cancelled successfully. Your premium package benefits have been deactivated.');
        loadData();
      } else {
        setCheckoutError(res.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'An error occurred during subscription cancellation');
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  useEffect(() => {
    loadData();

    // Load billing profile from localStorage
    setBillingName(''); setBillingAddress(''); setBillingCity(''); setBillingState(''); setBillingPin(''); setBillingGstin('');
    const saved = billingUser ? localStorage.getItem(`gokul_billing_profile:${billingUser.id}`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBillingName(parsed.name || '');
        setBillingAddress(parsed.address || '');
        setBillingCity(parsed.city || '');
        setBillingState(parsed.state || '');
        setBillingPin(parsed.pin || '');
        setBillingGstin(parsed.gstin || '');
      } catch (e) {}
    }
  }, [loadData, billingUser?.id]);

  const handleSaveBillingProfile = () => {
    const profile = {
      name: billingName,
      address: billingAddress,
      city: billingCity,
      state: billingState,
      pin: billingPin,
      gstin: billingGstin,
    };
    if (!billingUser) return;
    localStorage.setItem(`gokul_billing_profile:${billingUser.id}`, JSON.stringify(profile));
    setSuccessMsg('Billing profile updated successfully!');
  };

  // Determine current plan level and filter upgrade options
  const planOrder = ['FREE', 'SILVER', 'GOLD', 'DIAMOND'];
  const getActivePlanKey = () => {
    if (!activeSub || !activeSub.plan) return 'FREE';
    const name = activeSub.plan.name.toUpperCase();
    if (name.includes('DIAMOND') || name.includes('PLATINUM')) return 'DIAMOND';
    if (name.includes('GOLD')) return 'GOLD';
    if (name.includes('SILVER')) return 'SILVER';
    return 'FREE';
  };

  const currentPlanKey = getActivePlanKey();
  const currentIndex = planOrder.indexOf(currentPlanKey);

  const getDaysRemaining = () => {
    if (!activeSub || !activeSub.end_date) return 0;
    const end = new Date(activeSub.end_date).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getDaysTotal = () => {
    if (!activeSub || !activeSub.plan) return 30;
    return activeSub.plan.duration_days || 30;
  };

  const daysRemaining = getDaysRemaining();
  const daysTotal = getDaysTotal();
  const daysUsed = Math.max(0, daysTotal - daysRemaining);
  const usagePercentage = activeSub ? Math.min(100, Math.round((daysUsed / daysTotal) * 100)) : 0;

  const handleUpgrade = async (planKey: string, planId: string) => {
    setPurchasingPlanId(planId);
    setCheckoutError(null);

    await initiateCheckout({
      paymentType: 'subscription',
      planId: planId,
      onSuccess: () => {
        setPurchasingPlanId(null);
        setSuccessMsg('Upgrade successful! Your new package benefits are now active.');
        loadData();
      },
      onCancel: () => {
        setPurchasingPlanId(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-550 dark:text-zinc-400 font-light">Loading subscription status...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left relative">
      
      {/* Print Overrides CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area, #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white !important;
            color: black !important;
          }
          /* Prevent dark mode print errors */
          .dark #invoice-print-area {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Toast Notifications */}
      {checkoutError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] min-w-[300px]">
          <Toast message={checkoutError} type="error" onClose={() => setCheckoutError(null)} />
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] min-w-[300px]">
          <Toast message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Billing &amp; Subscription Dashboard
        </h1>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light">
          Review active plan benefits, billing details, custom invoices, and upgrade/downgrade membership tiers.
        </p>
      </div>

      {/* Current Subscription Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 flex flex-col gap-3 text-left">
          <span className="text-[10px] font-bold text-gold-650 dark:text-gold-450 uppercase tracking-widest bg-gold-500/10 px-2.5 py-1 rounded-full max-w-max">
            {activeSub ? 'Active Premium' : 'Free Account'}
          </span>
          <h2 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            {activeSub?.plan?.name || 'Free Basic Plan'}{' '}
            {activeSub && <Star className="h-5 w-5 text-gold-500 fill-gold-500" />}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-xs font-light text-zinc-655 dark:text-zinc-400 leading-relaxed">
            {activeSub ? (
              <>
                <div>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Start Date:</strong>{' '}
                  {new Date(activeSub.start_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Renewal Date:</strong>{' '}
                  {new Date(activeSub.end_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Payment ID:</strong>{' '}
                  <span className="font-mono text-[10px]">{activeSub.razorpay_payment_id || 'N/A'}</span>
                </div>
                <div>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Days Remaining:</strong> {daysRemaining} days
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                Upgrade to a premium plan to view phone contacts, access advanced filters, and chat directly with compatible partners.
              </div>
            )}
          </div>

          {activeSub && (
            <div className="flex flex-col gap-1.5 mt-3 max-w-md">
              <div className="flex justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-450">
                <span>Active Period: {daysUsed} / {daysTotal} Days</span>
                <span>{usagePercentage}% Elapsed</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full luxury-gradient rounded-full transition-all duration-500"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          )}

          {activeSub && (
            <div className="mt-4 border-t border-zinc-150/60 dark:border-zinc-800/80 pt-4 flex flex-col gap-3">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 border border-red-500/20 hover:bg-red-500/5 text-red-650 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all self-start cursor-pointer focus:outline-none"
                >
                  Cancel Subscription
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-red-500/5 border border-red-950/10 dark:border-red-950/20 p-4 rounded-2xl max-w-lg animate-fade-in text-left">
                  <div className="flex-1 text-[11px] font-light leading-relaxed text-red-800 dark:text-red-300">
                    Are you sure you want to cancel your premium subscription? This will immediately terminate your benefits and reset your profile to the Free tier.
                  </div>
                  <div className="flex gap-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelLoading}
                      className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-all cursor-pointer disabled:opacity-50 focus:outline-none"
                    >
                      No, Keep
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold uppercase rounded-lg shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 focus:outline-none"
                    >
                      {cancelLoading ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Yes, Cancel'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Support Card */}
        <div className="p-4 rounded-2xl bg-sandal-50/50 dark:bg-zinc-950/60 border border-sandal-200/40 dark:border-zinc-850 flex flex-col gap-2 max-w-xs shrink-0 self-start md:self-center text-left">
          <span className="text-xs font-bold text-maroon-600 dark:text-gold-450 uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="h-4 w-4" /> Billing Question?
          </span>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-normal font-light">
            Need details about corporate invoices or custom plan options? Reach our support team.
          </p>
          <a href="mailto:support@gokulvivaham.com" className="text-xs font-bold text-maroon-650 dark:text-gold-450 hover:underline">
            Contact Support &rarr;
          </a>
        </div>
      </div>

      {/* PLAN PRICING COMPARISON MATRIX */}
      <div className="flex flex-col gap-4 mt-6">
        <h2 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-maroon-600 dark:text-gold-450" />
          Choose Your Membership Plan
        </h2>
        <p className="text-xs text-zinc-555 dark:text-zinc-400 font-light leading-relaxed">
          Unlock verified matches, astrology compatibility scores, and dedicated support. Compare our subscription packages and select the tier that fits your journey.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-2 items-stretch">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, planDef]) => {
            const isCurrent = currentPlanKey === key;
            const isPurchasingThis = purchasingPlanId === planDef.id && checkoutLoading;
            
            // Check order to decide upgrade or downgrade
            const planIdx = planOrder.indexOf(key);
            const isHigher = planIdx > currentIndex;
            const isLower = planIdx < currentIndex;
            
            const metadata = planMetadata.find(m => m.key === key) || {
              name: planDef.name,
              desc: '',
              features: []
            };

            return (
              <div
                key={key}
                className={`p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-md border flex flex-col justify-between transition-all relative overflow-hidden ${
                  isCurrent 
                    ? "border-maroon-600 dark:border-gold-500/80 ring-1 ring-maroon-600/30" 
                    : key === 'DIAMOND'
                    ? "border-gold-500/40 dark:border-gold-800/40 bg-gradient-to-b from-amber-500/5 to-transparent"
                    : "border-sandal-200 dark:border-zinc-800/80"
                }`}
              >
                {/* Popular / Active Badges */}
                {key === 'GOLD' && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-[8px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-maroon-600 dark:bg-gold-600 text-[8px] font-bold text-white uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                    Active
                  </div>
                )}

                <div className="flex flex-col text-left gap-1">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{key} Package</span>
                  <h3 className="text-base font-serif font-bold text-zinc-900 dark:text-white mt-1">
                    {metadata.name || planDef.name}
                  </h3>
                  
                  <div className="mt-3 flex flex-col items-start gap-1">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-serif font-extrabold text-zinc-900 dark:text-white">
                        ₹{planDef.price.toLocaleString('en-IN')}
                      </span>
                      {planDef.price > 0 && <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-light">/ {planDef.durationDays} days</span>}
                    </div>
                    {planDef.price > 0 && (
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                          (Inclusive of 18% GST)
                        </span>
                        <span className="text-[9px] text-zinc-550 dark:text-zinc-400 font-light mt-0.5">
                          Base Price: ₹{key === 'SILVER' ? '1,270' : key === 'GOLD' ? '2,542' : '5,084'} | GST: ₹{key === 'SILVER' ? '229' : key === 'GOLD' ? '457' : '915'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-450 mt-2 font-light min-h-[40px] leading-relaxed">
                    {metadata.desc}
                  </p>

                  <div className="h-px bg-zinc-150/60 dark:bg-zinc-800/60 my-4" />

                  {/* Features List */}
                  <ul className="space-y-2 mb-6">
                    {metadata.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-655 dark:text-zinc-400 font-light leading-normal">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : isLower ? (
                    <button
                      onClick={() => alert('Downgrade will become active after your current plan expires.')}
                      className="w-full py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none"
                    >
                      Downgrade Tier
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key, planDef.id)}
                      disabled={checkoutLoading}
                      className="w-full py-2 rounded-xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow transition-all cursor-pointer disabled:opacity-50 focus:outline-none"
                    >
                      {isPurchasingThis ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        'Upgrade'
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* BILLING PROFILE & GSTIN EDITOR & TRANSACTION HISTORY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4 items-start">
        
        {/* Billing Profile */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4 text-left">
          <h2 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Settings className="h-5 w-5 text-maroon-600 dark:text-gold-450" />
            Billing Profile Setup
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-405 font-light leading-normal">
            Configure your official billing name, address, and GSTIN. This information is automatically populated on your tax invoices and receipts.
          </p>

          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">Billing Name</label>
              <input
                type="text"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="e.g. Individual or Corporate Name"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">Street Address</label>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="e.g. Flat, Street Name, Locality"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">City</label>
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">State</label>
                <input
                  type="text"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">PIN Code</label>
                <input
                  type="text"
                  value={billingPin}
                  onChange={(e) => setBillingPin(e.target.value)}
                  placeholder="600020"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider text-[9px]">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={billingGstin}
                  onChange={(e) => setBillingGstin(e.target.value)}
                  placeholder="e.g. 33AAAAA1111A1Z0"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 font-mono uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleSaveBillingProfile}
              className="mt-2 w-full py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer focus:outline-none"
            >
              Save Billing Profile
            </button>
          </div>
        </div>

        {/* Billing History / Transactions List */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4 text-left self-stretch">
          <h2 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Clock className="h-5 w-5 text-maroon-600 dark:text-gold-450" />
            Billing &amp; Transaction History
          </h2>
          
          {transactions.length > 0 ? (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs font-mono text-left min-w-[600px]">
                <thead>
                  <tr className="text-zinc-550 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                    <th className="py-2.5 uppercase font-bold tracking-wider">Invoice</th>
                    <th className="py-2.5 uppercase font-bold tracking-wider">Date</th>
                    <th className="py-2.5 uppercase font-bold tracking-wider font-sans">Description</th>
                    <th className="py-2.5 uppercase font-bold tracking-wider">Total</th>
                    <th className="py-2.5 uppercase font-bold tracking-wider">Status</th>
                    <th className="py-2.5 uppercase font-bold tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-3 font-semibold text-maroon-700 dark:text-gold-400">{tx.invoice_number}</td>
                      <td className="py-3 font-sans">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 text-zinc-850 dark:text-zinc-100 font-sans">{tx.description}</td>
                      <td className="py-3 text-zinc-850 dark:text-zinc-100 font-bold">₹{Number(tx.total_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-900/10'
                            : 'bg-red-500/10 text-red-650 border-red-900/10'
                        }`}>
                          {tx.status?.toUpperCase() || 'COMPLETED'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="px-3 py-1 rounded-lg border border-maroon-500/20 hover:bg-maroon-500/5 text-maroon-700 dark:text-gold-400 font-sans font-bold text-[10px] uppercase tracking-wider cursor-pointer focus:outline-none"
                        >
                          View Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 font-light italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              {billingError || (loading ? 'Loading billing records…' : 'No transactions recorded for this account.')}
              {billingError && <button type="button" onClick={loadData} className="mt-3 underline">Retry</button>}
            </div>
          )}
        </div>

        {/* Unlocked Contacts List */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4 text-left self-stretch">
          <h2 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Phone className="h-5 w-5 text-emerald-600 shrink-0 animate-pulse" />
            Purchased Contact Unlocks
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light -mt-2">
            You have permanent access to the contact details of the following compatible members.
          </p>

          {contactsError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{contactsError}</p>
          ) : unlockedContacts.length > 0 ? (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left min-w-[600px] border-collapse">
                <thead>
                  <tr className="text-zinc-550 border-b border-zinc-150 dark:border-zinc-850 pb-2 uppercase font-bold tracking-wider">
                    <th className="py-2.5">Candidate</th>
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Contact Number</th>
                    <th className="py-2.5">Email</th>
                    <th className="py-2.5">Unlocked At</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unlockedContacts.map((uc) => (
                    <tr key={uc.id} className="text-zinc-655 dark:text-zinc-350 hover:bg-zinc-55 dark:hover:bg-zinc-950/20 border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-3 font-semibold text-zinc-900 dark:text-white">
                        {uc.profile?.first_name} {uc.profile?.last_name || ''}
                      </td>
                      <td className="py-3 font-mono">{uc.profile?.profile_id || 'N/A'}</td>
                      <td className="py-3 font-mono text-emerald-600 dark:text-emerald-450 font-semibold">
                        {uc.phone}
                      </td>
                      <td className="py-3 font-mono">{uc.email}</td>
                      <td className="py-3 font-sans">
                        {new Date(uc.unlocked_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/matches?id=${uc.profile?.profile_id}`}
                          className="px-3 py-1 rounded-lg border border-maroon-500/20 hover:bg-maroon-500/5 text-maroon-700 dark:text-gold-450 font-sans font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 font-light italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              No contacts unlocked yet.
            </div>
          )}
        </div>
      </div>

      {/* TAX INVOICE POPUP MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:static print:h-auto">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-sandal-200 dark:border-zinc-800 overflow-hidden flex flex-col relative max-h-[95vh] print:border-none print:shadow-none print:max-h-full print:static">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center print:hidden">
              <h3 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-50">Payment Receipt</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div id="invoice-print-area" className="p-8 overflow-y-auto text-left flex flex-col gap-6 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 print:overflow-visible print:p-0">
              
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                  <h1 className="text-xl font-serif font-bold text-maroon-700 dark:text-gold-450 uppercase tracking-widest">Gokul Vivaham</h1>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-1 font-light">Matrimonial Insights &amp; Matchmaking Platform</p>
                  <p className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5">Payment receipt</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-900/10">{selectedTx.status === 'completed' ? 'PAID' : String(selectedTx.status || 'pending').toUpperCase()}</span>
                  <p className="text-xs font-mono font-semibold mt-2 text-zinc-850 dark:text-zinc-100">Invoice: {selectedTx.invoice_number}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-light">Date: {new Date(selectedTx.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                  <h4 className="font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider mb-2 text-[10px]">Seller Details:</h4>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200">{selectedTx.billing_snapshot?.seller?.name || 'Seller details not recorded'}</p>
                  <p className="font-light text-zinc-650 dark:text-zinc-400">{selectedTx.billing_snapshot?.seller?.address || ''}</p>
                  <p className="font-light text-zinc-655 dark:text-zinc-400">{selectedTx.billing_snapshot?.seller?.email || ''}</p>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider mb-2 text-[10px]">Billed To (Buyer):</h4>
                  <p className="font-semibold text-zinc-850 dark:text-zinc-200">{selectedTx.billing_snapshot?.buyer?.name || 'Buyer name not recorded'}</p>
                  {selectedTx.billing_snapshot?.buyer?.address ? (
                    <>
                      <p className="font-light text-zinc-655 dark:text-zinc-400">{selectedTx.billing_snapshot.buyer.address}</p>
                      <p className="font-light text-zinc-655 dark:text-zinc-400">{selectedTx.billing_snapshot.buyer.city}, {selectedTx.billing_snapshot.buyer.state} - {selectedTx.billing_snapshot.buyer.pin}</p>
                    </>
                  ) : (
                    <p className="font-light text-zinc-450 dark:text-zinc-550 italic">Address details not set in billing profile.</p>
                  )}
                  {selectedTx.billing_snapshot?.buyer?.gstin && <p className="font-mono text-[10px] mt-1 text-zinc-850 dark:text-zinc-150">GSTIN: {selectedTx.billing_snapshot.buyer.gstin}</p>}
                </div>
              </div>

              {/* Table */}
              <div className="flex flex-col gap-2">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-zinc-550 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <th className="py-2 font-bold uppercase text-[9px] tracking-wider">Description</th>
                      <th className="py-2 text-right font-bold uppercase text-[9px] tracking-wider">Base Rate</th>
                      <th className="py-2 text-right font-bold uppercase text-[9px] tracking-wider">Qty</th>
                      <th className="py-2 text-right font-bold uppercase text-[9px] tracking-wider">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-3 font-semibold text-zinc-850 dark:text-zinc-100">
                        {selectedTx.description}
                        <span className="block text-[9px] font-light text-zinc-450 font-sans mt-0.5">Payment ID: {selectedTx.payment?.razorpay_payment_id || selectedTx.payment_id || 'N/A'}</span>
                      </td>
                      <td className="py-3 text-right font-mono">₹{Number(selectedTx.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right">1</td>
                      <td className="py-3 text-right font-mono">₹{Number(selectedTx.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Taxation breakdown & Total */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mt-4">
                <div className="text-[10px] font-light text-zinc-500 leading-normal max-w-sm">
                  This receipt shows the recorded payment breakdown. Official tax invoice details are pending business verification.
                </div>
                <div className="w-full sm:w-64 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-zinc-550">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">₹{Number(selectedTx.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-550 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                    <span>Recorded tax:</span>
                    <span className="font-mono">₹{Number(selectedTx.tax || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-50 pt-1">
                    <span>Total Invoice:</span>
                    <span className="font-mono text-maroon-700 dark:text-gold-450">₹{Number(selectedTx.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Signature / Declarations */}
              <div className="flex justify-between items-end mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 font-light leading-relaxed">
                <div>
                  <p>Computer generated invoice.</p>
                  <p>No signature required.</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-300">Gokul Vivaham Billing Desk</p>
                  <p className="text-[9px] mt-0.5">Thank you for trust in our service</p>
                </div>
              </div>

            </div>

            {/* Modal Footer Triggers */}
            <div className="p-6 bg-sandal-50/40 dark:bg-zinc-950/60 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 text-xs font-semibold uppercase rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 luxury-gradient text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow cursor-pointer flex items-center gap-1.5 focus:outline-none"
              >
                <Printer className="h-4 w-4" /> Print Invoice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
