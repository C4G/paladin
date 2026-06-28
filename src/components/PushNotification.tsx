'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BellOff, Bell, BellRing } from 'lucide-react';
import { urlBase64ToUint8Array } from '@/lib/utils';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [isFooterNearby, setIsFooterNearby] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  async function registerServiceWorker() {
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  }

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      if (supported) {
        registerServiceWorker();
      }
    };

    checkSupport();

    // Create an Intersection Observer to detect when the footer is approaching
    const footer = document.querySelector('footer');
    if (footer && buttonRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // If the footer is intersecting with our observation area, move the button up
            setIsFooterNearby(entry.isIntersecting);
          });
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.1,
        }
      );

      // Start observing the footer
      observerRef.current.observe(footer);
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    const serializedSub = JSON.parse(JSON.stringify(sub));
    const req = {
      endpoint: serializedSub.endpoint,
      expiration: serializedSub.expirationTime || null,
      p256dh: serializedSub.keys.p256dh,
      auth: serializedSub.keys.auth,
    };

    const notificationResponse = await fetch('/api/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
    if (!notificationResponse.ok) {
      return;
    }
    setSubscription(sub);
  }

  async function unsubscribeFromPush() {
    await subscription?.unsubscribe();

    const serializedSub = JSON.parse(JSON.stringify(subscription));
    const req = {
      endpoint: serializedSub.endpoint,
    };

    await fetch('/api/notification', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    setSubscription(null);
  }

  if (!isSupported) {
    return (
      <div
        ref={buttonRef}
        className={`fixed bottom-4 left-4 z-50 transition-transform duration-200 ${
          isFooterNearby ? 'translate-y-[-3.5rem]' : ''
        }`}
      >
        <Button variant={'link'}>
          <BellOff size={24} />
          Push Notifications Not Supported
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={buttonRef}
      className={`fixed bottom-4 left-4 z-50 opacity-50 transition-all duration-200 hover:opacity-100 ${
        isFooterNearby ? 'translate-y-[-3.5rem]' : ''
      }`}
    >
      {subscription ? (
        <>
          <Button variant={'secondary'} onClick={unsubscribeFromPush}>
            <Bell size={24} />
            Unsubscribe
          </Button>
        </>
      ) : (
        <>
          <Button variant={'secondary'} onClick={subscribeToPush}>
            <BellRing size={24} />
            Subscribe
          </Button>
        </>
      )}
    </div>
  );
}
