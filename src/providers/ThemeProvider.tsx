'use client';

import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemeContext, Theme } from '@/contexts/ThemeContext';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Initial theme load on mount
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: Theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    setThemeState(initialTheme);
    setMounted(true);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // 2. Fetch user profile theme preference if logged in
    const syncUserTheme = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userTheme = session.user.user_metadata?.theme as Theme | undefined;
          if (userTheme && userTheme !== initialTheme) {
            applyTheme(userTheme, false); // Sync without updating DB again
          }
        }
      } catch (err) {
        console.error('Failed to sync initial user theme:', err);
      }
    };
    syncUserTheme();

    // 3. Listen to auth changes to sync theme on login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userTheme = session.user.user_metadata?.theme as Theme | undefined;
        if (userTheme) {
          applyTheme(userTheme, false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const applyTheme = async (newTheme: Theme, syncWithDb = true) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Update DB if user is logged in and sync is requested
    if (syncWithDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.auth.updateUser({
            data: { theme: newTheme }
          });
        }
      } catch (err) {
        console.error('Failed to sync theme with Supabase:', err);
      }
    }
  };

  const toggleTheme = () => {
    applyTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div className={mounted ? `theme-${theme}` : 'theme-light'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
