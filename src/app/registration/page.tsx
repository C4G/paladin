'use client';

import { Suspense } from 'react';
import RegistrationPage from '@/components/RegistrationPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationPage />
    </Suspense>
  );
}
