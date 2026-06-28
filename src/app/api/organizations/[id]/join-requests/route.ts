import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  sendJoinRequestSubmittedEmail,
  sendEmail,
  getBaseUrl,
} from '@/lib/email';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: List join requests for an organization (org manager/owner or platform admin only)
export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';

    // Check if user is an org admin/owner
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: orgId,
          },
        },
      });

      if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Not authorized to view join requests' },
          { status: 403 }
        );
      }
    }

    const joinRequests = await prisma.orgJoinRequest.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

// POST: Request to join an organization
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const data = await req.json();
    const { message } = data;

    // Check if org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: userId,
          organizationId: orgId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await prisma.orgJoinRequest.findUnique({
      where: {
        userId_organizationId: {
          userId: userId,
          organizationId: orgId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json(
          {
            error:
              'You already have a pending request to join this organization',
          },
          { status: 400 }
        );
      }
      // If previously rejected, allow re-request by updating
      const updatedRequest = await prisma.orgJoinRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'PENDING',
          message: message?.trim() || null,
          reviewedAt: null,
          reviewNotes: null,
        },
        include: {
          organization: { select: { name: true } },
        },
      });

      // Send confirmation email for re-request
      if (session.user.email) {
        await sendJoinRequestSubmittedEmail({
          to: session.user.email,
          userName: session.user.name || 'User',
          orgName: updatedRequest.organization.name,
        });
      }

      return NextResponse.json(updatedRequest, { status: 200 });
    }

    const joinRequest = await prisma.orgJoinRequest.create({
      data: {
        userId: userId,
        organizationId: orgId,
        message: message?.trim() || null,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    // Send confirmation email
    if (session.user.email) {
      await sendJoinRequestSubmittedEmail({
        to: session.user.email,
        userName: session.user.name || 'User',
        orgName: joinRequest.organization.name,
      });
    }

    return NextResponse.json(joinRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a join request (org admin/owner only)
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';

    // Check if user is an org admin/owner
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: orgId,
          },
        },
      });

      if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Not authorized to manage join requests' },
          { status: 403 }
        );
      }
    }

    const data = await req.json();
    const { requestId, action, reviewNotes } = data;

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Request ID and valid action (approve/reject) required' },
        { status: 400 }
      );
    }

    const joinRequest = await prisma.orgJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    });

    if (!joinRequest || joinRequest.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Add user as member and update request status
      await prisma.$transaction([
        prisma.organizationMember.create({
          data: {
            userId: joinRequest.userId,
            organizationId: orgId,
            role: 'MEMBER',
          },
        }),
        prisma.orgJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        }),
      ]);

      // Send approval email to the requester
      if (joinRequest.user.email) {
        const baseUrl = getBaseUrl();
        await sendEmail({
          to: joinRequest.user.email,
          subject: `You've been accepted to "${joinRequest.organization.name}"!`,
          title: 'Join Request Approved',
          content: `
            <p style="margin: 0 0 16px 0;">
              Hello ${joinRequest.user.name || 'User'},
            </p>
            <p style="margin: 0 0 16px 0;">
              Great news! Your request to join <strong>"${joinRequest.organization.name}"</strong> has been approved.
            </p>
            <div style="margin: 16px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>You're in!</strong><br>
                You are now a member of this organization and can view shared farms, requests, and resources.
              </p>
            </div>
          `,
          ctaText: 'Go to Dashboard',
          ctaUrl: `${baseUrl}/dashboard`,
          footerText:
            'You received this email because your request to join an organization on Paladin Farm & Ranch was approved.',
        });
      }

      return NextResponse.json({
        message: 'Join request approved',
        status: 'APPROVED',
      });
    } else {
      await prisma.orgJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      // Send rejection email to the requester
      if (joinRequest.user.email) {
        const baseUrl = getBaseUrl();
        const reasonBlock = reviewNotes
          ? `
            <div style="margin: 16px 0; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>Reason:</strong><br>
                ${reviewNotes}
              </p>
            </div>
          `
          : '';
        await sendEmail({
          to: joinRequest.user.email,
          subject: `Update on your request to join "${joinRequest.organization.name}"`,
          title: 'Join Request Update',
          content: `
            <p style="margin: 0 0 16px 0;">
              Hello ${joinRequest.user.name || 'User'},
            </p>
            <p style="margin: 0 0 16px 0;">
              We've reviewed your request to join <strong>"${joinRequest.organization.name}"</strong>.
            </p>
            <p style="margin: 0 0 16px 0;">
              Unfortunately, your request was not approved at this time.
            </p>
            ${reasonBlock}
            <p style="margin: 0;">
              You can browse other organizations or submit a new request in the future.
            </p>
          `,
          ctaText: 'View Organizations',
          ctaUrl: `${baseUrl}/organizations`,
          footerText:
            'You received this email because your request to join an organization on Paladin Farm & Ranch was reviewed.',
        });
      }

      return NextResponse.json({
        message: 'Join request rejected',
        status: 'REJECTED',
      });
    }
  } catch (error) {
    console.error('Error processing join request:', error);
    return NextResponse.json(
      { error: 'Failed to process join request' },
      { status: 500 }
    );
  }
}
