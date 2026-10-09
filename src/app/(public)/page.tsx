'use client';

import Link from 'next/link';
import { CheckCircle2, Star, MessageCircle } from 'lucide-react';
import HeroSection from '@/components/home/HeroSection';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import FeaturedProfilesCarousel from '@/components/home/FeaturedProfilesCarousel';
import AstroMatcher from '@/components/home/AstroMatcher';
import SuccessStories from '@/components/home/SuccessStories';
import FaqSection from '@/components/home/FaqSection';
import SampleProfiles from '@/components/SampleProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getAuthenticatedLandingPath } from '@/lib/auth/navigation';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, role } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(getAuthenticatedLandingPath({ role }));
    }
  }, [isAuthenticated, loading, role, router]);

  if (loading || isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col w-full relative">
      
      {/* HERO SECTION */}
      <HeroSection />

      {/* CORE VALUE PROPOSITIONS */}
      <WhyChooseUs />

      {/* FEATURED SPOTLIGHT CAROUSEL */}
      <FeaturedProfilesCarousel />
      <SampleProfiles preview />

      {/* INTERACTIVE COMPATIBILITY CHECKER */}
      <AstroMatcher />

      {/* MEMBERSHIP PLANS */}
      <section className="w-full py-16 bg-white dark:bg-zinc-950 border-t border-sandal-200/40 dark:border-zinc-800/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-12">
          
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
              Premium Membership Plans
            </h2>
            <div className="w-20 h-1 luxury-gradient rounded-full" />
            <p className="text-base text-zinc-650 dark:text-zinc-400 max-w-xl font-light">
              Elevate your profile, unlock contact info, and initiate direct chats to fast-track your partner search.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            
            {/* Startup Plan */}
            <div className="flex flex-col p-6 rounded-3xl bg-sandal-50/30 dark:bg-zinc-900/30 border border-sandal-200/40 dark:border-zinc-800/50 text-left hover:scale-[1.01] transition-transform duration-300">
              <h3 className="text-lg font-serif font-bold text-zinc-850 dark:text-zinc-200">Startup Plan</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-serif font-extrabold text-zinc-900 dark:text-zinc-100">₹0</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-450 pl-1">/ lifetime</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-light">Get started with basic profile creation and matchmaking.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-zinc-650 dark:text-zinc-400 font-light flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Create detailed profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Browse match profiles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Receive interests & messages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Basic horoscope match %
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Limited daily profile views
                </li>
              </ul>
              
              <Link 
                href="/register" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('gokul_matrimony_register_draft');
                  }
                }}
                className="mt-8 w-full py-2.5 rounded-full border border-maroon-500/20 text-center text-xs font-bold uppercase tracking-wider text-maroon-700 dark:text-gold-450 hover:bg-maroon-500/5 transition-all bg-transparent"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Silver Plan */}
            <div className="flex flex-col p-6 rounded-3xl bg-sandal-50/30 dark:bg-zinc-900/30 border border-sandal-200/40 dark:border-zinc-800/50 text-left hover:scale-[1.01] transition-transform duration-300">
              <h3 className="text-lg font-serif font-bold text-zinc-855 dark:text-zinc-200">Silver Plan</h3>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-baseline">
                  <span className="text-3xl font-serif font-extrabold text-zinc-900 dark:text-zinc-100">₹1,499</span>
                  <span className="text-xs text-zinc-500 pl-1">/ 30 days</span>
                </div>
                
                
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-light">Filter matches by taste and access contact phone numbers.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-zinc-650 dark:text-zinc-400 font-light flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Filter According To Your Preferences
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Browse Profiles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Verified Badge
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Send and Receive Interests & Messages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> View Up To 15 Contact Numbers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Unlimited Horoscope Match Percentage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> One Detailed Horoscope Matching Report
                </li>
              </ul>
              
              <Link 
                href="/pricing" 
                className="mt-8 w-full py-2.5 rounded-full border border-maroon-500/20 text-center text-xs font-bold uppercase tracking-wider text-maroon-700 dark:text-gold-450 hover:bg-maroon-500/5 transition-all bg-transparent"
              >
                Get Silver
              </Link>
            </div>

            {/* Gold Plan */}
            <div className="flex flex-col p-6 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-gold-500 ring-4 ring-gold-500/10 shadow-xl relative text-left hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-gold-500 text-[8px] font-bold text-white uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-lg font-serif font-bold text-zinc-905 dark:text-zinc-100 flex items-center gap-1.5">
                Gold Plan <Star className="h-4 w-4 text-gold-500 fill-gold-500" />
              </h3>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-baseline">
                  <span className="text-3xl font-serif font-extrabold text-zinc-900 dark:text-zinc-100">₹2,999</span>
                  <span className="text-xs text-zinc-500 pl-1">/ 3 months</span>
                </div>
                
                
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-light">Best value for matching and astrology consultation support.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-zinc-650 dark:text-zinc-400 font-light flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Filter According To Your Preferences
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Browse Profiles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Verified Badge
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Send and Receive Interests & Messages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> View Up To 30 Contact Numbers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Unlimited Horoscope Match Percentage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> Up To 5 Detailed Horoscope Matching Reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-500 shrink-0" /> 1 Free Live/Call Horoscope Consultation
                </li>
              </ul>
              
              <Link 
                href="/pricing" 
                className="mt-8 w-full py-2.5 rounded-full luxury-gradient text-white text-center text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-md transition-all"
              >
                Go Gold Plan
              </Link>
            </div>

            {/* Diamond Plan */}
            <div className="flex flex-col p-6 rounded-3xl bg-sandal-50/30 dark:bg-zinc-900/30 border border-sandal-200/40 dark:border-zinc-800/50 text-left hover:scale-[1.01] transition-transform duration-300">
              <h3 className="text-lg font-serif font-bold text-zinc-850 dark:text-zinc-200">Diamond Plan</h3>
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-baseline">
                  <span className="text-3xl font-serif font-extrabold text-zinc-900 dark:text-zinc-100">₹5,999</span>
                  <span className="text-xs text-zinc-500 pl-1">/ 6 months</span>
                </div>
                
                
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-light">Complete astrological review and maximum contacts.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-zinc-650 dark:text-zinc-400 font-light flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Filter According To Your Preferences
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Browse Profiles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Verified Badge
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Send and Receive Interests & Messages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> View Up To 60 Contact Numbers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Unlimited Horoscope Match Percentage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> Up To 10 Detailed Horoscope Matching Reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-maroon-500 shrink-0" /> 5 Free Live/Call Horoscope Consultations
                </li>
              </ul>
              
              <Link 
                href="/pricing" 
                className="mt-8 w-full py-2.5 rounded-full border border-maroon-500/20 text-center text-xs font-bold uppercase tracking-wider text-maroon-700 dark:text-gold-450 hover:bg-maroon-500/5 transition-all bg-transparent"
              >
                Go Diamond Plan
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* SUCCESS STORIES */}
      <SuccessStories />

      {/* FAQ SECTION */}
      <FaqSection />

    </div>
  );
}
