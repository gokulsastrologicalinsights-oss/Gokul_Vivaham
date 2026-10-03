'use client';
import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ShieldCheck, MessageCircle, Flag, ExternalLink } from 'lucide-react';
import VerificationBadges from '@/components/ui/VerificationBadges';
import { safetyService } from '@/services/safety.service';

interface ChatWindowProps {
  activeChat: any;
  messages: any[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  onBack?: () => void;
}

export default function ChatWindow({
  activeChat,
  messages,
  onSendMessage,
  loading,
  onBack
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleHeaderBlock = async () => {
    if (!activeChat) return;
    const confirmBlock = confirm(`Are you sure you want to block ${activeChat.contact_name}? This conversation and connection details will be permanently deleted. Proceed?`);
    if (!confirmBlock) return;

    try {
      const { error } = await safetyService.blockUser(activeChat.other_user_id, 'Blocked from chat window');
      if (error) throw error;
      alert(`Blocked member ${activeChat.contact_name}`);
      window.location.reload();
    } catch (e: any) {
      alert('Error blocking: ' + e.message);
    }
  };

  const handleReportMessage = async (messageId: string, messageText: string) => {
    if (!activeChat) return;

    const catChoice = prompt(
      'Select a category for reporting this message (Enter number 1-5):\n' +
      '1. Fake Profile\n' +
      '2. Spam\n' +
      '3. Harassment\n' +
      '4. Inappropriate Content\n' +
      '5. Other'
    );
    if (!catChoice) return;

    let category: 'Fake Profile' | 'Spam' | 'Harassment' | 'Inappropriate Content' | 'Other' = 'Other';
    if (catChoice === '1') category = 'Fake Profile';
    else if (catChoice === '2') category = 'Spam';
    else if (catChoice === '3') category = 'Harassment';
    else if (catChoice === '4') category = 'Inappropriate Content';
    else if (catChoice === '5') category = 'Other';

    const reason = prompt(`Specify the reason for reporting this message: "${messageText.substring(0, 30)}..."`);
    if (!reason) return;

    try {
      const { error } = await safetyService.reportMessage(messageId, activeChat.other_user_id, category, reason);
      if (error) {
        alert('Failed to submit report: ' + error.message);
      } else {
        alert('Message reported to moderators.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-900/10 text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-sandal-100/40 dark:bg-zinc-800 flex items-center justify-center text-maroon-600 dark:text-gold-400 shrink-0">
          <MessageCircle className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">No Chat Selected</h3>
          <p className="text-xs text-zinc-500 font-light max-w-xs leading-normal">
            Choose a partner connection from the conversation list on the left to start real-time messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full bg-white dark:bg-zinc-900">
      {onBack && <button type="button" onClick={onBack} className="md:hidden text-left px-4 py-3 text-sm underline border-b border-border">Back to conversations</button>}
      {/* Active User Header */}
      <div className="p-3 md:p-4 border-b border-sandal-200 dark:border-zinc-800/80 flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sandal-200 to-amber-100 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center font-bold text-xs text-maroon-700 dark:text-gold-450 shadow-sm shrink-0">
            {activeChat.contact_name[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {activeChat.contact_name}
              </span>
              <VerificationBadges profile={activeChat} size="sm" />
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Channel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleHeaderBlock}
            className="px-2.5 py-1 rounded border border-red-500/25 hover:bg-red-500/5 text-red-500 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            title="Block this Member"
          >
            Block Member
          </button>
          <div className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> SECURE CHAT
          </div>
        </div>
      </div>

      {/* Messages List Area */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 p-4 overflow-y-auto space-y-4 bg-zinc-50/30 dark:bg-zinc-950/20"
      >
        {loading ? (
          <div className="text-center text-xs text-zinc-400 py-8">Loading history...</div>
        ) : messages.length > 0 ? (
          messages.map((msg: any, idx: number) => (
            <MessageBubble 
              key={msg.id || idx} 
              message={msg.message} 
              isSelf={msg.sender_id === 'self'}
              readStatus={msg.sender_id === 'self' ? (msg.id?.startsWith('temp-') ? 'Sending…' : msg.is_seen ? 'Read' : 'Sent') : undefined}
              onReport={msg.sender_id !== 'self' ? () => handleReportMessage(msg.id, msg.message) : undefined}
            />
          ))
        ) : (
          <div className="p-8 text-center text-xs text-zinc-450 italic">
            Start the conversation by typing a message below!
          </div>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput onSend={onSendMessage} />
    </div>
  );
}
