import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (notif: any) => set((state: any) => ({ notifications: [...state.notifications, notif] }))
}));
