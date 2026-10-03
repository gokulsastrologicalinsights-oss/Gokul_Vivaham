'use client';

import { Shield, Sparkles, MapPin, EyeOff } from 'lucide-react';

export default function SafetyTips() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          User Safety Tips
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Empowering Member Safety
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <EyeOff className="h-5 w-5" /> 1. Protecting Financial &amp; Card Details
        </div>
        <p>
          **Never send money or share bank details** with any matrimonial match, regardless of their story (e.g., medical emergency, customs clearance issues, travel assistance). Gokul Vivaham will never ask you to wire money to third-party accounts, and we strongly discourage sending cash or gifts to prospective matches.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Shield className="h-5 w-5" /> 2. Verify Profile Authenticity
        </div>
        <p>
          Before committing or sharing highly personal information:
          * Look for **Verified Member Badges** on profiles.
          * Ask to speak over video calls or involve elders in the communication.
          * Conduct independent background checks (educational qualifications, workplace references).
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <MapPin className="h-5 w-5" /> 3. Guidelines for Safe First Meetings
        </div>
        <p>
          When meeting a match for the first time:
          * **Choose a public venue** (like a restaurant, mall, or temple).
          * **Inform family or friends** about the location, timing, and contact details of the person you are meeting.
          * Arrange your own transportation to and from the venue.
          * Do not agree to meet in isolated, private, or remote areas.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Sparkles className="h-5 w-5" /> 4. Trust Your Instincts
        </div>
        <p>
          If something feels off, or if a member exhibits suspicious pressure (asking to move off-platform immediately, asking inappropriate questions, or details that do not match their dashboard bio), block the user immediately and notify our support desk.
        </p>
      </div>

    </div>
  );
}
