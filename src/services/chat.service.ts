import { supabase } from '@/lib/supabase';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export const chatService = {
  async getConversations() {
    try {
      if (isMockMode()) {
        return { data: [
          { id: 'chat-1', contact_name: 'Meenakshi N.', age: 24, last_message: 'Hi, I reviewed your horoscope.', updated_at: '2 hours ago', other_user_id: 'mock-user-1', is_verified: true, is_premium: false, id_verification_status: 'approved', horoscope_verification_status: 'none', email_verified: true, mobile_verified: true },
          { id: 'chat-2', contact_name: 'Gayathri S.', age: 25, last_message: 'Hello, are you free for a call tomorrow?', updated_at: '1 day ago', other_user_id: 'mock-user-2', is_verified: true, is_premium: true, id_verification_status: 'approved', horoscope_verification_status: 'approved', email_verified: true, mobile_verified: true }
        ], error: null };
      }

      // 1. Get logged-in user auth ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: new Error('User not authenticated') };

      // 2. Get user database row
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!userRow) return { data: [], error: new Error('User row not found') };
      const currentUserId = userRow.id;

      // 2.5. Fetch block list for filtering
      const { data: blocks } = await supabase
        .from('blocked_users')
        .select('blocker_user_id, blocked_user_id')
        .or(`blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`);

      const blockedUserIds = blocks 
        ? blocks.map((b: any) => b.blocker_user_id === currentUserId ? b.blocked_user_id : b.blocker_user_id)
        : [];

      // 3. Select all chats where current user is user_one or user_two
      const { data: chatList, error } = await supabase
        .from('chats')
        .select('*')
        .or(`user_one.eq.${currentUserId},user_two.eq.${currentUserId}`);

      if (error || !chatList || chatList.length === 0) {
        return { data: [], error };
      }

      // 4. For each chat, retrieve opponent's profile and last message
      const conversations = await Promise.all(
        chatList.map(async (chat) => {
          const otherUserId = chat.user_one === currentUserId ? chat.user_two : chat.user_one;
          
          // Get profile with verification states
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_id, image_url, age, is_verified, is_premium, id_verification_status, horoscope_verification_status, users(email_verified, mobile_verified)')
            .eq('user_id', otherUserId)
            .maybeSingle();

          // Profile photos are still permission-filtered by the existing gallery RLS.
          // Use the profile image first, then fall back to the approved profile picture.
          const { data: galleryPhoto } = await supabase
            .from('gallery_images')
            .select('image_url, thumbnail_url')
            .eq('user_id', otherUserId)
            .eq('is_profile_picture', true)
            .limit(1)
            .maybeSingle();

          // Get last message
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('message, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = messages?.[0];
          const { count: unreadCount, error: unreadError } = await supabase.from('chat_messages')
            .select('id', { count: 'exact', head: true }).eq('chat_id', chat.id).neq('sender_id', currentUserId).eq('is_seen', false);
          if (unreadError) throw unreadError;

          return {
            id: chat.id,
            unread_count: unreadCount || 0,
            contact_name: profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Unknown Member',
            age: profile?.age || 25,
            last_message: lastMsg ? lastMsg.message : 'No messages yet',
            updated_at: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            other_user_id: otherUserId,
            profile_id: profile?.profile_id || null,
            profile_photo_url: profile?.image_url || galleryPhoto?.thumbnail_url || galleryPhoto?.image_url || null,
            // verification states
            is_verified: profile?.is_verified || false,
            is_premium: profile?.is_premium || false,
            id_verification_status: profile?.id_verification_status || (profile?.is_verified ? 'approved' : 'none'),
            horoscope_verification_status: profile?.horoscope_verification_status || 'none',
            email_verified: (profile as any)?.users?.email_verified || false,
            mobile_verified: (profile as any)?.users?.mobile_verified || false
          };
        })
      );

      // Filter out conversations with blocked users
      const filteredConversations = conversations.filter(c => !blockedUserIds.includes(c.other_user_id));

      return { data: filteredConversations, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async getMessages(channelId: string) {
    try {
      if (isMockMode()) {
        if (channelId === 'chat-1') {
          return { data: [
            { id: 'msg-1', chat_id: 'chat-1', sender_id: 'other', message: 'Hello, interest request approved. Nice to connect with you.', created_at: '2026-05-26T11:55:00Z' },
            { id: 'msg-2', chat_id: 'chat-1', sender_id: 'self', message: 'Hi Meenakshi, glad to connect too. Hope you had a chance to view my profile.', created_at: '2026-05-26T11:58:00Z' },
            { id: 'msg-3', chat_id: 'chat-1', sender_id: 'other', message: 'Hi, I reviewed your horoscope. It matches well with my rasi!', created_at: '2026-05-26T12:00:00Z' }
          ], error: null };
        } else {
          return { data: [
            { id: 'msg-4', chat_id: 'chat-2', sender_id: 'other', message: 'Hello, are you free for a call tomorrow?', created_at: '2026-05-25T15:30:00Z' }
          ], error: null };
        }
      }

      // 1. Get logged-in user auth ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: new Error('User not authenticated') };

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const currentUserId = userRow?.id || user.id;

      // 2. Fetch message rows ordered by created_at ascending
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', channelId)
        .order('created_at', { ascending: true });

      if (error || !messages) return { data: [], error };

      const formatted = messages.map(m => ({
        id: m.id,
        chat_id: m.chat_id,
        is_seen: m.is_seen,
        sender_id: m.sender_id === currentUserId ? 'self' : 'other',
        message: m.message,
        created_at: m.created_at
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  async markRead(channelId: string, ids: string[]) {
    if (!ids.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const currentUserId = userRow?.id || user.id;
    const { error } = await supabase.from('chat_messages').update({ is_seen: true })
      .eq('chat_id', channelId).in('id', ids).neq('sender_id', currentUserId).eq('is_seen', false);
    if (error) throw error;
  },

  async sendMessage(channelId: string, message: string) {
    try {
      message = message.trim();
      if (!message || message.length > 4000) throw new Error('Enter a message between 1 and 4,000 characters.');
      if (isMockMode()) {
        return { data: { id: `msg-${Date.now()}`, chat_id: channelId, sender_id: 'self', message, created_at: new Date().toISOString() }, error: null };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const currentUserId = userRow?.id || user.id;

      // 2. Check blocks before sending
      const { data: chatRow } = await supabase
        .from('chats')
        .select('user_one, user_two')
        .eq('id', channelId)
        .maybeSingle();

      if (!chatRow) throw new Error('Chat unavailable. Check your plan, accepted interest, and block settings.');
      if (chatRow) {
        const opponentId = chatRow.user_one === currentUserId ? chatRow.user_two : chatRow.user_one;
        const { data: block } = await supabase
          .from('blocked_users')
          .select('id')
          .or(`and(blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${opponentId}),and(blocker_user_id.eq.${opponentId},blocked_user_id.eq.${currentUserId})`)
          .maybeSingle();

        if (block) {
          throw new Error('Cannot send messages to a blocked member.');
        }
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: channelId,
          sender_id: currentUserId,
          message: message,
        })
        .select();
      
      const formatted = data?.[0] ? {
        id: data[0].id,
        chat_id: data[0].chat_id,
        sender_id: 'self',
        message: data[0].message,
        created_at: data[0].created_at
      } : null;

      return { data: formatted, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
};
