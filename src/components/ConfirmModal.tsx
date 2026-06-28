'use client';

import { Button } from '@/components/ui/button';

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-80 rounded-lg border border-border bg-background p-6 shadow-lg'>
        <p className='mb-4 text-foreground'>{message}</p>
        <div className='flex justify-end gap-2'>
          <Button
            onClick={onCancel}
            className='bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className='bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
