'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useFeaturedProfiles() {
  return useQuery({
    queryKey: ['featuredProfiles'],
    queryFn: async () => {
      // 1. Fetch active promoted profile records
      const { data: boostData, error: boostErr } = await supabase
        .from('featured_profiles')
        .select(`
          id,
          user_id,
          profiles:user_id (
            first_name,
            last_name,
            age,
            city,
            rasi,
            nakshatra,
            occupation,
            profile_id,
            gender
          )
        `)
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString());

      if (boostErr) throw boostErr;
      if (!boostData || boostData.length === 0) return [];

      // 2. Fetch primary photos for active candidates
      const userIds = boostData.map((b: any) => b.user_id);
      const { data: photoData, error: photoErr } = await supabase
        .from('gallery_images')
        .select('user_id, image_url')
        .in('user_id', userIds)
        .eq('is_profile_picture', true)
        .eq('moderation_status', 'approved');

      if (photoErr) throw photoErr;

      const photoMap = new Map();
      photoData?.forEach((img: any) => {
        photoMap.set(img.user_id, img.image_url);
      });

      // 3. Map records into consolidated profiles
      return boostData
        .filter((b: any) => b.profiles)
        .map((b: any) => {
          const p = b.profiles;
          return {
            id: p.profile_id,
            userId: b.user_id,
            name: `${p.first_name} ${p.last_name || ''}`.trim(),
            age: p.age,
            city: p.city || 'N/A',
            rasi: p.rasi || 'N/A',
            nakshatra: p.nakshatra || 'N/A',
            occupation: p.occupation || 'Professional',
            gender: p.gender,
            photoUrl: photoMap.get(b.user_id) || null
          };
        });
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
