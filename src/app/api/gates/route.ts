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
    const farmId = searchParams.get('farmId') ?? undefined;
    const gateId = searchParams.get('gateId') ?? undefined;

    if (gateId) {
      const gatesByGate = await prisma.gate.findMany({
        where: {
          id: gateId,
        },
        orderBy: {
          name: 'asc', // Changed to ascending order to match gate numbering (Gate 1, Gate 2, etc.)
        },
      });
      return NextResponse.json(gatesByGate, { status: 200 });
    }

    if (farmId) {
      const gatesByFarm = await prisma.gate.findMany({
        where: {
          farmId: farmId,
        },
        orderBy: {
          name: 'asc', // Changed to ascending order to match gate numbering (Gate 1, Gate 2, etc.)
        },
      });
      return NextResponse.json(gatesByFarm, { status: 200 });
    }

    const allGates = await prisma.gate.findMany({
      orderBy: {
        name: 'asc', // Changed to ascending order to match gate numbering (Gate 1, Gate 2, etc.)
      },
    });

    return NextResponse.json(allGates, { status: 200 });
  } catch (error) {
    console.error('Error fetching gates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gates.' },
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
    // Handle both single gate and multiple gates formats
    if (Array.isArray(response.gates)) {
      // Handle multiple gates from the GatesForm
      const createdGates = [];

      for (const gate of response.gates) {
        if (gate.latitude && gate.longitude) {
          const data = {
            name: gate.name,
            latitude: Number.parseFloat(gate.latitude),
            longitude: Number.parseFloat(gate.longitude),
            farm: {
              connect: {
                id: response.farmId,
              },
            },
          };
          console.log('Formatted data:', data);
          const createdGate = await prisma.gate.create({
            data,
          });

          createdGates.push(createdGate);
        }
      }

      return NextResponse.json(createdGates, { status: 200 });
    } else {
      // Handle single gate format (original implementation)
      const data = {
        name: response.name,
        latitude: Number.parseFloat(response.latitude),
        longitude: Number.parseFloat(response.longitude),
        farm: {
          connect: {
            id: response.farmId,
          },
        },
      };

      const gate = await prisma.gate.create({
        data,
      });

      return NextResponse.json(gate, { status: 200 });
    }
  } catch (error) {
    console.error('Error creating gate:', error);
    return NextResponse.json(
      { error: 'Failed to create gate.' },
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
    const gateId = searchParams.get('gateId') ?? undefined;

    const response = await req.json();
    console.log('Received data:', response);
    const data = {
      name: response.name,
      latitude: Number.parseFloat(response.latitude),
      longitude: Number.parseFloat(response.longitude),
    };
    console.log('Formatted data:', data);
    const gate = await prisma.gate.update({
      where: {
        id: gateId,
      },
      data: data,
    });

    return NextResponse.json(gate, { status: 200 });
  } catch (error) {
    console.error('Error updating gate:', error);
    return NextResponse.json(
      { error: 'Failed to update gate.' },
      { status: 500 }
    );
  }
}

// Add DELETE endpoint to handle gate deletion
export async function DELETE(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const gateId = searchParams.get('gateId');

    if (!gateId) {
      return NextResponse.json(
        { error: 'Gate ID is required' },
        { status: 400 }
      );
    }

    await prisma.gate.delete({
      where: {
        id: gateId,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting gate:', error);
    return NextResponse.json(
      { error: 'Failed to delete gate.' },
      { status: 500 }
    );
  }
}
