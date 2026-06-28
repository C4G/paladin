import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const { id } = await params;
    console.log('Received PATCH request for id:', id);

    if (!id) {
      console.error('Missing resource ID');
      return NextResponse.json(
        { error: 'Missing resource ID' },
        { status: 400 }
      );
    }

    const data = await request.json();
    console.log('Received data:', data);

    const resource = await prisma.disasterResource.findUnique({
      where: { id },
    });

    if (!resource) {
      console.error('Resource not found:', id);
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    const updatedResource = await prisma.disasterResource.update({
      where: { id },
      data: {
        name: data.name,
        link: data.link,
        description: data.description || null,
      },
    });

    console.log('Updated resource:', updatedResource);
    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error('Error updating disaster resource:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // `params` is a Promise, so we need to await it
) {
  try {
    // Awaiting the params to resolve it
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing resource ID' },
        { status: 400 }
      );
    }

    const resource = await prisma.disasterResource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    await prisma.disasterResource.delete({ where: { id } });

    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting disaster resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
