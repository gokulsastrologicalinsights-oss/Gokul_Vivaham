'use client';

import { Eye, Shield, Cpu, RefreshCw } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Cookie Policy
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Safe Browsing
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Cpu className="h-5 w-5" /> 1. What Are Cookies?
        </div>
        <p>
          Cookies are small text files placed on your device to collect standard internet log and visitor behavior information. They help us remember your authentication session, preferences, and secure your dashboard operations.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Shield className="h-5 w-5" /> 2. Essential cookies we use
        </div>
        <p>
          We use essential cookies strictly to handle your user session security, including authentication checks, CSRF state verification, and matching algorithm sessions. Disabling these cookies will prevent you from logging into the platform.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Eye className="h-5 w-5" /> 3. Functional and Preference Cookies
        </div>
        <p>
          These cookies allow the site to remember choices you make, such as your preferred theme (Dark Mode / Light Mode) or language settings, ensuring a personalized, premium experience when browsing candidate matches.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <RefreshCw className="h-5 w-5" /> 4. Managing Cookie Preferences
        </div>
        <p>
          Most browsers allow you to block or delete cookies through browser settings. However, since cookies are essential for verifying authorization sessions, blocking cookies will disable login access and page loading.
        </p>
      </div>

    </div>
  );
}
