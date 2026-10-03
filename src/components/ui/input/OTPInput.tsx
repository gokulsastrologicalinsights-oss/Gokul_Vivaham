'use client';

import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
  label?: string;
}

export default function OTPInput({
  length = 4,
  onComplete,
  error,
  label = 'Verification Code',
}: OTPInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<HTMLInputElement[]>([]);

  const processChange = (value: string, index: number) => {
    const val = value.slice(-1); // Get last typed character
    if (isNaN(Number(val))) return; // Ensure numeric

    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const completedCode = newCode.join('');
    if (completedCode.length === length) {
      onComplete(completedCode);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, length);
    if (!/^\d+$/.test(pasteData)) return; // Only process numeric clipboard data

    const pasteArray = pasteData.split('');
    const newCode = [...code];
    for (let i = 0; i < length; i++) {
      if (pasteArray[i]) {
        newCode[i] = pasteArray[i];
      }
    }
    setCode(newCode);

    const completedCode = newCode.join('');
    if (completedCode.length === length) {
      onComplete(completedCode);
    }

    // Focus last or active input
    const focusIndex = Math.min(pasteData.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-1 text-left w-full">
      {label && <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
      <div className="flex gap-2.5 mt-1.5 justify-start">
        {code.map((num, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={num}
            ref={(el) => {
              if (el) inputsRef.current[i] = el;
            }}
            onChange={(e) => processChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className="w-12 h-12 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-150 transition-all"
          />
        ))}
      </div>
      {error && <span className="text-[11px] text-red-500 font-semibold mt-1">{error}</span>}
    </div>
  );
}
