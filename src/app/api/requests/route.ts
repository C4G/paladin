import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/app/actions';
import { filterFarmsByDistance } from '@/lib/utils';
import {
  verifyAndSyncUserSubscription,
  isPaypalSubscriptionExempt,
} from '@/lib/paypal-subscriptions';
import {
  sendRequestCreatedEmail,
  sendRequestClosedEmail,
  sendRequestClosedToResponderEmail,
} from '@/lib/email';

export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const farmId = searchParams.getAll('farmId');
    const requestId = searchParams.get('requestId');
    const areActive = searchParams.get('activeRequestsOnly');

    // ADMINs can view all requests; others see only their own + org members' requests
    const isAdmin = session.user.role === 'ADMIN';
    const effectiveUserId = isAdmin ? undefined : userId || session.user.id;

    // For non-admins, get their organization memberships to show org farm requests
    let userOrgIds: string[] = [];
    if (!isAdmin) {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      userOrgIds = memberships.map((m) => m.organizationId);
    }

    // If requestId is provided, fetch that specific request
    if (requestId) {
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
          farm: {
            include: {
              gates: true,
            },
          },
          preferredGate: true,
          user: { select: { name: true, email: true } },
          responses: {
            select: {
              id: true,
              userId: true,
              estimatedArrivalTime: true,
              equipment: true,
              respondedAt: true,
              responder: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              respondedAt: 'desc',
            },
          },
        },
      });

      if (!request) {
        return NextResponse.json([], { status: 200 });
      }

      return NextResponse.json([request], { status: 200 });
    }

    // Get requests within a bounding box
    const neLat = searchParams.get('ne_lat');
    const neLng = searchParams.get('ne_lng');
    const swLat = searchParams.get('sw_lat');
    const swLng = searchParams.get('sw_lng');

    // Check if we have valid bounding box coordinates (for "nearby requests" feature)
    const parsedNeLat = neLat ? Number.parseFloat(neLat) : NaN;
    const parsedNeLng = neLng ? Number.parseFloat(neLng) : NaN;
    const parsedSwLat = swLat ? Number.parseFloat(swLat) : NaN;
    const parsedSwLng = swLng ? Number.parseFloat(swLng) : NaN;
    const hasValidBounds =
      !Number.isNaN(parsedNeLat) &&
      !Number.isNaN(parsedNeLng) &&
      !Number.isNaN(parsedSwLat) &&
      !Number.isNaN(parsedSwLng);

    const requests = await prisma.request.findMany({
      include: {
        farm: {
          select: {
            latitude: true,
            longitude: true,
            name: true,
            streetAddress: true,
            city: true,
            state: true,
            zipcode: true,
            totalAcreage: true,
            organizationId: true,
            yearEstablished: true,
            otherInfo: true,
          },
        },
        preferredGate: true,
        user: { select: { name: true, email: true } },
        responses: {
          select: {
            id: true,
            userId: true,
            estimatedArrivalTime: true,
            equipment: true,
            respondedAt: true,
            responder: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            respondedAt: 'desc',
          },
        },
      },
      where: {
        // When bounds are provided (nearby requests), show ALL requests in that area.
        // Otherwise, apply user visibility filter: ADMINs see all, others see own + org farms.
        ...(hasValidBounds
          ? {} // No user filter when fetching nearby requests by bounds
          : isAdmin
            ? {}
            : userOrgIds.length > 0
              ? {
                  OR: [
                    { userId: effectiveUserId },
                    { farm: { organizationId: { in: userOrgIds } } },
                  ],
                }
              : { userId: effectiveUserId }),
        farmId: farmId?.length ? { in: farmId } : undefined,
        closedOn: areActive === 'true' ? null : undefined,
        farm: hasValidBounds
          ? {
              latitude: {
                gte: parsedSwLat,
                lte: parsedNeLat,
              },
              longitude: {
                gte: parsedSwLng,
                lte: parsedNeLng,
              },
            }
          : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    if (!isPaypalSubscriptionExempt(session.user.role)) {
      const subscriptionCheck = await verifyAndSyncUserSubscription(userId);
      if (!subscriptionCheck.allowed) {
        return NextResponse.json(
          {
            error:
              'An active PayPal subscription is required to create requests.',
          },
          { status: 403 }
        );
      }
    }

    const data = await req.json();
    console.log('Received data:', data);

    if (data.comments && data.comments.length > 2000) {
      return NextResponse.json(
        { error: 'Comments must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Create the base request data
    const requestData = {
      disasterType: data.disasterType,
      comments: data.comments,
      farm: {
        connect: {
          id: data.farmId,
        },
      },
      user: {
        connect: {
          id: data.userId,
        },
      },
    };
    console.log('Formatted data:', requestData);

    // Only connect preferredGate if preferredGateId is provided
    if (data.preferredGateId) {
      // @ts-expect-error - TypeScript might complain about adding to the object
      requestData.preferredGate = {
        connect: {
          id: data.preferredGateId,
        },
      };
    }

    const request = await prisma.request.create({
      data: requestData,
    });
    notify(data.farmId, data.disasterType, request.id);

    // Send confirmation email to the request creator
    const creatorUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true, email: true },
    });
    const creatorFarm = await prisma.farm.findUnique({
      where: { id: data.farmId },
      select: { name: true },
    });
    if (creatorUser?.email) {
      await sendRequestCreatedEmail({
        to: creatorUser.email,
        userName: creatorUser.name || 'User',
        farmName: creatorFarm?.name || 'your farm',
        disasterType: data.disasterType,
        requestId: request.id,
      });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Request creation error:', error);
    return NextResponse.json(
      { error: 'Error creating request' },
      { status: 500 }
    );
  }
}

async function notify(farmId: string, disasterType: string, requestId: string) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
  });

  if (!farm) {
    console.error('Farm not found:', farmId);
    return;
  }

  const farmName = farm.name;
  const farmLatitute = farm.latitude;
  const farmLongitude = farm.longitude;

  const pingFarms = filterFarmsByDistance(
    await prisma.farm.findMany(),
    farmLatitute,
    farmLongitude,
    100
  );

  pingFarms.forEach(async (farm) => {
    const notification = await prisma.notification.findMany({
      where: {
        userId: farm.userId,
      },
    });

    if (notification.length > 0) {
      notification.forEach(async (n) => {
        const message = `Farm ${farmName} has requested assistance for ${disasterType}.`;
        const subscription = JSON.stringify({
          endpoint: n.endpoint,
          expirationTime: n.expiration || null,
          keys: {
            p256dh: n.p256dh,
            auth: n.auth,
          },
        });
        await sendNotification(
          subscription,
          'Farm Request',
          message,
          `/dashboard?requestId=${requestId}`
        );
      });
    }
  });
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const data = await req.json();

    const { searchParams } = new URL(req.url);
    let requestId;

    if (searchParams.get('requestId')) {
      requestId = searchParams.get('requestId');
    }

    if (!requestId) {
      return new Response('Invalid request ID', { status: 400 });
    }

    if (data.action === 'close') {
      const request = await prisma.request.update({
        where: { id: requestId },
        data: { closedOn: new Date() },
        include: {
          user: { select: { name: true, email: true } },
          farm: { select: { name: true } },
          responses: {
            include: {
              responder: { select: { name: true, email: true } },
            },
          },
        },
      });

      // Send closure email to the request owner
      if (request.user.email) {
        await sendRequestClosedEmail({
          to: request.user.email,
          userName: request.user.name || 'User',
          farmName: request.farm?.name || 'your farm',
          disasterType: request.disasterType,
        });
      }

      // Send closure email to all active responders
      const ownerName = request.user.name || 'A user';
      for (const response of request.responses) {
        if (response.responder.email) {
          await sendRequestClosedToResponderEmail({
            to: response.responder.email,
            responderName: response.responder.name || 'Responder',
            ownerName,
            farmName: request.farm?.name || 'a farm',
            disasterType: request.disasterType,
          });
        }
      }

      return NextResponse.json(request);
    } else if (data.action === 'update') {
      // Create update data object with proper typing
      const updateData: {
        farmId?: string;
        disasterType?: string;
        comments?: string;
        preferredGateId?: string | null;
      } = {
        farmId: data.farmId,
        disasterType: data.disasterType,
        comments: data.comments,
      };

      // Only include preferredGateId if it's provided
      if (data.preferredGateId !== undefined) {
        updateData.preferredGateId = data.preferredGateId;
      }

      const request = await prisma.request.update({
        where: { id: requestId },
        data: updateData,
      });

      return NextResponse.json(request);
    } else {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Error updating request' },
      { status: 500 }
    );
  }
}
