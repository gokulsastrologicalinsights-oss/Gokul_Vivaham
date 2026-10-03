'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-sandal-200 dark:border-zinc-800/80 flex gap-2 items-center bg-white dark:bg-zinc-900 w-full">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 h-11 px-4 rounded-full bg-zinc-50 dark:bg-zinc-950 border border-sandal-200 dark:border-zinc-850 text-sm focus:outline-none focus:border-maroon-500/50 dark:focus:border-gold-500/55 text-zinc-800 dark:text-zinc-150 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-11 h-11 rounded-full luxury-gradient flex items-center justify-center text-white shadow hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0 cursor-pointer"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
