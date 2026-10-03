import { create } from 'zustand';

export const useProfileStore = create((set) => ({
  profile: null,
  setProfile: (profile: any) => set({ profile })
}));
