import React from 'react';

interface CloseRequestConfirmationProps {
  onConfirm: () => void; // Define the type for the onConfirm function
  onCancel: () => void; // Define the type for the onCancel function
}

export default function CloseRequestConfirmation({
  onConfirm,
  onCancel,
}: CloseRequestConfirmationProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50'>
      <div className='w-full max-w-sm rounded-md bg-white p-6 shadow-md'>
        <h2 className='text-l mb-4 text-center font-medium text-black'>
          Closing this request will notify all respondents assistance is no
          longer required.
        </h2>
        <h2 className='text-l mb-4 text-center font-semibold text-black'>
          {' '}
          Are you sure you want to close this request?{' '}
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
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
