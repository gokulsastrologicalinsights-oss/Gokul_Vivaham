import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function useSubscription() {
  const { plan } = useSubscriptionStore() as any;
  return { plan };
}
