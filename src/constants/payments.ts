/**
 * Unified subscription plans and pricing constants for Gokul Vivaham Matrimony.
 * Plan IDs correspond directly to the seed records in public.subscription_plans.
 */

export const CURRENCY = 'INR';
export const GST_RATE_PERCENTAGE = 18;

export const FEATURED_PROFILE_PRICES = {
  DAYS_15: 799,
  DAYS_30: 1499,
};

export const CONSULTATION_ORIGINAL_PRICE = 1499;
export const CONSULTATION_PLATFORM_DISCOUNT = 300;
export const CONSULTATION_PRICE = 1199; // Base discounted price (excluding GST)

export interface SubscriptionPlanDef {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  role: string;
  /** Per-subscription-period entitlement limits */
  entitlements: {
    contacts_limit: number;
    horoscope_reports_limit: number;
    consultations_limit: number;
  };
  features: {
    chat_access: boolean;
    contact_viewing: boolean;
    interests_daily: number;
    advanced_filters: boolean;
    priority_support: boolean;
    profile_boosting: boolean;
    profile_views_daily: number;
    horoscope_compatibility: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanDef> = {
  FREE: {
    id: '0ffd3070-7aba-4554-8790-93c76b318df6',
    name: 'Startup Plan',
    price: 0,
    durationDays: 3650,
    role: 'user',
    entitlements: {
      contacts_limit: 0,
      horoscope_reports_limit: 0,
      consultations_limit: 0,
    },
    features: {
      chat_access: false,
      contact_viewing: false,
      interests_daily: 0,
      advanced_filters: false,
      priority_support: false,
      profile_boosting: false,
      profile_views_daily: 5,
      horoscope_compatibility: false,
    },
  },
  SILVER: {
    id: '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf',
    name: 'Silver Plan',
    price: 1499,
    durationDays: 30,
    role: 'silver',
    entitlements: {
      contacts_limit: 15,
      horoscope_reports_limit: 1,
      consultations_limit: 0,
    },
    features: {
      chat_access: true,
      contact_viewing: true,
      interests_daily: 20,
      advanced_filters: true,
      priority_support: false,
      profile_boosting: false,
      profile_views_daily: 50,
      horoscope_compatibility: true,
    },
  },
  GOLD: {
    id: 'd50e37d5-21df-454b-8ed8-0e7ddb33827c',
    name: 'Gold Plan',
    price: 2999,
    durationDays: 90,
    role: 'gold',
    entitlements: {
      contacts_limit: 30,
      horoscope_reports_limit: 5,
      consultations_limit: 1,
    },
    features: {
      chat_access: true,
      contact_viewing: true,
      interests_daily: 50,
      advanced_filters: true,
      priority_support: false,
      profile_boosting: false,
      profile_views_daily: 150,
      horoscope_compatibility: true,
    },
  },
  DIAMOND: {
    id: 'b987dc02-0102-4279-b787-50987762532b',
    name: 'Diamond Plan',
    price: 5999,
    durationDays: 180,
    role: 'diamond',
    entitlements: {
      contacts_limit: 60,
      horoscope_reports_limit: 10,
      consultations_limit: 5,
    },
    features: {
      chat_access: true,
      contact_viewing: true,
      interests_daily: 1000,
      advanced_filters: true,
      priority_support: true,
      profile_boosting: true,
      profile_views_daily: 1000,
      horoscope_compatibility: true,
    },
  },
};
