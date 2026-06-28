import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');
    const cropId = searchParams.get('cropId');

    if (!farmId || !cropId) {
      return NextResponse.json(
        { error: 'Both farmId and cropId are required' },
        { status: 400 }
      );
    }

    const crops = await prisma.crop.findMany({
      where: {
        id: cropId,
        farmId: farmId,
      },
      orderBy: {
        name: 'desc',
      },
    });

    return NextResponse.json(crops, { status: 200 });
  } catch (error) {
    console.error('Error fetching crops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crops.' },
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
    console.log('Received crop data:', response);
    const data = {
      name: response.name,
      acreage: response.acreage,
      farm: {
        connect: {
          id: response.farmId,
        },
      },
    };
    console.log('Formatted data:', data);
    const farm = await prisma.crop.create({
      data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error creating crop:', error);
    return NextResponse.json(
      { error: 'Failed to create crop.' },
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
    const cropId = searchParams.get('cropId') ?? undefined;

    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      name: response.name,
      acreage: response.acreage,
    };
    console.log('Formatted data:', data);
    const crop = await prisma.crop.update({
      where: {
        id: cropId,
      },
      data: data,
    });
    return NextResponse.json(crop, { status: 200 });
  } catch (error) {
    console.error('Error updating crop:', error);
    return NextResponse.json(
      { error: 'Failed to update crop.' },
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
    const cropId = searchParams.get('cropId');

    if (cropId) {
      const farm = await prisma.crop.delete({
        where: { id: cropId },
      });
      return NextResponse.json(farm, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting crop:', error);
    return NextResponse.json(
      { error: 'Failed to delete crop.' },
      { status: 500 }
    );
  }
}
