'use client';

import Link from 'next/link';
import { UserMenu } from './user-menu';
import Navbar from './navbar';
import Image from 'next/image';

export function Header() {
  return (
    <header className='left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background px-4 dark:bg-gray-800 sm:px-6'>
      <div className='flex min-w-0 flex-1 items-center gap-4'>
        <Link href='/' className='flex shrink-0 items-center space-x-2 py-3'>
          <div className='relative flex h-10 w-10 shrink-0 rotate-45 items-center justify-center border-2 border-primary bg-background dark:border-primary-foreground dark:bg-gray-700'>
            <Image
              src='/logo.png'
              alt='Paladin Farm & Ranch'
              width={24}
              height={24}
              className='-rotate-45 dark:hidden'
            />
            <Image
              src='/logo-white.png'
              alt='Paladin Farm & Ranch'
              width={24}
              height={24}
              className='hidden -rotate-45 dark:block'
            />
          </div>
          <span className='font-serif text-xl font-bold text-primary dark:text-primary-foreground'>
            PALADIN
          </span>
          <span className='hidden text-sm font-medium text-foreground dark:text-gray-300 sm:inline'>
            FARM & RANCH
          </span>
        </Link>
        <Navbar />
      </div>
      <UserMenu />
    </header>
  );
}
