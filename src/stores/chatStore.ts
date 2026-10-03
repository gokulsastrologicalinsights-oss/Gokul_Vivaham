import { create } from 'zustand';

export const useChatStore = create((set) => ({
  conversations: [],
  activeChat: null,
  setActiveChat: (chat: any) => set({ activeChat: chat })
}));
