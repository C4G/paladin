'use client';

import { Suspense } from 'react';
import DashboardPage from '@/components/DashboardPage';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function Page() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className='p-8'>Loading...</div>;
  }

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <Suspense fallback={<div className='p-8'>Loading dashboard...</div>}>
      <DashboardPage />
    </Suspense>
  );
}
