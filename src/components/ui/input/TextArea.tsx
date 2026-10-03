'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 text-left w-full">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        <textarea
          ref={ref}
          className={`w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 px-3.5 py-2.5 resize-y ${className}`}
          {...props}
        />
        {error && <span className="text-[11px] text-red-500 font-semibold">{error}</span>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
