import React from 'react';

interface ConfirmationDialogueProps {
  header: string;
  message: string;
  confirmText: string;
  onConfirm: () => void; // Define the type for the onConfirm function
  onCancel: () => void; // Define the type for the onCancel function
}

export function ConfirmationDialogue({
  header,
  message,
  confirmText,
  onConfirm,
  onCancel,
}: ConfirmationDialogueProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50'>
      <div className='w-[85%] max-w-sm rounded-md bg-white p-6 shadow-md md:w-full'>
        <h2 className='text-l mb-4 text-center font-semibold text-black'>
          {header}
        </h2>
        <h2 className='text-l mb-4 text-center font-medium text-black'>
          {message}
        </h2>
        <div className='flex justify-between'>
          <button
            className='rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600'
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className='rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600'
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
