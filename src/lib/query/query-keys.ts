export const QUERY_KEYS = {
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: (filters: Record<string, any>) => ['profiles', 'list', filters] as const,
    detail: (profileId: string) => ['profiles', 'detail', profileId] as const,
    compatibility: (partnerId: string) => ['profiles', 'compatibility', partnerId] as const,
  },
  matches: {
    list: (type: 'recommended' | 'recent' | 'premium') => ['matches', type] as const,
    requests: (status: 'pending' | 'accepted' | 'declined' | 'all') => ['matches', 'requests', status] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    messages: (channelId: string) => ['chat', 'messages', channelId] as const,
  },
  notifications: {
    list: ['notifications'] as const,
    unreadCount: ['notifications', 'unread'] as const,
  },
  subscriptions: {
    plans: ['subscriptions', 'plans'] as const,
    active: ['subscriptions', 'active'] as const,
  },
  admin: {
    users: (filters: Record<string, any>) => ['admin', 'users', filters] as const,
    approvals: ['admin', 'approvals'] as const,
    logs: ['admin', 'logs'] as const,
  },
};
