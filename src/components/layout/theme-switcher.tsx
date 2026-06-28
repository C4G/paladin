'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  const { setTheme, theme, systemTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(
      theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
        ? 'light'
        : 'dark'
    );
  };

  return (
    <div
      onClick={toggleTheme}
      className='relative flex grow cursor-pointer select-none items-center rounded-sm text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
    >
      <Sun className='mr-2 h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
      <Moon className='absolute mr-2 h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
      <span className='grow'>
        {theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
          ? 'Dark'
          : 'Light'}{' '}
        Mode
      </span>
    </div>
  );
}
