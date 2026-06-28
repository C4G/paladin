import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Search organizations (public list for joining)
export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    // Find organizations matching the query
    const organizations = await prisma.organization.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { members: true, farms: true } },
        members: {
          where: { userId: userId },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    // Also get pending join requests for this user
    const pendingRequests = await prisma.orgJoinRequest.findMany({
      where: {
        userId: userId,
        status: 'PENDING',
      },
      select: { organizationId: true },
    });

    const pendingOrgIds = new Set(pendingRequests.map((r) => r.organizationId));

    // Mark which orgs have pending requests or user is already member
    const orgsWithStatus = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      _count: org._count,
      hasPendingRequest: pendingOrgIds.has(org.id),
      isMember: org.members.length > 0,
    }));

    return NextResponse.json(orgsWithStatus);
  } catch (error) {
    console.error('Error searching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to search organizations' },
      { status: 500 }
    );
  }
}
