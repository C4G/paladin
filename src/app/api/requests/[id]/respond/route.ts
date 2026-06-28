import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { sendEmail, getBaseUrl } from '@/lib/email';

export interface RequestParams {
  id: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const requestId = data.requestId;

    // Validate the request exists and is not closed
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        closedOn: true,
        disasterType: true,
        user: {
          select: { name: true, email: true },
        },
        farm: {
          select: { name: true },
        },
        responses: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existingRequest.closedOn) {
      return NextResponse.json(
        { error: 'Cannot respond to a closed request' },
        { status: 400 }
      );
    }

    // Check if user has already responded
    const existingResponse = existingRequest.responses.find(
      (response) => response.userId === session.user.id
    );

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already responded to this request' },
        { status: 400 }
      );
    }

    // Create the response
    const response = await prisma.response.create({
      data: {
        userId: session.user.id!,
        RequestId: requestId,
        estimatedArrivalTime: new Date(data.estimatedArrivalTime),
        equipment: data.equipment,
      },
      include: {
        responder: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email notification to the request owner
    const requestOwnerEmail = existingRequest.user.email;
    const requestOwnerName = existingRequest.user.name || 'User';
    const responderName = response.responder.name || 'Someone';
    const farmName = existingRequest.farm?.name || 'your farm';
    const eta = new Date(data.estimatedArrivalTime);
    const etaStr = eta.toLocaleString();

    if (requestOwnerEmail) {
      await sendEmail({
        to: requestOwnerEmail,
        subject: `New Response - ${existingRequest.disasterType} Request`,
        title: 'New Responder',
        content: `
          <p>Hello ${requestOwnerName},</p>
          <p style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong>${responderName}</strong> has responded to your <strong>${existingRequest.disasterType}</strong> request for <strong>${farmName}</strong>.
          </p>
          <p style="margin: 12px 0;"><span style="margin-right: 6px; color: black;">&#128336;&#65038;</span><strong>Estimated Arrival:</strong> ${etaStr}</p>
          <p style="margin: 12px 0;"><span style="margin-right: 6px; color: black;">&#128296;&#65038;</span><strong>Equipment:</strong> ${data.equipment || 'Not specified'}</p>
          <p style="margin-top: 16px;">You can view all responders and manage your request in your dashboard.</p>
        `,
        ctaText: 'View Dashboard',
        ctaUrl: `${getBaseUrl()}/dashboard`,
        footerText:
          'You received this email because someone responded to a request you created on Paladin Farm & Ranch.',
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }
}
