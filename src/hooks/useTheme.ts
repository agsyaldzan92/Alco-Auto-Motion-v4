import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'alco_theme_preference';

/**
 * Foundation Theme Hook for ALCO Auto Motion V4
 * Manages Light, Dark, System preferences with defensive localStorage access
 * and listener cleanup for system prefers-color-scheme changes.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to read theme preference from localStorage:', e);
    }
    return 'dark'; // Default preference for professional desktop video editor
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let activeTheme: 'light' | 'dark' = 'dark';
      if (theme === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        activeTheme = theme;
      }

      setResolvedTheme(activeTheme);

      if (activeTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        const activeTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(activeTheme);
        if (activeTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', listener);
        } else {
          mediaQuery.removeListener(listener);
        }
      };
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme preference to localStorage:', e);
    }
  };

  return { theme, setTheme, resolvedTheme };
}
