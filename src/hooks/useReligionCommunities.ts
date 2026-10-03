import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RELIGION_COMMUNITY_MAPPING } from '@/constants/religion-community-mapping';

const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || url.includes('placeholder') || !key || key.includes('placeholder');
};

export function useReligionCommunities() {
  const [communities, setCommunities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCommunities() {
      try {
        if (isMockMode()) {
          // Check LocalStorage for mock communities
          const mockData = localStorage.getItem('gokul_mock_communities');
          if (mockData) {
            setCommunities(JSON.parse(mockData));
          } else {
            // Seed local storage with default mapping
            localStorage.setItem('gokul_mock_communities', JSON.stringify(RELIGION_COMMUNITY_MAPPING));
            setCommunities(RELIGION_COMMUNITY_MAPPING);
          }
          setLoading(false);
          return;
        }

        // Live Supabase Mode
        const { data, error } = await supabase
          .from('communities')
          .select('name, religion')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const grouped: Record<string, string[]> = {};
          data.forEach((item) => {
            const rel = item.religion;
            if (!grouped[rel]) {
              grouped[rel] = [];
            }
            if (!grouped[rel].includes(item.name)) {
              grouped[rel].push(item.name);
            }
          });
          setCommunities(grouped);
        } else {
          // If the communities table is empty, fall back to static mapping
          setCommunities(RELIGION_COMMUNITY_MAPPING);
        }
      } catch (err) {
        console.error('Failed to load communities, using static mapping fallback:', err);
        setCommunities(RELIGION_COMMUNITY_MAPPING);
      } finally {
        setLoading(false);
      }
    }

    loadCommunities();
  }, []);

  return { communities, loading };
}
