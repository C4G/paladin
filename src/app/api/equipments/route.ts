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
    const equipmentId = searchParams.get('equipmentd');

    if (!farmId || !equipmentId) {
      return NextResponse.json(
        { error: 'Both farmId and equipmentId are required' },
        { status: 400 }
      );
    }

    const equipments = await prisma.equipment.findMany({
      where: {
        id: equipmentId,
        farmId: farmId,
      },
      orderBy: {
        type: 'desc',
      },
    });

    return NextResponse.json(equipments, { status: 200 });
  } catch (error) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments.' },
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
      type: response.type,
      description: response.description,
      farm: {
        connect: {
          id: response.farmId,
        },
      },
    };
    console.log('Formatted data:', data);
    const farm = await prisma.equipment.create({
      data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error creating equipment:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment.' },
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
    const equipmentId = searchParams.get('equipmentId') ?? undefined;

    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      type: response.type,
      description: response.description,
    };
    console.log('Formatted data:', data);

    const equipment = await prisma.equipment.update({
      where: {
        id: equipmentId,
      },
      data: data,
    });

    return NextResponse.json(equipment, { status: 200 });
  } catch (error) {
    console.error('Error updating equipment:', error);
    return NextResponse.json(
      { error: 'Failed to updating equipment.' },
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
    const equipmentId = searchParams.get('equipmentId');

    if (equipmentId) {
      const farm = await prisma.equipment.delete({
        where: { id: equipmentId },
      });
      return NextResponse.json(farm, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json(
      { error: 'Failed to delete equipment.' },
      { status: 500 }
    );
  }
}
