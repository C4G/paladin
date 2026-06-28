import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertToRadians, EARTH_RADIUS_MILES } from '@/lib/utils';
import { Farm as PrismaFarm } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;

    if (userId) {
      const farmsByUser = await prisma.farm.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          name: 'desc',
        },
      });

      return NextResponse.json(farmsByUser, { status: 200 });
    }

    const farms = filterFarmsByDistance(
      await prisma.farm.findMany({
        where: {
          id: farmId || undefined,
        },
        orderBy: {
          name: 'desc',
        },
      }),
      searchParams
    );

    return NextResponse.json(farms, { status: 200 });
  } catch (error) {
    console.error('Error fetching farms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      name: response.name,
      streetAddress: response.streetAddress,
      city: response.city,
      state: response.state,
      zipcode: response.zipcode,
      latitude: response.latitude,
      longitude: response.longitude,
      otherInfo: response.otherInfo || null,
      totalAcreage: response.totalAcreage,
      yearEstablished: response.yearEstablished,
      user: {
        connect: {
          id: response.userId,
        },
      },
    };
    console.log('Formatted data:', data);
    const farm = await prisma.farm.create({
      data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json(
      { error: 'Failed to create farm.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId') ?? undefined;
    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      name: response.name,
      streetAddress: response.streetAddress,
      city: response.city,
      state: response.state,
      zipcode: response.zipcode,
      latitude: response.latitude,
      longitude: response.longitude,
      otherInfo: response.otherInfo || null,
      totalAcreage: response.totalAcreage,
      yearEstablished: response.yearEstablished,
    };
    console.log('Formatted data:', data);
    const farm = await prisma.farm.update({
      where: {
        id: farmId,
      },
      data: data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error updating farm:', error);
    return NextResponse.json(
      { error: 'Failed to updating farm.' },
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
    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');

    if (farmId) {
      const farm = await prisma.farm.delete({
        where: { id: farmId },
      });
      return NextResponse.json(farm, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
  } catch (error) {
    console.log(`Error deleting farm: ${error}`);
    return NextResponse.json(
      { error: 'Failed to delete farm.' },
      { status: 500 }
    );
  }
}

function filterFarmsByDistance(
  farms: PrismaFarm[],
  searchParams: URLSearchParams
) {
  const latitude = searchParams.get('latitude')
    ? parseFloat(searchParams.get('latitude')!)
    : undefined;
  const longitude = searchParams.get('longitude')
    ? parseFloat(searchParams.get('longitude')!)
    : undefined;
  const searchDistance = parseFloat(searchParams.get('distance') || '100');

  // if a latitude and longitude are provided, filter the requests by distance from the given latitude and longitude
  if (latitude && longitude) {
    farms = farms.filter((farm) => {
      const distance =
        EARTH_RADIUS_MILES *
        Math.acos(
          Math.cos(convertToRadians(latitude)) *
            Math.cos(convertToRadians(farm.latitude)) *
            Math.cos(convertToRadians(farm.longitude - longitude)) +
            Math.sin(convertToRadians(latitude)) *
              Math.sin(convertToRadians(farm.latitude))
        );
      return distance <= searchDistance;
    });
  }

  return farms;
}
