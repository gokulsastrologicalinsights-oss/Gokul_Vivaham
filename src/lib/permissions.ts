import { UserRole, hasPermission } from './auth/permissions';

export const permissionsLib = {
  canAccessAdmin: (role: string) => hasPermission(role as UserRole, 'moderator'),
  canChat: (role: string) => hasPermission(role as UserRole, 'premium_user'),
  canModerate: (role: string) => hasPermission(role as UserRole, 'moderator'),
  isSuperAdmin: (role: string) => role === 'super_admin',
};
