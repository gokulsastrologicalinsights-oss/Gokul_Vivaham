export interface UserSessionData {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

export function parseCookies(cookieString: string | null | undefined): Record<string, string> {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

export function getSessionFromCookies(cookieString: string | null | undefined): string | null {
  const cookies = parseCookies(cookieString);
  return cookies['sb-access-token'] || null;
}
