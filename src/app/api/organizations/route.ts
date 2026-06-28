import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrgRequestSubmittedEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: List organizations the user belongs to (or all for ADMINs)
export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isAdmin = session.user.role === 'ADMIN';

    if (isAdmin) {
      // ADMINs see all organizations
      const organizations = await prisma.organization.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            take: 50,
          },
          _count: { select: { farms: true, members: true } },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(organizations);
    }

    // Regular users see only orgs they belong to
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: { userId: userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          take: 50,
        },
        _count: { select: { farms: true, members: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

// POST: Request creation of a new organization
export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const data = await req.json();
    const { name, description } = data;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check for existing pending request from this user
    const existingRequest = await prisma.orgRequest.findFirst({
      where: {
        requesterId: userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending organization request' },
        { status: 400 }
      );
    }

    // Create org request for admin approval
    const orgRequest = await prisma.orgRequest.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        requesterId: userId,
      },
      include: {
        requester: {
          select: { name: true, email: true },
        },
      },
    });

    // Send confirmation email to the requester
    if (orgRequest.requester.email) {
      await sendOrgRequestSubmittedEmail({
        to: orgRequest.requester.email,
        orgName: orgRequest.name,
      });
    }

    return NextResponse.json(orgRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating organization request:', error);
    return NextResponse.json(
      { error: 'Failed to create organization request' },
      { status: 500 }
    );
  }
}
