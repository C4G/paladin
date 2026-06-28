'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { consentText, termsContent } from '@/components/terms-content';
import { Separator } from '@/components/ui/separator';

interface TermsConditionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsConditionsDialog({
  isOpen,
  onClose,
}: TermsConditionsDialogProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    // Proceed with sign in
    signIn();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto p-4 sm:max-h-[85vh] sm:max-w-[650px] sm:p-6 md:max-w-[750px] lg:max-w-[850px]'>
        <DialogHeader className='pb-2 sm:pb-4'>
          <DialogTitle className='text-lg sm:text-xl'>
            Legal Disclaimer & User Agreement
          </DialogTitle>
          <DialogDescription className='text-sm'>
            Please read and accept the terms before continuing
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 pr-1 sm:space-y-4'>
          {termsContent.map((section, index) => (
            <div key={section.title} className='space-y-1 sm:space-y-1.5'>
              <h3 className='text-sm font-semibold sm:text-base'>
                {section.title}
              </h3>
              <div className='text-xs leading-relaxed sm:text-sm'>
                {section.content}
              </div>
              {index < termsContent.length - 1 && (
                <Separator className='mt-3 sm:mt-4' />
              )}
            </div>
          ))}

          <div className='flex items-start space-x-2 pb-1 pt-3 sm:pb-2 sm:pt-4'>
            <Checkbox
              id='terms'
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className='mt-0.5 dark:bg-gray-800'
            />
            <Label
              htmlFor='terms'
              className='text-xs font-medium leading-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sm:text-sm'
            >
              {consentText}
            </Label>
          </div>
        </div>

        <DialogFooter className='mt-2 flex-col gap-2 pt-2 sm:flex-row sm:gap-0 sm:pt-4'>
          <Button
            variant='outline'
            onClick={onClose}
            className='h-9 w-full text-sm sm:h-10 sm:w-auto'
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!accepted}
            className='h-9 w-full text-sm dark:bg-gray-800 sm:h-10 sm:w-auto'
          >
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
