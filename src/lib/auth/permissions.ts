export type UserRole = 'user' | 'premium_user' | 'moderator' | 'admin' | 'super_admin';

export const RoleHierarchy: Record<UserRole, number> = {
  user: 1,
  premium_user: 2,
  moderator: 3,
  admin: 4,
  super_admin: 5,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const userPriority = RoleHierarchy[userRole] || 1;
  const requiredPriority = RoleHierarchy[requiredRole] || 1;
  return userPriority >= requiredPriority;
}
