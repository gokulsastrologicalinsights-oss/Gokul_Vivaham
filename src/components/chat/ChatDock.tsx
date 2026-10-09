'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Flag,
  LoaderCircle,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Send,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { chatService } from '@/services/chat.service';
import { safetyService } from '@/services/safety.service';

type ChatContact = {
  id: string;
  contact_name: string;
  age?: number;
  other_user_id: string;
  profile_id?: string | null;
  profile_photo_url?: string | null;
  last_message?: string;
  updated_at?: string;
  unread_count?: number;
};

type DockMessage = {
  id: string;
  message: string;
  sender_id: 'self' | 'other';
  created_at: string;
  is_seen?: boolean;
};

type OpenChat = {
  contact: ChatContact;
  messages: DockMessage[];
  loading: boolean;
  sending: boolean;
  minimized: boolean;
  error: string;
};

type ChatRealtimePayload = {
  new: {
    id: string;
    message: string;
    sender_id: string;
    created_at: string;
    is_seen?: boolean;
  };
};

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Avatar({ contact, online, size = 'md' }: { contact: ChatContact; online: boolean; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <span className={`relative inline-flex shrink-0 ${sizeClass}`}>
      {contact.profile_photo_url ? (
        <img
          src={contact.profile_photo_url}
          alt=""
          className="h-full w-full rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ring-1 ring-border">
          {initials(contact.contact_name)}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
          title="Online now"
          aria-label="Online now"
        />
      )}
    </span>
  );
}

function MemberRow({
  contact,
  online,
  selected,
  onOpen,
}: {
  contact: ChatContact;
  online: boolean;
  selected: boolean;
  onOpen: (contact: ChatContact) => void;
}) {
  return (
    <div className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${selected ? 'bg-primary/10' : 'hover:bg-surface'}`}>
      <button type="button" onClick={() => onOpen(contact)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label={`Open chat with ${contact.contact_name}`}>
        <Avatar contact={contact} online={online} size="sm" />
      </button>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => onOpen(contact)} className="truncate text-left text-sm font-semibold text-foreground hover:text-primary">{contact.contact_name}</button>
          {(contact.unread_count || 0) > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {contact.unread_count}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-muted/50'}`} />
          {online ? 'Online now' : 'Offline'}
        </span>
      </span>
      <Link
        href={`/profile/${contact.profile_id || contact.other_user_id}`}
        onClick={(event) => event.stopPropagation()}
        className="rounded-md p-1 text-muted hover:bg-surface hover:text-primary"
        aria-label={`View ${contact.contact_name}'s profile`}
        title="View profile"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function DockChatWindow({
  chat,
  online,
  onSend,
  onMinimize,
  onClose,
  onSwitch,
  onBlock,
  onReport,
}: {
  chat: OpenChat;
  online: boolean;
  onSend: (chatId: string, message: string) => Promise<boolean>;
  onMinimize: () => void;
  onClose: () => void;
  onSwitch?: () => void;
  onBlock: () => void;
  onReport: () => void;
}) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const last = chat.messages[chat.messages.length - 1];
    if (distanceFromBottom < 96 || last?.sender_id === 'self') {
      element.scrollTop = element.scrollHeight;
    }
  }, [chat.messages]);

  const submit = async () => {
    if (!text.trim() || chat.sending) return;
    const sent = await onSend(chat.contact.id, text);
    if (sent) setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section className={`relative flex w-[min(19rem,calc(100vw-1.5rem))] max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${chat.minimized ? 'h-auto' : 'h-[min(25rem,calc(100dvh-8rem))] min-h-0'}`}>
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <Avatar contact={chat.contact} online={online} size="sm" />
        <span className="min-w-0 flex-1">
          <Link
            href={`/profile/${chat.contact.profile_id || chat.contact.other_user_id}`}
            className="block truncate text-sm font-semibold text-foreground hover:text-primary"
          >
            {chat.contact.contact_name}
          </Link>
          <span className="text-[10px] text-muted">{online ? 'Online now' : 'Offline'}</span>
        </span>
        {onSwitch && (
          <button type="button" onClick={onSwitch} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Switch conversation" title="Switch conversation">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setMenuOpen((value) => !value)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Chat safety actions" aria-expanded={menuOpen}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={onMinimize} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label={chat.minimized ? 'Restore chat' : 'Minimize chat'}>
          {chat.minimized ? <ChevronDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-destructive/10 hover:text-destructive" aria-label="Close chat">
          <X className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute z-10 mt-24 mr-8 w-40 rounded-xl border border-border bg-card p-1.5 shadow-lg">
            <button type="button" onClick={() => { setMenuOpen(false); onBlock(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-destructive hover:bg-destructive/10">
              <ShieldAlert className="h-3.5 w-3.5" /> Block member
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); onReport(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-surface hover:text-foreground">
              <Flag className="h-3.5 w-3.5" /> Report member
            </button>
          </div>
        )}
      </header>

      {!chat.minimized && (
        <>
          <div ref={messagesRef} className="flex-1 space-y-2 overflow-y-auto bg-surface/50 px-3 py-3">
            {chat.loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading conversation…
              </div>
            ) : chat.messages.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs leading-relaxed text-muted">Start a respectful conversation with this connection.</p>
            ) : (
              chat.messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender_id === 'self' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${message.sender_id === 'self' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border bg-card text-foreground'}`}>
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                    <p className={`mt-1 text-[9px] ${message.sender_id === 'self' ? 'text-primary-foreground/75' : 'text-muted'}`}>
                      {formatMessageTime(message.created_at)}{message.sender_id === 'self' ? ` · ${message.is_seen ? 'Read' : 'Sent'}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border bg-card p-2">
            {chat.error && <p role="alert" className="mb-1 px-1 text-[10px] text-destructive">{chat.error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chat.sending}
                rows={1}
                maxLength={4000}
                placeholder="Write a message..."
                className="max-h-20 min-h-10 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-xs outline-none focus:border-primary disabled:opacity-60"
                aria-label={`Message ${chat.contact.contact_name}`}
              />
              <button type="button" onClick={() => void submit()} disabled={!text.trim() || chat.sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                {chat.sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 px-1 text-[9px] text-muted">Enter to send · Shift + Enter for a new line</p>
          </div>
        </>
      )}
    </section>
  );
}

export default function ChatDock() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [presenceIds, setPresenceIds] = useState<Set<string>>(new Set());
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [mobileActiveChatId, setMobileActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const openChatsRef = useRef(openChats);
  const mobileActiveChatIdRef = useRef(mobileActiveChatId);
  const contactsRef = useRef(contacts);
  useEffect(() => { openChatsRef.current = openChats; }, [openChats]);
  useEffect(() => { mobileActiveChatIdRef.current = mobileActiveChatId; }, [mobileActiveChatId]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  const onlineContacts = useMemo(
    () => contacts.filter((contact) => presenceIds.has(contact.other_user_id)),
    [contacts, presenceIds]
  );
  const openChatIds = useMemo(() => openChats.map((chat) => chat.contact.id).join('|'), [openChats]);

  const loadContacts = async () => {
    const { data, error } = await chatService.getConversations();
    if (error) throw error;
    const nextContacts = (data || []) as ChatContact[];
    setContacts(nextContacts);
    setOpenChats((current) => current.map((chat) => ({
      ...chat,
      contact: nextContacts.find((contact) => contact.id === chat.contact.id) || chat.contact,
    })));
    setLoadError('');
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        await loadContacts();
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Online members could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30000);
    const channel = isMockMode()
      ? null
      : supabase.channel('chat-dock-conversation-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => { void refresh(); })
        .subscribe();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isMockMode()) return;
    let cancelled = false;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    const updatePresence = () => {
      if (!presenceChannel || cancelled) return;
      const state = presenceChannel.presenceState() as Record<string, unknown[]>;
      setPresenceIds(new Set(Object.keys(state)));
    };

    const connect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
      const currentUserId = userRow?.id || user.id;

      presenceChannel = supabase.channel('authenticated-member-presence', {
        config: { presence: { key: currentUserId } },
      });
      presenceChannel
        .on('presence', { event: 'sync' }, updatePresence)
        .on('presence', { event: 'join' }, updatePresence)
        .on('presence', { event: 'leave' }, updatePresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel?.track({ online_at: new Date().toISOString() });
            updatePresence();
          }
        });
    };
    void connect();

    return () => {
      cancelled = true;
      setPresenceIds(new Set());
      if (presenceChannel) void supabase.removeChannel(presenceChannel);
    };
  }, []);

  useEffect(() => {
    if (isMockMode()) return;
    const channels = openChatIds.split('|').filter(Boolean).map((chatId) => {
      const channel = supabase.channel(`chat-dock-${chatId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` }, (payload: ChatRealtimePayload) => {
          const current = openChatsRef.current.find((item) => item.contact.id === chatId);
          if (!current) return;
          const row = payload.new;
          const nextMessage: DockMessage = {
            id: row.id,
            message: row.message,
            sender_id: row.sender_id === current.contact.other_user_id ? 'other' : 'self',
            created_at: row.created_at,
            is_seen: row.is_seen,
          };
          setOpenChats((items) => items.map((item) => item.contact.id === chatId && !item.messages.some((message) => message.id === row.id)
            ? { ...item, messages: [...item.messages, nextMessage] }
            : item));
          if (nextMessage.sender_id === 'other') {
            const visible = !current.minimized && (!window.matchMedia('(max-width: 1023px)').matches || mobileActiveChatIdRef.current === chatId);
            if (visible) {
              void chatService.markRead(chatId, [row.id]);
            } else {
              setContacts((items) => items.map((item) => item.id === chatId ? { ...item, unread_count: (item.unread_count || 0) + 1 } : item));
            }
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` }, (payload: ChatRealtimePayload) => {
          setOpenChats((items) => items.map((item) => item.contact.id === chatId
            ? { ...item, messages: item.messages.map((message) => message.id === payload.new.id ? { ...message, is_seen: payload.new.is_seen } : message) }
            : item));
        })
        .subscribe();
      return channel;
    });
    return () => { channels.forEach((channel) => { void supabase.removeChannel(channel); }); };
  }, [openChatIds]);

  const openConversation = async (contact: ChatContact) => {
    const existing = openChatsRef.current.find((chat) => chat.contact.id === contact.id);
    if (existing) {
      setOpenChats((items) => items.map((chat) => chat.contact.id === contact.id ? { ...chat, minimized: false, error: '' } : chat));
    } else {
      setOpenChats((items) => [...items, { contact, messages: [], loading: true, sending: false, minimized: false, error: '' }]);
      const { data, error } = await chatService.getMessages(contact.id);
      const fetchedMessages = (data || []) as DockMessage[];
      setOpenChats((items) => items.map((chat) => chat.contact.id === contact.id ? {
        ...chat,
        messages: fetchedMessages,
        loading: false,
        error: error ? error.message : '',
      } : chat));
      const unreadIds = fetchedMessages.filter((message) => message.sender_id === 'other' && !message.is_seen).map((message) => message.id);
      if (!error && unreadIds.length) {
        try {
          await chatService.markRead(contact.id, unreadIds);
          setOpenChats((items) => items.map((chat) => chat.contact.id === contact.id ? { ...chat, messages: chat.messages.map((message) => unreadIds.includes(message.id) ? { ...message, is_seen: true } : message) } : chat));
        } catch {
          // The message list remains usable if the optional read receipt cannot be saved.
        }
      }
    }
    setContacts((items) => items.map((item) => item.id === contact.id ? { ...item, unread_count: 0 } : item));
    setMobileActiveChatId(contact.id);
    setMobileListOpen(false);
  };

  const sendMessage = async (chatId: string, message: string) => {
    const tempId = `dock-temp-${Date.now()}`;
    const optimistic: DockMessage = { id: tempId, message: message.trim(), sender_id: 'self', created_at: new Date().toISOString() };
    setOpenChats((items) => items.map((chat) => chat.contact.id === chatId ? { ...chat, messages: [...chat.messages, optimistic], sending: true, error: '' } : chat));
    const { data, error } = await chatService.sendMessage(chatId, message);
    if (error) {
      setOpenChats((items) => items.map((chat) => chat.contact.id === chatId ? { ...chat, messages: chat.messages.filter((item) => item.id !== tempId), sending: false, error: error.message || 'Message could not be sent.' } : chat));
      return false;
    }
    setOpenChats((items) => items.map((chat) => chat.contact.id === chatId ? {
      ...chat,
      messages: chat.messages.map((item) => item.id === tempId ? ({ ...(data as DockMessage), sender_id: 'self' } as DockMessage) : item),
      sending: false,
    } : chat));
    setContacts((items) => items.map((contact) => contact.id === chatId ? { ...contact, last_message: message.trim(), updated_at: 'Just now' } : contact));
    return true;
  };

  const closeConversation = (chatId: string) => {
    setOpenChats((items) => items.filter((chat) => chat.contact.id !== chatId));
    if (mobileActiveChatId === chatId) setMobileActiveChatId(null);
  };

  const blockMember = async (contact: ChatContact) => {
    const confirmed = window.confirm(`Block ${contact.contact_name}? This will remove the connection and prevent further messages.`);
    if (!confirmed) return;
    const { error } = await safetyService.blockUser(contact.other_user_id, 'Blocked from chat dock');
    if (error) {
      setOpenChats((items) => items.map((chat) => chat.contact.id === contact.id ? { ...chat, error: error.message || 'The member could not be blocked.' } : chat));
      return;
    }
    closeConversation(contact.id);
    setContacts((items) => items.filter((item) => item.id !== contact.id));
  };

  const reportMember = async (contact: ChatContact) => {
    const reason = window.prompt(`Why are you reporting ${contact.contact_name}?`);
    if (!reason?.trim()) return;
    const { error } = await safetyService.reportProfile(contact.other_user_id, 'Other', reason.trim());
    if (error) {
      setOpenChats((items) => items.map((chat) => chat.contact.id === contact.id ? { ...chat, error: error.message || 'The report could not be submitted.' } : chat));
    }
  };

  const renderMemberList = (mobile = false) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-primary" /> Online Members</h2>
          <p className="mt-0.5 text-[10px] text-muted">Your permitted connections</p>
        </div>
        {mobile && <button type="button" onClick={() => setMobileListOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-surface" aria-label="Close online members"><X className="h-4 w-4" /></button>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking presence…</div>
        ) : loadError ? (
          <div className="px-3 py-8 text-center text-xs text-destructive">{loadError}</div>
        ) : onlineContacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <CircleUserRound className="h-8 w-8 text-muted/60" />
            <p className="text-xs font-medium text-foreground">No members are online right now</p>
            <p className="text-[11px] leading-relaxed text-muted">Online connections will appear here automatically.</p>
          </div>
        ) : (
          onlineContacts.map((contact) => (
            <MemberRow key={contact.id} contact={contact} online selected={openChats.some((chat) => chat.contact.id === contact.id)} onOpen={openConversation} />
          ))
        )}
      </div>
      <Link href="/dashboard/chat" className="flex items-center justify-between border-t border-border px-4 py-3 text-xs font-semibold text-primary hover:bg-surface">
        Open all conversations <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  if (loading && !contacts.length && isMockMode()) {
    // Mock data is useful for the full chat page, but must never be presented as genuine online presence.
    return null;
  }

  return (
    <>
      <aside className={`fixed right-4 top-24 z-40 hidden w-64 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg lg:flex ${collapsed ? 'bottom-auto h-14' : 'bottom-5'}`} aria-label="Online members">
        {collapsed ? (
          <button type="button" onClick={() => setCollapsed(false)} className="flex h-14 items-center justify-center gap-2 text-primary hover:bg-surface" aria-expanded="false">
            <MessageCircle className="h-5 w-5" />
            {onlineContacts.length > 0 && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{onlineContacts.length}</span>}
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <>
            {renderMemberList()}
            <button type="button" onClick={() => setCollapsed(true)} className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Collapse online members" aria-expanded="true"><ChevronRight className="h-4 w-4" /></button>
          </>
        )}
      </aside>

      <button type="button" onClick={() => setMobileListOpen((value) => !value)} className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden" aria-label="Show online members" aria-expanded={mobileListOpen}>
        <MessageCircle className="h-5 w-5" />
        {onlineContacts.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{onlineContacts.length}</span>}
      </button>

      {mobileListOpen && <aside className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-50 flex h-[min(34rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:hidden">{renderMemberList(true)}</aside>}

      <div className="fixed bottom-4 right-[17.5rem] z-40 hidden max-w-[calc(100vw-19rem)] flex-row-reverse items-end gap-3 overflow-x-auto pb-1 lg:flex">
        {openChats.map((chat) => (
          <DockChatWindow
            key={chat.contact.id}
            chat={chat}
            online={presenceIds.has(chat.contact.other_user_id)}
            onSend={sendMessage}
            onMinimize={() => setOpenChats((items) => items.map((item) => item.contact.id === chat.contact.id ? { ...item, minimized: !item.minimized } : item))}
            onClose={() => closeConversation(chat.contact.id)}
            onBlock={() => void blockMember(chat.contact)}
            onReport={() => void reportMember(chat.contact)}
          />
        ))}
      </div>

      {mobileActiveChatId && (() => {
        const chat = openChats.find((item) => item.contact.id === mobileActiveChatId);
        if (!chat || chat.minimized) return null;
        return (
          <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[45] lg:hidden">
            <DockChatWindow
              chat={chat}
              online={presenceIds.has(chat.contact.other_user_id)}
              onSend={sendMessage}
              onMinimize={() => setMobileActiveChatId(null)}
              onClose={() => closeConversation(chat.contact.id)}
              onSwitch={() => setMobileListOpen(true)}
              onBlock={() => void blockMember(chat.contact)}
              onReport={() => void reportMember(chat.contact)}
            />
          </div>
        );
      })()}
    </>
  );
}
