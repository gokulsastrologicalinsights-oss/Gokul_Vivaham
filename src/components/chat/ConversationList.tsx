'use client';
import { MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';

interface Conversation {
  id: string;
  contact_name: string;
  age: number;
  last_message: string;
  updated_at: string;
  unread_count?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  loading: boolean;
}

export default function ConversationList({
  conversations,
  activeChatId,
  onSelectChat,
  loading
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter(c =>
    c.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 border-r border-sandal-200 dark:border-zinc-800/80 flex flex-col h-full min-h-0 bg-sandal-50/10 dark:bg-zinc-950/20 shrink-0">
      {/* Search Header */}
      <div className="p-4 border-b border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-3">
        <h2 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          Messages <MessageSquare className="h-4 w-4 text-maroon-500" />
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            aria-label="Search conversations"
            placeholder="Search chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 text-xs focus:outline-none focus:border-maroon-500/55 dark:focus:border-gold-500/55 text-zinc-800 dark:text-zinc-150"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-sandal-100 dark:divide-zinc-850/50">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading channels...</div>
        ) : filtered.length > 0 ? (
          filtered.map((convo) => {
            const isActive = convo.id === activeChatId;
            const initials = convo.contact_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <button
                key={convo.id}
                onClick={() => onSelectChat(convo.id)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-sandal-50/50 dark:hover:bg-zinc-850/30 transition-all text-left border-l-2 cursor-pointer ${
                  isActive
                    ? 'border-maroon-600 dark:border-gold-500 bg-sandal-100/30 dark:bg-zinc-850/40'
                    : 'border-transparent'
                }`}
              >
                {/* Initials Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sandal-200 to-amber-100 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center font-bold text-xs text-maroon-700 dark:text-gold-400 shrink-0 shadow-sm">
                  {initials}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                      {convo.contact_name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      {convo.updated_at}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-550 dark:text-zinc-400 truncate font-light">
                    {convo.last_message}
                  </span>
                  {(convo.unread_count || 0) > 0 && <span className="text-xs font-bold" aria-label={`${convo.unread_count} unread messages`}>{convo.unread_count} unread</span>}
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-zinc-450 italic">
            No active conversations
          </div>
        )}
      </div>
    </div>
  );
}
