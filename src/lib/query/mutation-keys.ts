export const MUTATION_KEYS = {
  auth: {
    login: ['auth', 'login'] as const,
    register: ['auth', 'register'] as const,
    logout: ['auth', 'logout'] as const,
    verifyOtp: ['auth', 'verifyOtp'] as const,
  },
  profile: {
    update: ['profile', 'update'] as const,
    uploadHoroscope: ['profile', 'uploadHoroscope'] as const,
    uploadPhotos: ['profile', 'uploadPhotos'] as const,
  },
  matches: {
    sendRequest: ['matches', 'sendRequest'] as const,
    respondRequest: (requestId: string) => ['matches', 'respondRequest', requestId] as const,
  },
  chat: {
    sendMessage: (channelId: string) => ['chat', 'sendMessage', channelId] as const,
  },
  subscription: {
    checkout: ['subscription', 'checkout'] as const,
    verifyPayment: ['subscription', 'verifyPayment'] as const,
  },
  admin: {
    approveProfile: (profileId: string) => ['admin', 'approveProfile', profileId] as const,
    blockUser: (userId: string) => ['admin', 'blockUser', userId] as const,
  },
};
