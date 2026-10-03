import { UserRole, hasPermission } from './permissions';

export function isAllowed(role: string | undefined | null, requiredRole: UserRole): boolean {
  if (!role) return false;
  return hasPermission(role as UserRole, requiredRole);
}

export function isAdmin(role: string | undefined | null): boolean {
  return isAllowed(role, 'admin');
}

export function isPremium(role: string | undefined | null): boolean {
  return isAllowed(role, 'premium_user');
}

export function isModerator(role: string | undefined | null): boolean {
  return isAllowed(role, 'moderator');
}

export function isSuperAdmin(role: string | undefined | null): boolean {
  return isAllowed(role, 'super_admin');
}
