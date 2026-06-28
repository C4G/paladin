'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const tabs = [
  { name: 'Team', href: '/team' },
  { name: 'Project Description', href: '/team/project-description' },
  { name: 'Project Goals', href: '/team/project-goal' },
  { name: 'Lighthouse Report', href: '/team/lighthouse-report' },
  { name: 'Presentation Slides', href: '/team/presentation-slides' },
  { name: 'Weekly Updates', href: '/team/weekly-updates' },
  { name: 'Project Peer Evaluations', href: '/team/peer-evaluations' },
  { name: 'Demo', href: '/team/demo' },
];

export function TeamTabs() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTab = tabs.find((t) => t.href === pathname);

  return (
    <>
      {/* Mobile toggle */}
      <div className='flex flex-col gap-1 md:hidden'>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className='flex w-full items-center justify-between rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium'
        >
          <span>{currentTab?.name ?? 'Navigate'}</span>
          {mobileOpen ? (
            <X className='h-4 w-4' />
          ) : (
            <Menu className='h-4 w-4' />
          )}
        </button>
        {mobileOpen && (
          <nav className='rounded-md border border-border bg-muted/50 p-1'>
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  pathname === tab.href
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Desktop sidebar */}
      <nav className='hidden rounded-lg bg-muted/40 p-2 md:block'>
        <ul className='flex flex-col gap-1'>
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  pathname === tab.href
                    ? 'bg-background font-semibold text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {tab.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
