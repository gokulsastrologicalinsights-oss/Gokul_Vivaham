'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useInterests() {
  return useQuery({
    queryKey: ['matchRequests'],
    queryFn: async () => {
      // 1. Get current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Resolve user's actual database ID
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const currentUserId = userRow?.id || user.id;

      // 2. Fetch match requests associated with user
      const { data: reqs, error: reqErr } = await supabase
        .from('match_requests')
        .select('*')
        .or(`sender_user_id.eq.${currentUserId},receiver_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;
      if (!reqs || reqs.length === 0) return [];

      // 3. Collect partner user IDs
      const otherUserIds = reqs.map((r: any) => 
        r.sender_user_id === currentUserId ? r.receiver_user_id : r.sender_user_id
      );

      // 4. Fetch profiles for partners
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, profile_id, age, city, nakshatra, rasi, education, gender')
        .in('user_id', otherUserIds);

      if (profErr) throw profErr;

      // 5. Fetch profile pictures
      const { data: photos, error: photoErr } = await supabase
        .from('gallery_images')
        .select('user_id, image_url, thumbnail_url')
        .in('user_id', otherUserIds)
        .eq('is_profile_picture', true)
        .eq('moderation_status', 'approved');

      const photoMap = new Map();
      photos?.forEach((img: any) => {
        photoMap.set(img.user_id, img.thumbnail_url || img.image_url);
      });

      // 6. Map and return combined records
      return reqs.map((r: any) => {
        const isIncoming = r.receiver_user_id === currentUserId;
        const otherId = isIncoming ? r.sender_user_id : r.receiver_user_id;
        const prof = profiles?.find((p: any) => p.user_id === otherId);

        return {
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          isIncoming,
          otherUserId: otherId,
          profileId: prof ? prof.profile_id : 'GV-UNKNOWN',
          profileUuid: prof ? prof.id : null,
          name: prof ? `${prof.first_name} ${prof.last_name || ''}`.trim() : 'Unknown Member',
          age: prof ? prof.age : 28,
          location: prof ? prof.city : 'N/A',
          education: prof ? prof.education : 'N/A',
          star: prof ? prof.nakshatra : 'N/A',
          rasi: prof ? prof.rasi : 'N/A',
          gender: prof ? prof.gender : 'N/A',
          photoUrl: photoMap.get(otherId) || null
        };
      });
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
}
