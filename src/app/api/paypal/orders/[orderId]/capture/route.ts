import { NextResponse } from 'next/server';

const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET');
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const captureRes = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: '{}',
      }
    );

    if (!captureRes.ok) {
      const err = await captureRes.text();
      return NextResponse.json(
        { error: 'Failed to capture PayPal order', details: err },
        { status: captureRes.status }
      );
    }

    const capture = await captureRes.json();
    return NextResponse.json(capture);
  } catch (e) {
    console.error('PayPal capture error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Capture failed' },
      { status: 500 }
    );
  }
}
