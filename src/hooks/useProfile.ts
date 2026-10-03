import { useProfileStore } from '@/stores/profileStore';

export function useProfile() {
  const { profile } = useProfileStore() as any;
  return { profile };
}
