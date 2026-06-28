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
    const needId = searchParams.get('needId');

    if (!farmId || !needId) {
      return NextResponse.json(
        { error: 'Both farmId and needId are required' },
        { status: 400 }
      );
    }

    const needs = await prisma.equipment.findMany({
      where: {
        id: needId,
        farmId: farmId,
      },
      orderBy: {
        type: 'desc',
      },
    });

    return NextResponse.json(needs, { status: 200 });
  } catch (error) {
    console.error('Error fetching needs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch needs.' },
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
      details: response.details,
      farm: {
        connect: {
          id: response.farmId,
        },
      },
    };
    console.log('Formatted data:', data);
    const need = await prisma.emergencyNeed.create({
      data,
    });
    return NextResponse.json(need, { status: 200 });
  } catch (error) {
    console.error('Error creating need:', error);
    return NextResponse.json(
      { error: 'Failed to create need.' },
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
    const needId = searchParams.get('needId') ?? undefined;

    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      type: response.type,
      details: response.details,
    };
    console.log('Formatted data:', data);
    const need = await prisma.emergencyNeed.update({
      where: {
        id: needId,
      },
      data: data,
    });
    return NextResponse.json(need, { status: 200 });
  } catch (error) {
    console.error('Error updating need:', error);
    return NextResponse.json(
      { error: 'Failed to update need.' },
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
    const needId = searchParams.get('needId');

    if (needId) {
      const farm = await prisma.emergencyNeed.delete({
        where: { id: needId },
      });
      return NextResponse.json(farm, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting need:', error);
    return NextResponse.json(
      { error: 'Failed to delete emergency need.' },
      { status: 500 }
    );
  }
}
