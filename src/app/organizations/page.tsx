'use client';

import { Suspense } from 'react';
import OrganizationsPage from '@/components/OrganizationsPage';
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
    <Suspense fallback={<div className='p-8'>Loading organizations...</div>}>
      <OrganizationsPage />
    </Suspense>
  );
}
