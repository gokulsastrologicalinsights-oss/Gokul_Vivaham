const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * The application stores contact numbers in E.164-style format. Formatting
 * characters are accepted in the UI, but the value sent to the API is
 * normalized before it is persisted or sent to an external service.
 */
export function normalizeVerificationPhone(value: string): string {
  const normalized = value.trim().replace(/[\s()-]/g, '');

  if (!PHONE_PATTERN.test(normalized)) {
    throw new Error('Enter a valid phone number with country code, for example +91 9876543210.');
  }

  return normalized;
}

/** Accept legacy Indian numbers that were stored without +91, while keeping
 * all newly submitted values in the same normalized format. */
export function normalizeStoredVerificationPhone(value: string | null | undefined): string | null {
  const raw = value?.trim() || '';
  if (!raw) return null;

  try {
    return normalizeVerificationPhone(raw);
  } catch {
    const digits = raw.replace(/\D/g, '');
    return /^\d{10}$/.test(digits) ? `+91${digits}` : null;
  }
}

export function isVerificationPhone(value: string): boolean {
  try {
    normalizeVerificationPhone(value);
    return true;
  } catch {
    return false;
  }
}
