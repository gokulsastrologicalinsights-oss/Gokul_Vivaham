export const ROLES = {
  USER: 'user' as const,
  PREMIUM_USER: 'premium_user' as const,
  MODERATOR: 'moderator' as const,
  ADMIN: 'admin' as const,
  SUPER_ADMIN: 'super_admin' as const,
};

export type UserRoleType = typeof ROLES[keyof typeof ROLES];
