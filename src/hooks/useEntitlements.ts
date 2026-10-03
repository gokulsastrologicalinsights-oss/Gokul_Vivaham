'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EntitlementUsage {
  plan_name: string;
  plan_key: string;
  days_remaining: number;
  contacts_used: number;
  contacts_remaining: number;
  contacts_limit: number;
  horoscope_used: number;
  horoscope_remaining: number;
  horoscope_limit: number;
  consultations_used: number;
  consultations_remaining: number;
  consultations_limit: number;
}

const DEFAULT_USAGE: EntitlementUsage = {
  plan_name: 'Startup Plan',
  plan_key: 'FREE',
  days_remaining: 0,
  contacts_used: 0,
  contacts_remaining: 0,
  contacts_limit: 0,
  horoscope_used: 0,
  horoscope_remaining: 0,
  horoscope_limit: 0,
  consultations_used: 0,
  consultations_remaining: 0,
  consultations_limit: 0,
};

/**
 * useEntitlements
 *
 * Fetches the authenticated user's live credit usage from /api/entitlements/usage.
 * Provides a refresh() function so components can re-fetch after a credit is spent.
 */
export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<EntitlementUsage>(DEFAULT_USAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_usage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/entitlements/usage', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load entitlements');
      }
      const data: EntitlementUsage = await res.json();
      setEntitlements(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setEntitlements(DEFAULT_USAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_usage();
  }, [fetch_usage]);

  /** Call after spending a credit to sync UI immediately */
  const refresh = useCallback(() => {
    fetch_usage();
  }, [fetch_usage]);

  return { entitlements, loading, error, refresh };
}
