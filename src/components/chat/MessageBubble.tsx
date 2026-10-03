'use client';
import { Flag } from 'lucide-react';

export default function MessageBubble({ 
  message, 
  isSelf,
  readStatus,
  onReport
}: { 
  message: string; 
  isSelf: boolean;
  readStatus?: string;
  onReport?: () => void;
}) {
  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} w-full group/bubble`}>
      <div className="flex min-w-0 items-center gap-2 max-w-[90%] md:max-w-[75%]">
        {!isSelf && onReport && (
          <button
            onClick={onReport}
            className="p-2 rounded bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-400 hover:text-red-500 transition-colors md:opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 cursor-pointer select-none shrink-0"
            aria-label="Report message"
            title="Report/Flag Message"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
        <div 
          className={`min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap p-3.5 rounded-2xl text-sm leading-relaxed text-left ${
            isSelf 
              ? 'luxury-gradient text-white rounded-tr-none shadow-md' 
              : 'bg-sandal-50/70 dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 border border-sandal-100 dark:border-zinc-750 rounded-tl-none'
          }`}
        >
          {message}
          {readStatus && <span className="block text-[10px] mt-1 opacity-80">{readStatus}</span>}
        </div>
      </div>
    </div>
  );
}
