import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get organization details
export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isAdmin = session.user.role === 'ADMIN';

    // Check if user is a member of this org (unless they're a platform admin)
    if (!isAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Not authorized to view this organization' },
          { status: 403 }
        );
      }
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
          take: 50,
        },
        farms: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            city: true,
            state: true,
          },
        },
        _count: { select: { farms: true, members: true } },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// PUT: Update organization (org MANAGER/OWNER or platform ADMIN only)
export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';

    // Check if user is an org admin/owner
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: id,
          },
        },
      });

      if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Not authorized to update this organization' },
          { status: 403 }
        );
      }
    }

    const data = await req.json();
    const { name, description } = data;

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// DELETE: Delete organization (platform ADMIN only)
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    await prisma.organization.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
