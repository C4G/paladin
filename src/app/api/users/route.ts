import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    //|| session.user.role !== 'ADMIN'
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const reqType = searchParams.get('reqType');

    switch (reqType) {
      case 'profile':
        console.log(userId + reqType);
        const userWithFarm = await prisma.user.findUnique({
          where: {
            id: userId || undefined,
          },
          include: {
            farms: {
              include: {
                gates: true,
                crops: true,
                livestocks: true,
                equipments: true,
                emergencyNeeds: true,
              },
            },
          },
        });
        console.log(userWithFarm);
        return NextResponse.json(userWithFarm);
      case 'registration':
        const userNoFarm = await prisma.user.findUnique({
          where: {
            id: userId || undefined,
          },
        });
        console.log(userNoFarm);
        return NextResponse.json(userNoFarm);
      default:
        const users = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscription: true,
            createdAt: true,
            updatedAt: true,
          },
          where: {
            id: userId || undefined,
          },
          orderBy: {
            name: 'asc',
          },
        });

        return NextResponse.json(users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error fetching users' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await req.json();
  console.log('Received data:', user);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { ...user, updatedAt: new Date() },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name, email, phoneNumber, bio, emailNotifications } =
    await req.json();

  console.log('PUT /api/users payload:', {
    name,
    email,
    phoneNumber,
    bio,
    emailNotifications,
  });

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email,
        phoneNumber,
        bio,
        ...(emailNotifications !== undefined && {
          emailNotifications: Boolean(emailNotifications),
        }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user - full error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error updating user', details: message },
      { status: 500 }
    );
  }
}
