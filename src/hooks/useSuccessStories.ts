'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSuccessStories() {
  return useQuery({
    queryKey: ['successStoriesApproved'],
    queryFn: async () => {
      // 1. Fetch approved success story rows
      const { data: dbStories, error } = await supabase
        .from('success_stories')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!dbStories || dbStories.length === 0) return [];

      // 2. Resolve Profile details (first names and rasi alignments)
      const userIds = new Set<string>();
      dbStories.forEach(s => {
        if (s.husband_user_id) userIds.add(s.husband_user_id);
        if (s.wife_user_id) userIds.add(s.wife_user_id);
      });

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rasi')
        .in('user_id', Array.from(userIds));

      if (profErr) throw profErr;

      // 3. Map details into carousel objects
      return dbStories.map(s => {
        const husband = profiles?.find(p => p.user_id === s.husband_user_id);
        const wife = profiles?.find(p => p.user_id === s.wife_user_id);

        const husbandName = husband ? `${husband.first_name} ${husband.last_name || ''}`.trim() : 'Groom';
        const wifeName = wife ? `${wife.first_name} ${wife.last_name || ''}`.trim() : 'Bride';

        const husbandRasi = husband?.rasi ? `${husband.rasi} Rasi` : '';
        const wifeRasi = wife?.rasi ? `${wife.rasi} Rasi` : '';
        const compatibilityStr = [husbandRasi, wifeRasi].filter(Boolean).join(' & ');

        return {
          id: s.id,
          name: `${husbandName} & ${wifeName}`,
          date: `Married ${new Date(s.wedding_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
          compatibility: compatibilityStr ? `${compatibilityStr} (Astro Match)` : 'Verified Astro Match',
          text: `"${s.story}"`,
          image_url: s.image_url
        };
      });
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}
