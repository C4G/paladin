import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const data = await req.json();
    console.log('Received data:', data);

    if (!data.name || !data.link) {
      return NextResponse.json(
        { error: 'Name and link are required' },
        { status: 400 }
      );
    }

    const formattedData = {
      name: data.name,
      link: data.link,
      description: data.description || null,
    };

    console.log('Formatted data:', formattedData);
    const resource = await prisma.disasterResource.create({
      data: formattedData,
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Disaster resource creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const resources = await prisma.disasterResource.findMany();
    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching disaster resources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
