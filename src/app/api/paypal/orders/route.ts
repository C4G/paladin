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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = typeof body?.amount === 'string' ? body.amount : '10.00';
    const currency = typeof body?.currency === 'string' ? body.currency : 'USD';

    const accessToken = await getAccessToken();
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount,
            },
            description: 'Paladin Farm & Ranch – Monthly donation',
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: err },
        { status: orderRes.status }
      );
    }

    const order = (await orderRes.json()) as { id: string };
    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error('PayPal create order error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Create order failed' },
      { status: 500 }
    );
  }
}
