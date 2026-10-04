'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Star, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckout } from '@/hooks/useCheckout';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';
import Toast from '@/components/ui/toast/Toast';

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
    ],
    missing: [
      'Filter According To Your Preferences',
      'Verified Badge',
      'Send and Receive Interests & Messages',
      'View Contact Phone Numbers',
      'Detailed Horoscope Reports',
      'Live Astrology Consultation'
    ],
    popular: false
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
    ],
    missing: [
      'Up To 5 Detailed Horoscope Matching Reports',
      'Free Live/Call Horoscope Consultation'
    ],
    popular: false
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
    ],
    missing: [
      'Up To 10 Detailed Horoscope Matching Reports',
      '5 Free Live/Call Horoscope Consultations'
    ],
    popular: true
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
    ],
    missing: [],
    popular: false
  }
];

export default function Pricing() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { initiateCheckout, loading, error, setError } = useCheckout();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  const handlePurchase = async (planKey: string, planId: string) => {
    if (planKey === 'FREE') {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/register');
      }
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?returnTo=/pricing&message=${encodeURIComponent('Please login to purchase premium subscription packages.')}`);
      return;
    }

    setPurchasingPlanId(planId);
    setError(null);

    await initiateCheckout({
      paymentType: 'subscription',
      planId: planId,
      onSuccess: () => {
        setPurchasingPlanId(null);
        setSuccessMsg('Payment capture verified! Your subscription is active now.');
        setTimeout(() => {
          router.push('/dashboard/subscription?success=true');
        }, 1500);
      },
      onCancel: () => {
        setPurchasingPlanId(null);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Toast Notifications */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 min-w-[300px]">
          <Toast message={error} type="error" onClose={() => setError(null)} />
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 min-w-[300px]">
          <Toast message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Membership Packages
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Choose a Plan and Connect with Compatibility
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Plans Card Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mt-6">
        {planMetadata.map((meta) => {
          const planDef = SUBSCRIPTION_PLANS[meta.key];
          if (!planDef) return null;

          const isPurchasingThis = purchasingPlanId === planDef.id && loading;

          return (
            <div
              key={meta.key}
              className={`bg-white dark:bg-zinc-900 rounded-3xl p-6 flex flex-col justify-between relative shadow-xl hover:scale-[1.01] transition-transform duration-300 ${
                meta.popular 
                  ? 'border-2 border-gold-500 ring-4 ring-gold-500/10' 
                  : 'border border-sandal-200 dark:border-zinc-800'
              }`}
            >
              {meta.popular && (
                <span className="absolute top-0 right-8 transform -translate-y-1/2 px-3 py-1 bg-gold-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-serif font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-1.5">
                  {meta.name}
                  {meta.popular && <Star className="h-4 w-4 text-gold-500 fill-gold-500" />}
                </h3>
                
                <div className="mt-4 flex flex-col items-start gap-1">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-serif font-extrabold text-zinc-900 dark:text-white">
                      ₹{planDef.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-zinc-450 dark:text-zinc-555 pl-1">
                      / {meta.key === 'FREE' ? 'lifetime' : meta.key === 'SILVER' ? '30 days' : meta.key === 'GOLD' ? '3 months' : '6 months'}
                    </span>
                  </div>
                  {planDef.price > 0 && (
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                        GST not charged
                      </span>
                      <span className="text-[10px] text-zinc-550 dark:text-zinc-400 font-light mt-0.5">
                        Service price shown above · GST not charged
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-555 dark:text-zinc-400 mt-2 leading-relaxed font-light">{meta.desc}</p>
                
                <div className="h-px bg-zinc-100 dark:bg-zinc-850 my-6" />

                {/* Features List */}
                <ul className="space-y-3">
                  {meta.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-650 dark:text-zinc-450 leading-normal font-light">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {meta.missing.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-400 dark:text-zinc-600 leading-normal font-light line-through">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  onClick={() => handlePurchase(meta.key, planDef.id)}
                  disabled={loading}
                  className={`block w-full py-2.5 rounded-full text-center text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    meta.popular
                      ? 'luxury-gradient text-white hover:opacity-95'
                      : 'border border-maroon-500/20 text-maroon-700 dark:text-gold-450 hover:bg-maroon-500/5 bg-transparent'
                  }`}
                >
                  {isPurchasingThis ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    meta.key === 'FREE' ? 'Register Free' : `Get ${meta.name}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Badges */}
      <div className="mt-8 p-6 rounded-3xl bg-sandal-50/30 dark:bg-zinc-900/50 border border-sandal-200/40 dark:border-zinc-800/80 text-center flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">100% Secure Checkout</span>
            <span className="text-xs text-zinc-450 dark:text-zinc-550">Transactions encrypted using 256-bit SSL safeguards</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-400 tracking-wider">
          <span>Razorpay SECURE</span>
          <span>•</span>
          <span>UPI / GPay</span>
          <span>•</span>
          <span>All major Debit / Credit cards</span>
        </div>
      </div>

    </div>
  );
}
