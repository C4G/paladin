'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CURRENCY = 'USD';

interface DonateDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
}

function PayPalSubscribeButtons({ onSuccess }: { onSuccess?: () => void }) {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscription = useCallback(async (_data: any, actions: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
      if (!planId) {
        const message =
          'Recurring donations are not configured. Missing NEXT_PUBLIC_PAYPAL_PLAN_ID.';
        setError(message);
        throw new Error(message);
      }

      const id = await actions.subscription.create({
        plan_id: planId,
      });
      return id;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Something went wrong starting the payment.';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onApprove = useCallback(
    async (data: any, _actions: any) => {
      setError(null);
      try {
        const subscriptionId = data?.subscriptionID as string | undefined;
        if (subscriptionId) {
          await fetch('/api/paypal/subscriptions/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId }),
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('paypal-subscription-activated'));
          }
        }

        setIsComplete(true);
        onSuccess?.();
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Something went wrong completing the payment.';
        setError(message);
        throw e;
      }
    },
    [onSuccess]
  );

  if (isComplete) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='rounded-xl border border-green-200 bg-green-50/80 p-6 text-center dark:border-green-800 dark:bg-green-950/40'>
          <p className='text-lg font-semibold text-green-800 dark:text-green-200'>
            Thank you for your donation!
          </p>
          <p className='mt-2 text-sm text-green-700 dark:text-green-300'>
            Your support helps us transform lives and landscapes.
          </p>
        </div>
        <p className='text-center text-xs text-muted-foreground'>
          You can close this window whenever you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div className='w-full space-y-3'>
      {error && (
        <div className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {error}
        </div>
      )}
      {isLoading && (
        <p className='text-center text-sm text-muted-foreground'>
          Preparing secure checkout…
        </p>
      )}
      <PayPalButtons
        fundingSource='paypal'
        style={{
          layout: 'vertical',
          label: 'donate',
          shape: 'rect',
          color: 'gold',
          height: 44,
        }}
        createSubscription={createSubscription}
        onApprove={onApprove}
        onError={(err) => {
          console.error('PayPal error:', err);
          setError('PayPal could not start the checkout. Please try again.');
        }}
      />
    </div>
  );
}

export function DonateDialog({ open, onOpenChange }: DonateDialogProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
  const paypalOptions: ReactPayPalScriptOptions = {
    'client-id': clientId || '',
    clientId: clientId || '',
    currency: CURRENCY,
    intent: 'subscription',
    vault: true,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden sm:max-w-[420px]'>
        <DialogHeader className='space-y-2 pb-2'>
          <DialogTitle className='text-xl'>
            Support Paladin Farm & Ranch
          </DialogTitle>
          <DialogDescription className='text-left'>
            Support us with a suggested $10/month. Every contribution helps us
            transform lives and landscapes.
          </DialogDescription>
        </DialogHeader>

        <div className='my-4 rounded-xl border bg-muted/40 p-4'>
          <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            Suggested donation
          </p>
          <p className='text-2xl font-semibold text-foreground'>
            $10
            <span className='text-sm font-normal text-muted-foreground'>
              /month
            </span>
          </p>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-medium text-foreground'>
            Pay with PayPal Donate (Monthly)
          </p>
          {clientId && planId ? (
            <PayPalScriptProvider options={paypalOptions}>
              <PayPalSubscribeButtons
                onSuccess={() => {
                  // User sees thank-you state; they can close when ready
                }}
              />
            </PayPalScriptProvider>
          ) : (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'>
              <p>
                We’re currently unable to process PayPal donations in the app.
              </p>
              <p className='mt-1 text-xs'>
                Please use the QR code below to complete your donation instead.
              </p>
            </div>
          )}
        </div>

        <div className='mt-6 flex flex-col items-center gap-2 border-t pt-4'>
          <Image
            alt='Paladin Farm & Ranch'
            src='/qr_code.png'
            width={100}
            height={100}
            className='opacity-80'
            style={{ objectFit: 'contain' }}
          />
          <span className='text-xs text-muted-foreground'>
            Scan to donate from your phone
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
