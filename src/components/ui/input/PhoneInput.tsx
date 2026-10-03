'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  countryCode?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, countryCode = '+91', className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 text-left w-full">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        <div className="relative flex w-full">
          <div className="flex items-center gap-1 px-3 h-11 border border-r-0 border-zinc-200 dark:border-zinc-800 bg-sandal-50/50 dark:bg-zinc-900/50 text-sm text-zinc-600 dark:text-zinc-400 rounded-l-lg select-none">
            <Phone className="h-4 w-4" />
            <span className="font-semibold">{countryCode}</span>
          </div>
          <input
            ref={ref}
            type="tel"
            className={`flex-1 h-11 rounded-r-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 px-3.5 ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
