import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { updateVapidDetails } from '@/app/actions';

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const response = await req.json();

    if (!response.userId || !response.endpoint) {
      return NextResponse.json(
        { error: 'Need User ID or Sub ID' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findMany({
      where: {
        OR: [{ userId: response.userId }, { userId: session.user.id }],
      },
      orderBy: {
        endpoint: 'desc',
      },
    });

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      endpoint: response.endpoint,
      expiration: response.expiration || null,
      p256dh: response.p256dh,
      auth: response.auth,
      userId: session.user.id,
    };
    console.log('Formatted data:', data);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No email associated with user' },
        { status: 400 }
      );
    }

    const email = 'mailto:'.concat(session.user.email);
    updateVapidDetails(
      email,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const farm = await prisma.notification.create({
      data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const response = await req.json();
    const notification = await prisma.notification.deleteMany({
      where: {
        endpoint: response.endpoint,
      },
    });
    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification.' },
      { status: 500 }
    );
  }
}
