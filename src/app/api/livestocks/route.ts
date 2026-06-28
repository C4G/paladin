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
    const livestockId = searchParams.get('livestockId');

    if (!farmId || !livestockId) {
      return NextResponse.json(
        { error: 'Both farmId and livestockId are required' },
        { status: 400 }
      );
    }

    const livestocks = await prisma.livestock.findMany({
      where: {
        id: livestockId,
        farmId: farmId,
      },
      orderBy: {
        name: 'desc',
      },
    });

    return NextResponse.json(livestocks, { status: 200 });
  } catch (error) {
    console.error('Error fetching livestocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch livestocks.' },
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
      count: response.count,
      farm: {
        connect: {
          id: response.farmId,
        },
      },
    };
    console.log('Formatted data:', data);
    const farm = await prisma.livestock.create({
      data,
    });
    return NextResponse.json(farm, { status: 200 });
  } catch (error) {
    console.error('Error creating livestock:', error);
    return NextResponse.json(
      { error: 'Failed to create livestock.' },
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
    const livestockId = searchParams.get('livestockId') ?? undefined;

    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      name: response.name,
      count: response.count,
    };
    console.log('Formatted data:', data);
    const livestock = await prisma.livestock.update({
      where: {
        id: livestockId,
      },
      data: data,
    });
    return NextResponse.json(livestock, { status: 200 });
  } catch (error) {
    console.error('Error updating livestock:', error);
    return NextResponse.json(
      { error: 'Failed to update livestock.' },
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
    const livestockId = searchParams.get('livestockId');

    if (livestockId) {
      const farm = await prisma.livestock.delete({
        where: { id: livestockId },
      });
      return NextResponse.json(farm, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting livestock:', error);
    return NextResponse.json(
      { error: 'Failed to delete livestock.' },
      { status: 500 }
    );
  }
}
