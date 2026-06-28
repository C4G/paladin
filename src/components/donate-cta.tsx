'use client';

import { useState } from 'react';
import { DonateDialog } from '@/components/donate-dialog';

export function DonateCTA() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <p className='mb-4 text-gray-600 dark:text-gray-300'>
        Make a donation via PayPal:
      </p>
      <div className='flex flex-col items-center gap-4'>
        <button
          type='button'
          onClick={() => setDialogOpen(true)}
          className='inline-flex items-center justify-center rounded-md bg-[#0070ba] px-6 py-3 font-medium text-white transition-colors hover:bg-[#005ea6] focus:outline-none focus:ring-2 focus:ring-[#0070ba] focus:ring-offset-2 dark:bg-[#0070ba] dark:hover:bg-[#005ea6]'
          aria-label='Open PayPal donation'
        >
          Donate with PayPal
        </button>
      </div>
      <DonateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
