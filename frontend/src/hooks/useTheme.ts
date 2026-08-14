'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'scrapdash_theme';

// Estado compartilhado entre todas as instâncias do hook: sem isso, cada
// componente que chama useTheme() teria seu próprio estado isolado e não
// ficaria sabendo quando outro componente troca o tema.
let currentTheme: Theme = 'light';
const listeners = new Set<(theme: Theme) => void>();

function getPreferredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function setSharedTheme(theme: Theme) {
  currentTheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  listeners.forEach((listener) => listener(theme));
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const preferred = getPreferredTheme();
    currentTheme = preferred;
    applyTheme(preferred);
    setTheme(preferred);

    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setSharedTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme };
}
