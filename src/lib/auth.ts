import { cookies } from 'next/headers';
import { resolveAccess } from './auth/access';

export const authLib = {
  async getServerAccess() {
    const cookieStore = await cookies();
    return resolveAccess(cookieStore.get('sb-access-token')?.value);
  },
  async getServerUser() {
    const access = await this.getServerAccess();
    return access && !access.mfaRequired ? access.user : null;
  },
};
