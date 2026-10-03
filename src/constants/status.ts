export const STATUS = {
  matches: {
    PENDING: 'pending' as const,
    ACCEPTED: 'accepted' as const,
    DECLINED: 'declined' as const,
  },
  verification: {
    PENDING: 'pending' as const,
    APPROVED: 'approved' as const,
    REJECTED: 'rejected' as const,
  },
  profileVisibility: {
    PUBLIC: 'public' as const,
    PROTECTED: 'protected' as const,
    PRIVATE: 'private' as const,
  },
  billing: {
    SUCCESS: 'success' as const,
    FAILED: 'failed' as const,
    PENDING: 'pending' as const,
  },
};
