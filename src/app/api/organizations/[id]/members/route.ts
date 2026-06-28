import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to check org admin permissions
async function checkOrgAdminAccess(
  userId: string,
  orgId: string,
  isPlatformAdmin: boolean
) {
  if (isPlatformAdmin) return { authorized: true, membership: null };

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
  });

  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    return { authorized: false, membership };
  }

  return { authorized: true, membership };
}

// GET: List members of an organization (supports pagination)
export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';

    // Check if user has access to this org
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: orgId,
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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))
    );
    const search = url.searchParams.get('search')?.trim() || '';

    const role = url.searchParams.get('role')?.toUpperCase() || '';
    const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];

    const where: Record<string, unknown> = { organizationId: orgId };
    if (role && validRoles.includes(role)) {
      where.role = role;
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return NextResponse.json({
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST: Add a member to the organization
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';
    const { authorized } = await checkOrgAdminAccess(
      userId,
      orgId,
      isPlatformAdmin
    );

    if (!authorized) {
      return NextResponse.json(
        { error: 'Not authorized to add members' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { email, role = 'MEMBER' } = data;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member from the organization
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sessionUserId = session.user.id;

  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const isPlatformAdmin = session.user.role === 'ADMIN';
    const { authorized, membership } = await checkOrgAdminAccess(
      sessionUserId,
      orgId,
      isPlatformAdmin
    );

    // Users can remove themselves, or admins can remove others
    const isSelfRemoval = memberId === sessionUserId;

    if (!authorized && !isSelfRemoval) {
      return NextResponse.json(
        { error: 'Not authorized to remove members' },
        { status: 403 }
      );
    }

    // Get the member being removed
    const targetMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: memberId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the last OWNER unless platform admin
    if (targetMember.role === 'OWNER' && !isPlatformAdmin) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the only owner. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // Org MANAGERs cannot remove OWNERs
    if (
      targetMember.role === 'OWNER' &&
      membership?.role === 'MANAGER' &&
      !isPlatformAdmin
    ) {
      return NextResponse.json(
        { error: 'Admins cannot remove owners' },
        { status: 403 }
      );
    }

    await prisma.organizationMember.delete({
      where: { id: targetMember.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

// PATCH: Update member role
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';
    const { authorized, membership } = await checkOrgAdminAccess(
      userId,
      orgId,
      isPlatformAdmin
    );

    if (!authorized) {
      return NextResponse.json(
        { error: 'Not authorized to update members' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { memberId, role } = data;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Only OWNERs or platform ADMINs can assign OWNER role
    if (role === 'OWNER' && membership?.role !== 'OWNER' && !isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Only owners can assign owner role' },
        { status: 403 }
      );
    }

    const targetMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: memberId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updatedMember = await prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
