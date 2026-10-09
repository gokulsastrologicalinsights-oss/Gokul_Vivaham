export type LandingAccess = {
  role?: string | null;
  isAdmin?: boolean;
  mfaRequired?: boolean;
};

const ADMIN_ROLES = new Set(['moderator', 'admin', 'super_admin']);

export function isAdministrativeRole(role?: string | null) {
  return Boolean(role && ADMIN_ROLES.has(role));
}

export function getAuthenticatedLandingPath(access: LandingAccess) {
  const isAdministrative = Boolean(access.isAdmin) || isAdministrativeRole(access.role);

  if (isAdministrative) {
    return access.mfaRequired ? '/admin/login' : '/admin/dashboard';
  }

  return '/dashboard';
}

export function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login' && !pathname.startsWith('/admin/login/');
}

export function isMemberProtectedRoute(pathname: string) {
  return pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile/edit') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/verify');
}

export function isProtectedRoute(pathname: string) {
  return isAdminRoute(pathname) || isMemberProtectedRoute(pathname);
}
