'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="flex flex-col gap-1 text-left w-full">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        <div className="relative w-full">
          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400">
            <Lock className="h-4 w-4" />
          </span>
          <input
            ref={ref}
            type={show ? 'text' : 'password'}
            className={`w-full h-11 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 pl-11 pr-10 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-650 touch-target flex items-center justify-center"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <span className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
