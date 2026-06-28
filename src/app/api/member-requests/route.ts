import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: List join requests for organizations the user can manage
// - ADMIN: sees all join requests
// - OWNER/MANAGER: sees join requests for their orgs
// - Others: sees nothing
// Query params:
// - includeHistory=true: includes APPROVED/REJECTED requests
export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeHistory = searchParams.get('includeHistory') === 'true';

  const userId = session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  const statusFilter = includeHistory ? {} : { status: 'PENDING' as const };

  try {
    if (isAdmin) {
      // ADMINs see all join requests
      const joinRequests = await prisma.orgJoinRequest.findMany({
        where: statusFilter,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(joinRequests);
    }

    // Find orgs where user is OWNER or MANAGER
    const managedOrgs = await prisma.organizationMember.findMany({
      where: {
        userId: userId,
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { organizationId: true },
    });

    if (managedOrgs.length === 0) {
      return NextResponse.json([]);
    }

    const orgIds = managedOrgs.map((m) => m.organizationId);

    const joinRequests = await prisma.orgJoinRequest.findMany({
      where: {
        organizationId: { in: orgIds },
        ...statusFilter,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching member requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member requests' },
      { status: 500 }
    );
  }
}
