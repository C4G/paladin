import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string; jobId: string }>;
}

// GET: Get job status
export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId, jobId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const job = await prisma.bulkOperation.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        totalItems: true,
        processedItems: true,
        successCount: true,
        errorCount: true,
        skippedCount: true,
        errorDetails: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    });

    if (!job || job.organizationId !== orgId) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify access
    const isPlatformAdmin = session.user.role === 'ADMIN';
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: orgId,
          },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    let errorDetails: { email: string; error: string }[] = [];
    try {
      errorDetails = JSON.parse(job.errorDetails);
    } catch {
      errorDetails = [];
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successCount: job.successCount,
      errorCount: job.errorCount,
      skippedCount: job.skippedCount,
      errorDetails,
      createdAt: job.createdAt,
      createdBy: job.createdBy,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a job
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId, jobId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const job = await prisma.bulkOperation.findUnique({
      where: { id: jobId },
      select: { id: true, organizationId: true, status: true },
    });

    if (!job || job.organizationId !== orgId) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify access — must be org admin or platform admin
    const isPlatformAdmin = session.user.role === 'ADMIN';
    if (!isPlatformAdmin) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: orgId,
          },
        },
      });
      if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Not authorized to cancel jobs' },
          { status: 403 }
        );
      }
    }

    if (job.status !== 'processing') {
      return NextResponse.json(
        { error: 'Job is not currently processing' },
        { status: 400 }
      );
    }

    await prisma.bulkOperation.update({
      where: { id: jobId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
