'use client';

import { Sun, Moon } from 'lucide-react';
import useTheme from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full border border-border bg-card text-foreground hover:bg-surface transition-all duration-200 cursor-pointer flex items-center justify-center shadow-sm"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      ) : (
        <Sun className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      )}
    </button>
  );
}
