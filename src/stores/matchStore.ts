import { create } from 'zustand';

export const useMatchStore = create((set) => ({
  matches: [],
  setMatches: (matches: any[]) => set({ matches })
}));
