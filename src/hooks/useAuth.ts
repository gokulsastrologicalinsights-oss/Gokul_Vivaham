import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    session,
    loading,
    role,
    isAuthenticated: !!user,
    logout
  };
}
