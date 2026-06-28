import { prisma } from '@/lib/prisma';

const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

type VerifyResult = {
  allowed: boolean;
  status?: string;
  source: 'paypal' | 'none' | 'error';
};

/** Admins and staff bypass PayPal subscription checks for creating requests. */
export function isPaypalSubscriptionExempt(
  role: string | null | undefined
): boolean {
  return role === 'ADMIN' || role === 'STAFF';
}

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) return null;

  const authValue = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authValue}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

export async function verifyAndSyncUserSubscription(
  userId: string
): Promise<VerifyResult> {
  const rows = (await prisma.$queryRawUnsafe(
    'SELECT "subscription", "paypalSubscriptionId" FROM "User" WHERE "id" = $1 LIMIT 1',
    userId
  )) as Array<{ subscription: boolean; paypalSubscriptionId: string | null }>;
  const user = rows[0];

  if (!user) return { allowed: false, source: 'none' };

  if (!user.paypalSubscriptionId) {
    return { allowed: false, source: 'none' };
  }

  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return { allowed: false, source: 'error' };
  }

  const subRes = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${user.paypalSubscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!subRes.ok) {
    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET "subscription" = false, "updatedAt" = NOW() WHERE "id" = $1',
      userId
    );
    return { allowed: false, source: 'error' };
  }

  const payload = (await subRes.json()) as { status?: string; id?: string };
  const status = payload.status || '';
  const isActive = status === 'ACTIVE' || status === 'APPROVED';

  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET "subscription" = $1, "paypalSubscriptionId" = $2, "updatedAt" = NOW() WHERE "id" = $3',
    isActive,
    payload.id || user.paypalSubscriptionId,
    userId
  );

  return { allowed: isActive, status, source: 'paypal' };
}

export async function verifyAndStoreSubscriptionId(
  userId: string,
  subscriptionId: string
): Promise<{ verified: boolean; status?: string; sessionOnly?: boolean }> {
  const accessToken = await getPayPalAccessToken();

  if (!accessToken) {
    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET "paypalSubscriptionId" = $1, "updatedAt" = NOW() WHERE "id" = $2',
      subscriptionId,
      userId
    );
    return { verified: false, sessionOnly: true };
  }

  const subRes = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!subRes.ok) {
    const details = await subRes.text();
    throw new Error(details || 'Subscription verification failed');
  }

  const data = (await subRes.json()) as { status?: string; id?: string };
  const status = data.status || '';
  const isActive = status === 'ACTIVE' || status === 'APPROVED';

  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET "subscription" = $1, "paypalSubscriptionId" = $2, "updatedAt" = NOW() WHERE "id" = $3',
    isActive,
    data.id || subscriptionId,
    userId
  );

  return { verified: isActive, status };
}
