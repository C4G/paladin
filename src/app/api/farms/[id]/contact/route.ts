import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendFarmContactEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

/**
 * POST /api/farms/[id]/contact — send a message to a farm owner
 * without exposing their email address to the sender.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: farmId } = await params;

  try {
    const { message } = await req.json();

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be 2000 characters or less' },
        { status: 400 }
      );
    }

    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        name: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Prevent messaging yourself
    if (farm.user.id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot send a message to your own farm' },
        { status: 400 }
      );
    }

    if (!farm.user.email) {
      return NextResponse.json(
        { error: 'Farm owner does not have an email on file' },
        { status: 404 }
      );
    }

    const emailResult = await sendFarmContactEmail({
      to: farm.user.email,
      ownerName: farm.user.name || 'Farm Owner',
      senderName: session.user.name || 'A Paladin user',
      senderEmail: session.user.email!,
      farmName: farm.name,
      message: message.trim(),
    });

    if (!emailResult.success) {
      console.error('Failed to send farm contact email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending farm contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
