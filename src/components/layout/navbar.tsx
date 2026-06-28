'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Plus,
  LayoutDashboard,
  Users,
  ShieldAlert,
  Mail,
  BookOpen,
  Code,
  Network,
  ChevronDown,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { AppInfo } from './app-info';

interface Route {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

/* Main navigation links */
const mainRoutes: Route[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className='h-4 w-4' />,
    requireAuth: true,
  },
  {
    path: '/organizations',
    label: 'Orgs',
    icon: <Network className='h-4 w-4' />,
    requireAuth: true,
  },
  {
    path: '/users',
    label: 'Users',
    icon: <Users className='h-4 w-4' />,
    requireAuth: true,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    path: '/contact-us',
    label: 'Contact Us',
    icon: <Mail className='h-4 w-4' />,
    requireAuth: false,
  },
];

const resourceLinks = [
  {
    path: '/disaster-resources',
    label: 'Disaster Resources',
    icon: <ShieldAlert className='h-4 w-4' />,
  },
  {
    path: '/docs',
    label: 'User Manual',
    icon: <BookOpen className='h-4 w-4' />,
  },
  {
    path: '/dev-docs',
    label: 'Developer Docs',
    icon: <Code className='h-4 w-4' />,
  },
];

const NavItem = ({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-gray-900'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:border dark:border-border'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
};

function ResourcesDropdown({ closeMenu }: { closeMenu: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive =
    pathname.startsWith('/disaster-resources') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/dev-docs');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-gray-900'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:border dark:border-border'
        }`}
      >
        <BookOpen className='h-4 w-4' />
        Resources
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className='absolute left-0 top-full z-50 mt-1 w-48 rounded-md border bg-background py-1 shadow-lg dark:bg-gray-800'>
          {resourceLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => {
                setOpen(false);
                closeMenu();
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                pathname.startsWith(link.path)
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileResourceLinks({ closeMenu }: { closeMenu: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {resourceLinks.map((link) => (
        <Link
          key={link.path}
          href={link.path}
          onClick={closeMenu}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            pathname.startsWith(link.path)
              ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-gray-900'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:border dark:border-border'
          }`}
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
    </>
  );
}

function getMainNavItems(
  authenticationStatus: string,
  userRole: string | null | undefined,
  closeMenu: () => void
) {
  return (
    <>
      {mainRoutes.map((route) => {
        const userAuthorized =
          route.requireAuth === false ||
          (route.requireAuth === true &&
            authenticationStatus === 'authenticated');
        const userRoleAllowed =
          !route.allowedRoles ||
          route.allowedRoles?.includes(userRole as UserRole);

        if (userAuthorized && userRoleAllowed) {
          return (
            <NavItem
              key={route.path}
              href={route.path}
              icon={route.icon}
              onClick={closeMenu}
            >
              {route.label}
            </NavItem>
          );
        } else {
          return null;
        }
      })}
    </>
  );
}

export default function Navbar() {
  const { data, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        closeMenu();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen, closeMenu]);

  // Detect overflow: the desktop nav is always rendered (hidden when collapsed)
  // so we can compare its intrinsic scrollWidth against the outer container's clientWidth
  useEffect(() => {
    const check = () => {
      const desktop = desktopRef.current;
      const container = navRef.current;
      if (!desktop || !container) return;
      setCollapsed(desktop.scrollWidth > container.clientWidth);
    };

    check();
    window.addEventListener('resize', check);

    const observer = new ResizeObserver(check);
    if (navRef.current) observer.observe(navRef.current);

    return () => {
      window.removeEventListener('resize', check);
      observer.disconnect();
    };
  }, [status, data?.user?.role]);

  const showCreateRequest = status === 'authenticated';

  return (
    <div ref={navRef} className='relative min-w-0 flex-1'>
      {/* Desktop nav — always rendered for measurement; visually hidden when collapsed */}
      <div
        ref={desktopRef}
        aria-hidden={collapsed}
        className={`flex flex-nowrap items-center gap-1 whitespace-nowrap ${
          collapsed ? 'pointer-events-none invisible absolute left-0 top-0' : ''
        }`}
      >
        {getMainNavItems(status, data?.user?.role, closeMenu)}
        <ResourcesDropdown closeMenu={closeMenu} />

        {showCreateRequest && (
          <>
            <div className='mx-1.5 h-5 w-px bg-border' />
            <Link
              href='/dashboard?newRequest=true'
              onClick={closeMenu}
              className='inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/30'
            >
              <Plus className='h-4 w-4' />
              New Request
            </Link>
          </>
        )}
      </div>

      {/* Hamburger button — visible only when collapsed */}
      {collapsed && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className='inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white'
          aria-expanded={isOpen}
        >
          <span className='sr-only'>Open main menu</span>
          {isOpen ? (
            <X className='block h-6 w-6' aria-hidden='true' />
          ) : (
            <Menu className='block h-6 w-6' aria-hidden='true' />
          )}
        </button>
      )}

      {/* Mobile menu dropdown */}
      <div
        className={`fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed && isOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-full opacity-0'
        }`}
      >
        <div className='flex flex-col gap-1 overflow-x-hidden bg-background px-2 pb-3 pt-2 shadow-lg dark:bg-gray-800 sm:px-3'>
          {showCreateRequest && (
            <Link
              href='/dashboard?newRequest=true'
              onClick={closeMenu}
              className='inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/30'
            >
              <Plus className='h-4 w-4' />
              New Request
            </Link>
          )}

          {getMainNavItems(status, data?.user?.role, closeMenu)}
          <MobileResourceLinks closeMenu={closeMenu} />

          <div className='mt-4 border-t border-gray-200 pt-4 dark:border-gray-700'>
            <AppInfo onLinkClick={closeMenu} isMobile={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
