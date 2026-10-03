import { create } from 'zustand';

export const useSubscriptionStore = create((set) => ({
  plan: 'Free',
  setPlan: (plan: string) => set({ plan })
}));
