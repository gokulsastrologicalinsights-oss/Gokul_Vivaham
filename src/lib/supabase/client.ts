import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const missingConfiguration = supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder');
const isMock = missingConfiguration && process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';
if (missingConfiguration && !isMock) {
  throw new Error('Supabase configuration is required. Set the project URL and publishable key in .env.local.');
}

const realSupabase = createClient(supabaseUrl, supabaseKey);

// Setup Mock Auth state
let currentSession: any = null;
let listeners: Array<(event: string, session: any) => void> = [];

const generateMockJwt = (user: any) => {
  const safeBtoa = (str: string) => {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(str);
    }
    return Buffer.from(str).toString('base64');
  };
  const header = safeBtoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = safeBtoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    role: user.user_metadata?.role || 'user'
  }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
};

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('gokul_mock_session');
    if (saved) {
      currentSession = JSON.parse(saved);
    }
  } catch (e) {}
}

const notifyListeners = (event: string, session: any) => {
  listeners.forEach((l) => {
    try {
      l(event, session);
    } catch (e) {}
  });
};

const setSession = (session: any) => {
  currentSession = session;
  if (typeof window !== 'undefined') {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    if (session) {
      localStorage.setItem('gokul_mock_session', JSON.stringify(session));
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`;
    } else {
      localStorage.removeItem('gokul_mock_session');
      document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    }
  }
  notifyListeners(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
};

const mockAuth = {
  signUp: async ({ email, password, options }: any) => {
    const mockId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
    const user = {
      id: mockId,
      email,
      user_metadata: options?.data || { role: 'user', full_name: 'Mock User' }
    };
    const session = {
      access_token: generateMockJwt(user),
      user
    };
    if (typeof window !== 'undefined') {
      try {
        const users = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
        if (!users.some((u: any) => u.email === email)) {
          users.push({ ...user, password });
          localStorage.setItem('gokul_mock_users', JSON.stringify(users));
        }
      } catch (e) {}
    }
    setSession(session);
    return { data: { user, session }, error: null };
  },

  signInWithPassword: async ({ email, password }: any) => {
    if (typeof window !== 'undefined') {
      try {
        const users = JSON.parse(localStorage.getItem('gokul_mock_users') || '[]');
        const found = users.find((u: any) => u.email === email);
        if (found) {
          if (found.password === password) {
            const session = {
              access_token: generateMockJwt(found),
              user: { id: found.id, email: found.email, user_metadata: found.user_metadata }
            };
            setSession(session);
            return { data: { user: session.user, session }, error: null };
          } else {
            return { data: null, error: new Error('Invalid password') };
          }
        }
      } catch (e) {}
    }

    return { data: null, error: new Error('User not found. Try registering first.') };
  },

  signInWithOtp: async ({ phone }: any) => {
    return { data: { message: 'Demo OTP sent' }, error: null };
  },

  resend: async ({ type, email }: any) => {
    return { data: { message: `Demo ${type} verification email sent to ${email}` }, error: null };
  },

  updateUser: async ({ phone }: any) => {
    if (currentSession?.user) currentSession.user.phone = phone;
    return { data: { user: currentSession?.user || null }, error: null };
  },

  verifyOtp: async (params: any) => {
    const token = params.token;
    if (token === '1234' || token === '123456') {
      const user = {
        id: 'mock-user-id',
        email: params.email || 'user@example.com',
        user_metadata: { role: 'user', full_name: 'Mock User' }
      };
      const session = {
        access_token: generateMockJwt(user),
        user
      };
      setSession(session);
      return { data: { user: session.user, session }, error: null };
    }
    return { data: null, error: new Error('Invalid OTP') };
  },

  signInWithOAuth: async ({ provider }: any) => {
    const user = {
      id: 'demo-oauth-id',
      email: 'oauth@gokul.com',
      user_metadata: { role: 'user', full_name: 'OAuth User' }
    };
    const session = {
      access_token: generateMockJwt(user),
      user
    };
    setSession(session);
    return { data: { url: '/dashboard' }, error: null };
  },

  signOut: async () => {
    setSession(null);
    return { error: null };
  },

  getSession: async () => {
    return { data: { session: currentSession }, error: null };
  },

  getUser: async () => {
    return { data: { user: currentSession?.user || null }, error: null };
  },

  onAuthStateChange: (callback: any) => {
    listeners.push(callback);
    try {
      callback('INITIAL_SESSION', currentSession);
    } catch (e) {}
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners = listeners.filter((l) => l !== callback);
          }
        }
      }
    };
  }
};

const getServerMockStore = () => {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any).gokul_mock_db) {
      (globalThis as any).gokul_mock_db = {};
    }
    return (globalThis as any).gokul_mock_db;
  }
  return {};
};

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private eqFilters: Record<string, any> = {};
  private isSingle = false;
  private isMaybeSingle = false;
  private limitCount = 0;
  private insertData: any = null;
  private updateData: any = null;
  private doDelete = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getStorageKey() {
    return `gokul_mock_${this.tableName}`;
  }

  private getData() {
    if (typeof window === 'undefined') {
      const store = getServerMockStore();
      const key = this.getStorageKey();
      if (!store[key]) {
        if (this.tableName === 'subscription_plans') {
          store[key] = [
            {
              id: '0ffd3070-7aba-4554-8790-93c76b318df6',
              name: 'Startup Plan',
              price: 0,
              duration_days: 3650,
              features: { chat_access: false, contact_viewing: false }
            },
            {
              id: '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf',
              name: 'Silver Plan',
              price: 1499,
              duration_days: 30,
              features: { chat_access: true, contact_viewing: true }
            },
            {
              id: 'd50e37d5-21df-454b-8ed8-0e7ddb33827c',
              name: 'Gold Plan',
              price: 2999,
              duration_days: 90,
              features: { chat_access: true, contact_viewing: true }
            },
            {
              id: 'b987dc02-0102-4279-b787-50987762532b',
              name: 'Diamond Plan',
              price: 5999,
              duration_days: 180,
              features: { chat_access: true, contact_viewing: true }
            }
          ];
        } else if (this.tableName === 'admin_users') {
          store[key] = [{
            id: 'admin-user-id',
            auth_user_id: 'demo-admin-id',
            full_name: 'Gokul Admin',
            email: 'admin@gokul.com',
            role: 'admin'
          }];
        } else {
          store[key] = [];
        }
      }
      return store[key];
    }

    try {
      const data = localStorage.getItem(this.getStorageKey());
      if (data) return JSON.parse(data);
    } catch (e) {}

    // Seed defaults
    if (this.tableName === 'subscription_plans') {
      const defaultPlans = [
        {
          id: '0ffd3070-7aba-4554-8790-93c76b318df6',
          name: 'Startup Plan',
          price: 0,
          duration_days: 3650,
          features: { chat_access: false, contact_viewing: false }
        },
        {
          id: '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf',
          name: 'Silver Plan',
          price: 1499,
          duration_days: 30,
          features: { chat_access: true, contact_viewing: true }
        },
        {
          id: 'd50e37d5-21df-454b-8ed8-0e7ddb33827c',
          name: 'Gold Plan',
          price: 2999,
          duration_days: 90,
          features: { chat_access: true, contact_viewing: true }
        },
        {
          id: 'b987dc02-0102-4279-b787-50987762532b',
          name: 'Diamond Plan',
          price: 5999,
          duration_days: 180,
          features: { chat_access: true, contact_viewing: true }
        }
      ];
      try {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(defaultPlans));
      } catch (e) {}
      return defaultPlans;
    }

    if (this.tableName === 'admin_users') {
      return [{
        id: 'admin-user-id',
        auth_user_id: 'demo-admin-id',
        full_name: 'Gokul Admin',
        email: 'admin@gokul.com',
        role: 'admin'
      }];
    }
    return [];
  }

  private saveData(data: any) {
    if (typeof window === 'undefined') {
      const store = getServerMockStore();
      store[this.getStorageKey()] = data;
      return;
    }
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch (e) {}
  }

  select(columns?: string, options?: any) {
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.doDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.eqFilters[column] = value;
    this.filters.push((item: any) => item[column] === value);
    return this;
  }

  or(expr: string) {
    const parts = expr.split(',');
    this.filters.push((item: any) => {
      return parts.some(part => {
        const subparts = part.trim().split('.');
        const col = subparts[0];
        const op = subparts[1];
        const val = subparts[2];
        if (op === 'eq') {
          return item[col] === val;
        }
        return false;
      });
    });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((item: any) => values.includes(item[column]));
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((item: any) => item[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((item: any) => item[column] <= value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this.filters.push((item: any) => regex.test(item[column]));
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  limit(value: number) {
    this.limitCount = value;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (e) {
      if (onrejected) return onrejected(e);
      throw e;
    }
  }

  private async execute() {
    let items = this.getData();

    if (this.insertData) {
      const dataArray = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      
      // Enforce unique constraints in Mock mode
      if (this.tableName === 'users') {
        const authUserIds = dataArray.map(d => d.auth_user_id).filter(Boolean);
        const emails = dataArray.map(d => d.email?.toLowerCase()).filter(Boolean);
        items = items.filter((item: any) => 
          !authUserIds.includes(item.auth_user_id) && 
          !emails.includes(item.email?.toLowerCase())
        );
      } else if (this.tableName === 'profiles') {
        const userIds = dataArray.map(d => d.user_id).filter(Boolean);
        items = items.filter((item: any) => !userIds.includes(item.user_id));
      } else if (this.tableName === 'partner_preferences') {
        const userIds = dataArray.map(d => d.user_id).filter(Boolean);
        items = items.filter((item: any) => !userIds.includes(item.user_id));
      }

      const inserted = dataArray.map(d => ({
        id: d.id || Math.random().toString(36).substr(2, 11),
        created_at: new Date().toISOString(),
        ...d
      }));
      items.push(...inserted);
      this.saveData(items);
      return { data: Array.isArray(this.insertData) ? inserted : inserted[0], error: null };
    }

    if (this.updateData) {
      items = items.map((item: any) => {
        const matches = this.filters.every((f: any) => f(item));
        if (matches) {
          return { ...item, ...this.updateData };
        }
        return item;
      });
      this.saveData(items);
      const updated = items.filter((item: any) => this.filters.every((f: any) => f(item)));
      return { data: this.isSingle || this.isMaybeSingle ? updated[0] || null : updated, error: null };
    }

    if (this.doDelete) {
      const remaining = items.filter((item: any) => !this.filters.every((f: any) => f(item)));
      this.saveData(remaining);
      return { data: null, error: null };
    }

    let filtered = items.filter((item: any) => this.filters.every((f: any) => f(item)));

    // Dynamic user lookup for mock mode
    if (this.tableName === 'users' && filtered.length === 0) {
      const authUserId = this.eqFilters['auth_user_id'];
      if (authUserId) {
        const mockUser = {
          id: authUserId,
          auth_user_id: authUserId,
          email: this.eqFilters['email'] || 'user@example.com',
          role: 'user',
          status: 'active'
        };
        items.push(mockUser);
        this.saveData(items);
        filtered = [mockUser];
      }
    }

    // Handle relationship joins in mock mode
    if (this.tableName === 'subscriptions') {
      const plans = typeof window === 'undefined'
        ? (getServerMockStore()['gokul_mock_subscription_plans'] || [])
        : (() => {
            try {
              return JSON.parse(localStorage.getItem('gokul_mock_subscription_plans') || '[]');
            } catch (e) { return []; }
          })();
      filtered = filtered.map((item: any) => {
        const plan = plans.find((p: any) => p.id === item.plan_id) || null;
        return { ...item, plan };
      });
    }

    if (this.tableName === 'transactions') {
      const payments = typeof window === 'undefined'
        ? (getServerMockStore()['gokul_mock_payments'] || [])
        : (() => {
            try {
              return JSON.parse(localStorage.getItem('gokul_mock_payments') || '[]');
            } catch (e) { return []; }
          })();
      filtered = filtered.map((item: any) => {
        const payment = payments.find((p: any) => p.id === item.payment_id) || null;
        return { ...item, payment };
      });
    }

    if (this.limitCount > 0) {
      filtered = filtered.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { message: 'Row not found' } };
      }
      return { data: filtered[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: filtered[0] || null, error: null };
    }

    return { data: filtered, error: null };
  }
}

export const supabase = isMock
  ? new Proxy(realSupabase, {
      get(target, prop) {
        if (prop === 'auth') {
          return mockAuth;
        }
        if (prop === 'from') {
          return (tableName: string) => new MockQueryBuilder(tableName);
        }
        if (prop === 'rpc') {
          return async (fnName: string, args: any) => {
            if (fnName === 'increment_coupon_uses') {
              const couponId = args.coupon_row_id;
              try {
                if (typeof window !== 'undefined') {
                  const coupons = JSON.parse(localStorage.getItem('gokul_mock_coupons') || '[]');
                  const updated = coupons.map((c: any) => {
                    if (c.id === couponId) {
                      return { ...c, uses_count: (c.uses_count || 0) + 1 };
                    }
                    return c;
                  });
                  localStorage.setItem('gokul_mock_coupons', JSON.stringify(updated));
                } else {
                  const store = getServerMockStore();
                  const coupons = store['gokul_mock_coupons'] || [];
                  const updated = coupons.map((c: any) => {
                    if (c.id === couponId) {
                      return { ...c, uses_count: (c.uses_count || 0) + 1 };
                    }
                    return c;
                  });
                  store['gokul_mock_coupons'] = updated;
                }
                return { data: null, error: null };
              } catch (e) {
                return { data: null, error: e };
              }
            }
            return { data: null, error: null };
          };
        }
        return (target as any)[prop];
      }
    })
  : realSupabase;
