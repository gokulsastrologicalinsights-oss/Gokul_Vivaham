import { useMatchStore } from '@/stores/matchStore';

export function useMatches() {
  const { matches } = useMatchStore() as any;
  return { matches };
}
