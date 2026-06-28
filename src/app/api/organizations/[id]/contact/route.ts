import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrgContactEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

// POST: Send a message to the organization owner
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: orgId } = await params;

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

    // Find the organization and its owner
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        members: {
          where: { role: 'OWNER' },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (org.members.length === 0) {
      return NextResponse.json(
        { error: 'This organization does not have an owner to contact' },
        { status: 404 }
      );
    }

    const owner = org.members[0].user;

    // Send email to the owner
    const emailResult = await sendOrgContactEmail({
      to: owner.email!,
      ownerName: owner.name || 'Organization Owner',
      senderName: session.user.name || 'A Paladin user',
      senderEmail: session.user.email!,
      orgName: org.name,
      message: message.trim(),
    });

    if (!emailResult.success) {
      console.error('Failed to send org contact email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending org contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
