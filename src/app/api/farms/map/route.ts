import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/farms/map — returns farms visible on the map within a bounding box.
 *
 * Role-based visibility:
 *  - ADMIN:                all farms with full info (name, owner name, contact, address)
 *  - Org OWNER/MANAGER:    full info for farms in their orgs; property name only for others
 *  - Regular users/MEMBER: property name only; full info shown only when farm has an active request
 */
export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const neLat = parseFloat(searchParams.get('ne_lat') ?? '');
    const neLng = parseFloat(searchParams.get('ne_lng') ?? '');
    const swLat = parseFloat(searchParams.get('sw_lat') ?? '');
    const swLng = parseFloat(searchParams.get('sw_lng') ?? '');

    if ([neLat, neLng, swLat, swLng].some(Number.isNaN)) {
      return NextResponse.json(
        {
          error:
            'Bounding box parameters required (ne_lat, ne_lng, sw_lat, sw_lng)',
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // Fetch farms in the bounding box (exclude user's own farms — they're shown separately)
    const farms = await prisma.farm.findMany({
      where: {
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
        userId: { not: userId },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        streetAddress: true,
        city: true,
        state: true,
        zipcode: true,
        organizationId: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requests: {
          where: { closedOn: null },
          select: { id: true },
          take: 1,
        },
      },
    });

    // Determine which org IDs the user manages (OWNER or MANAGER)
    let managedOrgIds: Set<string> = new Set();
    let memberOrgIds: Set<string> = new Set();

    if (!isAdmin) {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true, role: true },
      });
      for (const m of memberships) {
        memberOrgIds.add(m.organizationId);
        if (m.role === 'OWNER' || m.role === 'MANAGER') {
          managedOrgIds.add(m.organizationId);
        }
      }
    }

    // Shape the response based on access level
    const result = farms.map((farm) => {
      const hasActiveRequest = farm.requests.length > 0;
      const isInManagedOrg = farm.organizationId
        ? managedOrgIds.has(farm.organizationId)
        : false;

      // Full info access: admin, or org manager/owner for that org's farms,
      // or the farm has an active disaster request
      const showFullInfo = isAdmin || isInManagedOrg || hasActiveRequest;

      // Contact allowed: admin, org manager/owner for that org's farms,
      // or the farm has an active disaster request
      const canContact = isAdmin || isInManagedOrg || hasActiveRequest;

      return {
        id: farm.id,
        name: farm.name,
        latitude: farm.latitude,
        longitude: farm.longitude,
        city: farm.city,
        state: farm.state,
        hasActiveRequest,
        // Only include sensitive details when authorized
        ...(showFullInfo
          ? {
              ownerName: farm.user.name,
              streetAddress: farm.streetAddress,
              zipcode: farm.zipcode,
            }
          : {}),
        canContact,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching map farms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    );
  }
}
