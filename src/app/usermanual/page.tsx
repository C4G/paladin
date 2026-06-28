'use client';

import { Suspense } from 'react';
import UserManualPage from '@/components/UserManualPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserManualPage />
    </Suspense>
  );
}
