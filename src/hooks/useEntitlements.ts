'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EntitlementUsage {
  plan_name: string;
  plan_key: string;
  days_remaining: number | null;
  status: 'active' | 'expired';
  start_date?: string | null;
  end_date?: string | null;
  is_lifetime?: boolean;
  manual_renewal?: boolean;
  contacts_used: number;
  contacts_remaining: number;
  contacts_limit: number;
  horoscope_used: number;
  horoscope_reserved?: number;
  horoscope_remaining: number;
  horoscope_limit: number;
  consultations_used: number;
  consultations_reserved?: number;
  consultations_remaining: number;
  consultations_limit: number;
  profile_views_today?: number;
  profile_views_remaining?: number;
  profile_views_daily_limit?: number;
  horoscope_percentage_level?: 'basic' | 'unlimited';
  messaging_enabled?: boolean;
  photo_viewing_enabled?: boolean;
  premium_badge_eligible?: boolean;
  search_enabled?: boolean;
}

const DEFAULT_USAGE: EntitlementUsage = {
  plan_name: 'Startup Plan',
  plan_key: 'STARTUP',
  days_remaining: 0,
  status: 'active',
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

  const fetchUsage = useCallback(async () => {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEntitlements(DEFAULT_USAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchUsage(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsage]);

  /** Call after spending a credit to sync UI immediately */
  const refresh = useCallback(() => {
    return fetchUsage();
  }, [fetchUsage]);

  return { entitlements, loading, error, refresh };
}
