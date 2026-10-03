export interface OtpConfig {
  expirySeconds: number;
  maxAttempts: number;
}

export const DefaultOtpConfig: OtpConfig = {
  expirySeconds: 60,
  maxAttempts: 3,
};

export class OtpTracker {
  private attempts: Record<string, number> = {};
  private timers: Record<string, number> = {};

  recordAttempt(identifier: string): number {
    const count = (this.attempts[identifier] || 0) + 1;
    this.attempts[identifier] = count;
    return count;
  }

  getAttempts(identifier: string): number {
    return this.attempts[identifier] || 0;
  }

  isLocked(identifier: string, limit = 3): boolean {
    return this.getAttempts(identifier) >= limit;
  }

  reset(identifier: string) {
    delete this.attempts[identifier];
    delete this.timers[identifier];
  }
}
