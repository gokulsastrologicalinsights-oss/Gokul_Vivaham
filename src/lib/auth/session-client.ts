let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}
export function syncServerSession(token: string) {
  return serialize(async () => {
    const response = await fetch('/api/auth/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Your session could not be verified. Please sign in again.');
    return response.json() as Promise<{ role: string; isAdmin: boolean; mfa_required: boolean }>;
  });
}
export function clearServerSession() {
  return serialize(async () => {
    const response = await fetch('/api/auth/session', { method: 'DELETE' });
    if (!response.ok) throw new Error('Sign-out failed. Please try again.');
  });
}
