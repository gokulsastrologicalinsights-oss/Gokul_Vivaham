import { UserRole } from '@/lib/auth/permissions';

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
}
