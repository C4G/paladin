'use client';

import { useTheme } from 'next-themes';

export function useIsDarkTheme() {
  const { theme, systemTheme } = useTheme();
  return theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
}
