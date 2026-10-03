import { create } from 'zustand';

export const useAdminStore = create((set) => ({
  users: [],
  setUsers: (users: any[]) => set({ users })
}));
