'use client';

import { useState, useSyncExternalStore } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditProfileDialog } from './edit-profile-dialog';
import { ThemeSwitcher } from './theme-switcher';
import { DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu';
import { LogOut, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TermsConditionsDialog } from './terms-conditions-dialog';

// Hydration-safe mounted check using useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const router = useRouter();

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted || status === 'loading') {
    return (
      <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
        <div className='h-8 w-8 animate-pulse rounded-full bg-muted' />
      </Button>
    );
  }

  if (!session) {
    return (
      <>
        <Button
          onClick={() => setIsTermsDialogOpen(true)}
          variant='default'
          className='dark:text-gray-900'
        >
          Sign In
        </Button>
        <TermsConditionsDialog
          isOpen={isTermsDialogOpen}
          onClose={() => setIsTermsDialogOpen(false)}
        />
      </>
    );
  }

  const userInitials = session.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  const handleEditProfile = () => {
    router.push('/profile');
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={session.user?.image ?? ''}
                alt={session.user?.name ?? ''}
              />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-max min-w-32 max-w-64'
          align='end'
          forceMount
        >
          <DropdownMenuItem
            className='cursor-pointer'
            onSelect={() => handleEditProfile()}
          >
            <UserCog className='h-4 w-4' />
            <span className='grow'>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <ThemeSwitcher />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='cursor-pointer'
            onSelect={() => signOut()}
          >
            <LogOut className='h-4 w-4' />
            <span className='grow'>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditProfileDialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </>
  );
}
