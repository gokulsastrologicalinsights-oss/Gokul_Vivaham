'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

type FeaturedCard = { profile_id: string; user_id: string; first_name: string; last_name: string | null;
  age: number; city: string | null; rasi: string | null; nakshatra: string | null;
  occupation: string | null; gender: string; image_url: string | null };

export function useFeaturedProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['featuredProfiles', user?.id], enabled: !!user,
    queryFn: async () => {
      const response = await fetch('/api/matches?featured=true', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load featured members.');
      return ((result.profiles || []) as FeaturedCard[]).map(p => ({
        id: p.profile_id, userId: p.user_id, name: [p.first_name,p.last_name].filter(Boolean).join(' '),
        age: p.age, city: p.city || 'N/A', rasi: p.rasi || 'N/A', nakshatra: p.nakshatra || 'N/A',
        occupation: p.occupation || 'Professional', gender: p.gender, photoUrl: p.image_url,
      }));
    }, staleTime: 60000,
  });
}
