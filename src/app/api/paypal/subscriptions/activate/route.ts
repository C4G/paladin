import { auth } from '@/lib/auth';
import { verifyAndStoreSubscriptionId } from '@/lib/paypal-subscriptions';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { subscriptionId } = (await req.json()) as {
      subscriptionId?: string;
    };
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }

    const result = await verifyAndStoreSubscriptionId(
      session.user.id,
      subscriptionId
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('PayPal subscription activation error:', error);
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    );
  }
}
