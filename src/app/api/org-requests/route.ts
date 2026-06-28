import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrgApprovalEmail, sendOrgRejectionEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

// GET: List org requests (ADMIN only, or user's own requests)
export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const isAdmin = session.user.role === 'ADMIN';

    const requests = await prisma.orgRequest.findMany({
      where: isAdmin
        ? {} // ADMINs see all
        : { requesterId: session.user.id }, // Users see only their own
      include: {
        requester: {
          select: { id: true, name: true, email: true, image: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching org requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization requests' },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject an org request (ADMIN only)
export async function PATCH(req: Request) {
  const session = await auth();

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const { requestId, action, reviewNotes } = data;

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Request ID and valid action (approve/reject) required' },
        { status: 400 }
      );
    }

    const orgRequest = await prisma.orgRequest.findUnique({
      where: { id: requestId },
    });

    if (!orgRequest) {
      return NextResponse.json(
        { error: 'Organization request not found' },
        { status: 404 }
      );
    }

    if (orgRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Create the organization and add requester as OWNER
      const [organization] = await prisma.$transaction([
        prisma.organization.create({
          data: {
            name: orgRequest.name,
            description: orgRequest.description,
            members: {
              create: {
                userId: orgRequest.requesterId,
                role: 'OWNER',
              },
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        }),
        prisma.orgRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewerId: session.user.id,
            reviewNotes: reviewNotes || null,
          },
        }),
      ]);

      // Send approval email to requester
      const requesterEmail = organization.members[0]?.user.email;
      if (requesterEmail) {
        await sendOrgApprovalEmail({
          to: requesterEmail,
          orgName: organization.name,
          orgId: organization.id,
        });
      }

      return NextResponse.json({
        message: 'Organization approved and created',
        organization,
      });
    } else {
      // Get requester email before rejecting
      const requester = await prisma.user.findUnique({
        where: { id: orgRequest.requesterId },
        select: { email: true },
      });

      // Reject the request
      const updatedRequest = await prisma.orgRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewerId: session.user.id,
          reviewNotes: reviewNotes || null,
        },
      });

      // Send rejection email to requester
      if (requester?.email) {
        await sendOrgRejectionEmail({
          to: requester.email,
          orgName: orgRequest.name,
          reason: reviewNotes,
        });
      }

      return NextResponse.json({
        message: 'Organization request rejected',
        request: updatedRequest,
      });
    }
  } catch (error) {
    console.error('Error processing org request:', error);
    return NextResponse.json(
      { error: 'Failed to process organization request' },
      { status: 500 }
    );
  }
}
