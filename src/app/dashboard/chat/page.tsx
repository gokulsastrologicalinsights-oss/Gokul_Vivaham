'use client';

import { useState, useEffect, Suspense } from 'react';
import ChatLayout from '@/components/chat/ChatLayout';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { chatService } from '@/services/chat.service';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const targetChatId = searchParams.get('chatId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(targetUserId || targetChatId));
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState('');
  const [listUpdateError, setListUpdateError] = useState('');

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      setLoadingConvos(true);
      try {
        const { data, error } = await chatService.getConversations();
        if (error) throw error;
        if (data) {
          setConversations(data);
          
          // Select chat based on query params or fallback to first chat
          if (targetChatId) {
            const foundChat = data.find((c) => c.id === targetChatId);
            if (foundChat) {
              setActiveChatId(targetChatId);
              return;
            }
          }
          if (targetUserId) {
            const foundChat = data.find((c) => c.other_user_id === targetUserId);
            if (foundChat) {
              setActiveChatId(foundChat.id);
              return;
            }
          }

          if (data.length > 0) {
            setActiveChatId(data[0].id);
          }
        }
      } catch (err) {
        setChatError('Unable to load conversations. Please refresh and try again.');
        console.error('Error loading conversations:', err);
      } finally {
        setLoadingConvos(false);
      }
    };
    loadConversations();
  }, [targetChatId, targetUserId]);

  // Refresh previews and unread counts for every permitted conversation.
  useEffect(() => {
    let cancelled = false;
    let running = false;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (running) { queued = true; return; }
      running = true;
      try {
        const {data,error} = await chatService.getConversations();
        if (error) throw error;
        if (!cancelled) {
          setListUpdateError('');
          setConversations(data || []);
          setActiveChatId(current => (data || []).some(chat => chat.id === current) ? current : '');
        }
      } catch {
        if (!cancelled) setListUpdateError('Conversation updates could not be loaded. They will retry automatically.');
      } finally {
        running = false;
        if (queued && !cancelled) { queued = false; schedule(); }
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 200);
    };
    const channel = supabase.channel('conversation-list-updates')
      .on('postgres_changes', {event:'*',schema:'public',table:'chat_messages'}, schedule)
      .subscribe();
    const interval = setInterval(() => { void refresh(); }, 30000);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('focus', schedule);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('focus', schedule);
      void supabase.removeChannel(channel);
    };
  }, []);

  // Load messages and subscribe to real-time channel
  useEffect(() => {
    if (!activeChatId) { setMessages([]); setLoadingMessages(false); return; }
    let cancelled = false;
    setMessages([]);

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await chatService.getMessages(activeChatId);
        if (error) throw error;
        if (!cancelled && data) setMessages(data);
      } catch (err) {
        if (!cancelled) setChatError('Unable to load messages. Please refresh and try again.');
        console.error('Error loading messages:', err);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    loadMessages();

    // Real-time listener
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    if (isMock) return;

    const channel = supabase
      .channel(`chat_messages_${activeChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${activeChatId}`
        },
        async (payload: any) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          const currentUserId = userRow?.id || user.id;
          const newMsg = payload.new;
          if (cancelled) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                chat_id: newMsg.chat_id,
                sender_id: newMsg.sender_id === currentUserId ? 'self' : 'other',
                message: newMsg.message,
                created_at: newMsg.created_at
                ,is_seen: newMsg.is_seen
              }
            ];
          });
        }
      )
      .on('postgres_changes', {event:'UPDATE',schema:'public',table:'chat_messages',filter:`chat_id=eq.${activeChatId}`}, (payload:any)=>{
        if (!cancelled) setMessages(prev=>prev.map(message=>message.id===payload.new.id ? {...message,is_seen:payload.new.is_seen} : message));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeChatId]);

  useEffect(()=>{
    let cancelled = false;
    const markVisible = async ()=>{
      if(document.visibilityState!=='visible' || !activeChatId ||
        (window.matchMedia('(max-width: 767px)').matches && !mobileChatOpen)) return;
      const ids=messages.filter(message=>message.sender_id==='other' && !message.is_seen).map(message=>message.id);
      if(!ids.length) return;
      try {
        await chatService.markRead(activeChatId,ids);
        if (cancelled) return;
        setMessages(prev=>prev.map(message=>ids.includes(message.id)?{...message,is_seen:true}:message));
        setConversations(prev=>prev.map(conversation=>conversation.id===activeChatId?{...conversation,unread_count:0}:conversation));
      } catch {if (!cancelled) setChatError('Read status could not be saved.');}
    };
    void markVisible();
    document.addEventListener('visibilitychange',markVisible);
    window.addEventListener('resize',markVisible);
    return ()=>{cancelled=true;document.removeEventListener('visibilitychange',markVisible);window.removeEventListener('resize',markVisible);};
  },[activeChatId,messages,mobileChatOpen]);

  const handleSendMessage = async (text: string) => {
    if (!activeChatId) return;

    // Optimistically add message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      chat_id: activeChatId,
      sender_id: 'self',
      message: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Update conversation last message in side list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, last_message: text, updated_at: 'Just now' }
          : c
      )
    );

    // Call service to persist
    const { data, error } = await chatService.sendMessage(activeChatId, text);
    if (error) {
      // Revert optimism
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Failed to send message: ' + error.message);
    } else if (data) {
      // Replace optimistic message with actual DB record to ensure id and dates match
      setMessages((prev) =>
        prev.filter((m) => m.id !== data.id).map((m) => (m.id === tempId ? data : m))
      );
    }
  };

  const activeChat = conversations.find((c) => c.id === activeChatId);

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-col">
        <h1 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Messages &amp; Conversations
        </h1>
        <p className="text-xs text-zinc-500 font-light mt-1 font-mono">
          Chat securely and privately with mutual partner connections
        </p>
      </div>

      {chatError && <p role="alert" className="text-sm text-red-600">{chatError}</p>}
      {listUpdateError && <p role="alert" className="text-sm text-red-600">{listUpdateError}</p>}
      <ChatLayout>
        <div className={`${mobileChatOpen && activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 h-full min-h-0`}>
        <ConversationList
          conversations={conversations}
          activeChatId={activeChatId}
          onSelectChat={id=>{setActiveChatId(id);setMobileChatOpen(true);}}
          loading={loadingConvos}
        />
        </div>
        <div className={`${mobileChatOpen && activeChatId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 h-full min-h-0`}>
        <ChatWindow
          activeChat={activeChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loadingMessages}
          onBack={()=>setMobileChatOpen(false)}
        />
        </div>
      </ChatLayout>
    </div>
  );
}

export default function DashboardChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4 text-left animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
