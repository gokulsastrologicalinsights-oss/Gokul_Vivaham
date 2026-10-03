import { useNotificationStore } from '@/stores/notificationStore';

export function useNotifications() {
  const { notifications } = useNotificationStore() as any;
  return { notifications };
}
