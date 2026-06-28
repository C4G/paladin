'use server';

// import { auth } from '@/lib/auth';
import webpush from 'web-push';

let vapidConfigured = false;

// Configure VAPID lazily (not at module load) so the module can be imported during
// `next build` page-data collection, where the VAPID keys are not available.
function ensureVapidDetails() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured');
  }
  webpush.setVapidDetails('mailto:test@test.com', publicKey, privateKey);
  vapidConfigured = true;
}

export async function updateVapidDetails(
  email: string,
  publicKey: string,
  privateKey: string
) {
  if (!email || !publicKey || !privateKey) {
    throw new Error('Missing required parameters');
  }
  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendNotification(
  serialsub: string,
  title: string,
  message: string,
  url: string = ''
) {
  if (!serialsub) {
    throw new Error('No subscription available');
  }

  ensureVapidDetails();

  try {
    await webpush.sendNotification(
      JSON.parse(serialsub),
      JSON.stringify({
        title: title,
        body: message,
        url: url,
        icon: '/android-chrome-192x192.png',
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
