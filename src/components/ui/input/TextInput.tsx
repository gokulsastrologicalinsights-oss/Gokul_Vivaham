'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;
    return (
      <div className="flex min-w-0 w-full flex-col gap-1 text-left">
        <label htmlFor={inputId} className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        <div className="relative min-w-0 w-full">
          {icon && (
            <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`h-11 min-w-0 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white ${
              icon ? 'pl-11 pr-3.5' : 'px-3.5'
            } ${className}`}
            {...props}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? inputId+'-error' : props['aria-describedby']}
          />
        </div>
        {error && <span id={inputId+'-error'} role="alert" className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;

