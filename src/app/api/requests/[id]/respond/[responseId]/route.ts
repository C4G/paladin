import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { sendEmail, getBaseUrl } from '@/lib/email';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { responseId } = await params;

    // Find the response and verify ownership
    const existingResponse = await prisma.response.findUnique({
      where: { id: responseId },
      include: {
        responder: {
          select: { name: true, email: true },
        },
        request: {
          select: {
            id: true,
            disasterType: true,
            user: {
              select: { name: true, email: true },
            },
            farm: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Only the responder can cancel their own response
    if (existingResponse.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own response' },
        { status: 403 }
      );
    }

    // Delete the response
    await prisma.response.delete({
      where: { id: responseId },
    });

    // Send email notification to the request owner
    const requestOwnerEmail = existingResponse.request.user.email;
    const requestOwnerName = existingResponse.request.user.name || 'User';
    const responderName = existingResponse.responder.name || 'A responder';
    const farmName = existingResponse.request.farm?.name || 'your farm';

    if (requestOwnerEmail) {
      await sendEmail({
        to: requestOwnerEmail,
        subject: `Response Cancelled - ${existingResponse.request.disasterType} Request`,
        title: 'Response Cancelled',
        content: `
          <p>Hello ${requestOwnerName},</p>
          <p style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong>${responderName}</strong> has cancelled their response to your <strong>${existingResponse.request.disasterType}</strong> request for <strong>${farmName}</strong>.
          </p>
          <p style="margin-top: 16px;">You can check the status of your request in your dashboard.</p>
        `,
        ctaText: 'View Dashboard',
        ctaUrl: `${getBaseUrl()}/dashboard`,
        footerText:
          'You received this email because a responder cancelled their response to your request on Paladin Farm & Ranch.',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling response:', error);
    return NextResponse.json(
      { error: 'Failed to cancel response' },
      { status: 500 }
    );
  }
}
