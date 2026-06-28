import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { OrgRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CHUNK_SIZE = 200;

// Helper to check org admin permissions
async function checkOrgAdminAccess(
  userId: string,
  orgId: string,
  isPlatformAdmin: boolean
) {
  if (isPlatformAdmin) return { authorized: true, membership: null };

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
  });

  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) {
    return { authorized: false, membership };
  }

  return { authorized: true, membership };
}

interface BulkInviteEntry {
  email: string;
  name?: string;
  role?: string;
}

// ---------- Background chunk processing ----------

async function processChunk(orgId: string, entries: BulkInviteEntry[]) {
  const emails = entries.map((e) => e.email);

  // Batch lookup existing users
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, emailVerified: true },
  });
  const userByEmail = new Map(existingUsers.map((u) => [u.email, u]));

  // Batch lookup existing memberships
  const existingUserIds = existingUsers.map((u) => u.id);
  const existingMemberships =
    existingUserIds.length > 0
      ? await prisma.organizationMember.findMany({
          where: { organizationId: orgId, userId: { in: existingUserIds } },
          select: { userId: true },
        })
      : [];
  const memberUserIds = new Set(existingMemberships.map((m) => m.userId));

  const toCreateUsers: { email: string; name: string | null }[] = [];
  const toCreateMemberships: {
    email: string;
    role: string;
    userId?: string;
    isNew: boolean;
  }[] = [];

  let skipped = 0;
  const errors: { email: string; error: string }[] = [];

  for (const entry of entries) {
    const existingUser = userByEmail.get(entry.email);

    if (existingUser && memberUserIds.has(existingUser.id)) {
      skipped++;
      continue;
    }

    if (existingUser) {
      toCreateMemberships.push({
        email: entry.email,
        role: entry.role || 'MEMBER',
        userId: existingUser.id,
        isNew: false,
      });
    } else {
      toCreateUsers.push({ email: entry.email, name: entry.name || null });
      toCreateMemberships.push({
        email: entry.email,
        role: entry.role || 'MEMBER',
        isNew: true,
      });
    }
  }

  let successCount = 0;

  if (toCreateMemberships.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        if (toCreateUsers.length > 0) {
          await tx.user.createMany({
            data: toCreateUsers,
            skipDuplicates: true,
          });
          const newUsers = await tx.user.findMany({
            where: { email: { in: toCreateUsers.map((u) => u.email) } },
            select: { id: true, email: true },
          });
          for (const u of newUsers) {
            const m = toCreateMemberships.find(
              (mem) => mem.email === u.email && mem.isNew
            );
            if (m) m.userId = u.id;
          }
        }

        const membershipData = toCreateMemberships
          .filter((m) => m.userId)
          .map((m) => ({
            userId: m.userId!,
            organizationId: orgId,
            role: m.role as OrgRole,
          }));

        if (membershipData.length > 0) {
          await tx.organizationMember.createMany({
            data: membershipData,
            skipDuplicates: true,
          });
        }
      });
      successCount = toCreateMemberships.filter((m) => m.userId).length;
    } catch (error) {
      console.error('Chunk transaction error:', error);
      for (const m of toCreateMemberships) {
        errors.push({ email: m.email, error: 'Transaction failed' });
      }
    }
  }

  return {
    processed: entries.length,
    successCount,
    skipped,
    errorCount: errors.length,
    errors,
  };
}

async function processJob(jobId: string, orgId: string) {
  try {
    const job = await prisma.bulkOperation.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'processing') return;

    const entries: BulkInviteEntry[] = JSON.parse(job.payload);
    let offset = job.processedItems;
    let successCount = job.successCount;
    let errorCount = job.errorCount;
    let skippedCount = job.skippedCount;
    let allErrors: { email: string; error: string }[] = [];
    try {
      allErrors = JSON.parse(job.errorDetails);
    } catch {
      allErrors = [];
    }

    while (offset < entries.length) {
      // Check for cancellation before each chunk
      const current = await prisma.bulkOperation.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (!current || current.status === 'cancelled') return;

      const chunk = entries.slice(offset, offset + CHUNK_SIZE);
      const result = await processChunk(orgId, chunk);

      offset += result.processed;
      successCount += result.successCount;
      errorCount += result.errorCount;
      skippedCount += result.skipped;
      if (result.errors.length > 0) {
        allErrors = [...allErrors, ...result.errors].slice(0, 1000);
      }

      await prisma.bulkOperation.update({
        where: { id: jobId },
        data: {
          processedItems: offset,
          successCount,
          errorCount,
          skippedCount,
          errorDetails: JSON.stringify(allErrors),
        },
      });
    }

    await prisma.bulkOperation.update({
      where: { id: jobId },
      data: { status: 'completed' },
    });
  } catch (error) {
    console.error(`Bulk job ${jobId} failed:`, error);
    await prisma.bulkOperation
      .update({
        where: { id: jobId },
        data: { status: 'failed' },
      })
      .catch(() => {});
  }
}

// ---------- POST: Start a bulk import job ----------

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';
    const { authorized, membership } = await checkOrgAdminAccess(
      userId,
      orgId,
      isPlatformAdmin
    );

    if (!authorized) {
      return NextResponse.json(
        { error: 'Not authorized to add members' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { members } = data as { members: BulkInviteEntry[] };

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'Members array is required' },
        { status: 400 }
      );
    }

    // Validate and normalize
    const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];
    const validEntries: BulkInviteEntry[] = [];
    const initialErrors: { email: string; error: string }[] = [];
    const seenEmails = new Set<string>();

    for (const entry of members) {
      const email = entry.email?.trim()?.toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        initialErrors.push({
          email: entry.email || '(empty)',
          error: 'Invalid email address',
        });
        continue;
      }

      const role = (entry.role?.toUpperCase() || 'MEMBER').trim();
      if (!validRoles.includes(role)) {
        initialErrors.push({ email, error: `Invalid role: ${entry.role}` });
        continue;
      }

      if (
        role === 'OWNER' &&
        membership?.role !== 'OWNER' &&
        !isPlatformAdmin
      ) {
        initialErrors.push({
          email,
          error: 'Only owners can assign owner role',
        });
        continue;
      }

      if (seenEmails.has(email)) {
        initialErrors.push({ email, error: 'Duplicate email in upload' });
        continue;
      }
      seenEmails.add(email);
      validEntries.push({ email, name: entry.name?.trim(), role });
    }

    if (validEntries.length === 0) {
      return NextResponse.json(
        {
          jobId: null,
          totalItems: 0,
          errorCount: initialErrors.length,
          errors: initialErrors,
        },
        { status: 201 }
      );
    }

    // Create job record
    const job = await prisma.bulkOperation.create({
      data: {
        organizationId: orgId,
        status: 'processing',
        totalItems: validEntries.length,
        processedItems: 0,
        successCount: 0,
        errorCount: initialErrors.length,
        skippedCount: 0,
        payload: JSON.stringify(validEntries),
        errorDetails: JSON.stringify(initialErrors),
        createdById: userId,
      },
    });

    // Fire-and-forget background processing
    processJob(job.id, orgId).catch((err) =>
      console.error('Background job error:', err)
    );

    return NextResponse.json(
      {
        jobId: job.id,
        totalItems: validEntries.length,
        errorCount: initialErrors.length,
        status: 'processing',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error starting bulk job:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk import' },
      { status: 500 }
    );
  }
}

// ---------- GET: List active/recent bulk jobs ----------

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
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

    const jobs = await prisma.bulkOperation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        totalItems: true,
        processedItems: true,
        successCount: true,
        errorCount: true,
        skippedCount: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error listing jobs:', error);
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 });
  }
}

// ---------- PATCH: Bulk actions on existing members (delete / changeRole) ----------

interface BulkActionPayload {
  memberIds?: string[];
  selectAll?: boolean;
  excludeIds?: string[];
  search?: string;
  roleFilter?: string;
  action: 'delete' | 'changeRole';
  role?: string;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: orgId } = await params;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const isPlatformAdmin = session.user.role === 'ADMIN';
    const { authorized, membership } = await checkOrgAdminAccess(
      userId,
      orgId,
      isPlatformAdmin
    );

    if (!authorized) {
      return NextResponse.json(
        { error: 'Not authorized to manage members' },
        { status: 403 }
      );
    }

    const data: BulkActionPayload = await req.json();
    const { action, role, selectAll, search, roleFilter, excludeIds } = data;
    const { memberIds } = data;

    if (!action || !['delete', 'changeRole'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "delete" or "changeRole"' },
        { status: 400 }
      );
    }

    if (action === 'changeRole') {
      const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];
      if (!role || !validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Valid role is required for changeRole action' },
          { status: 400 }
        );
      }
      if (
        role === 'OWNER' &&
        membership?.role !== 'OWNER' &&
        !isPlatformAdmin
      ) {
        return NextResponse.json(
          { error: 'Only owners can assign owner role' },
          { status: 403 }
        );
      }
    }

    // ---------- selectAll path: use filter-based where clause directly ----------
    if (selectAll) {
      const filterWhere: Record<string, unknown> = { organizationId: orgId };
      const validRoles = ['OWNER', 'MANAGER', 'MEMBER'];
      if (roleFilter && validRoles.includes(roleFilter)) {
        filterWhere.role = roleFilter;
      }
      if (search) {
        filterWhere.user = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
      }
      // Always exclude self + any manually excluded IDs
      const allExcluded = new Set([userId, ...(excludeIds || [])]);
      filterWhere.userId = { notIn: Array.from(allExcluded) };

      // Count how many match
      const matchCount = await prisma.organizationMember.count({
        where: filterWhere,
      });
      if (matchCount === 0) {
        return NextResponse.json(
          { error: 'No members matched the filters' },
          { status: 400 }
        );
      }

      if (action === 'delete') {
        // Self is already excluded via filterWhere.userId notIn

        // Check manager can't delete owners
        if (!isPlatformAdmin && membership?.role === 'MANAGER') {
          const ownerCount = await prisma.organizationMember.count({
            where: { ...filterWhere, role: 'OWNER' },
          });
          if (ownerCount > 0) {
            return NextResponse.json(
              { error: 'Managers cannot remove owners' },
              { status: 403 }
            );
          }
        }

        // Protect last owner
        if (!isPlatformAdmin) {
          const totalOwners = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: 'OWNER' },
          });
          const ownersInFilter = await prisma.organizationMember.count({
            where: { ...filterWhere, role: 'OWNER' },
          });
          if (ownersInFilter > 0 && ownersInFilter >= totalOwners) {
            return NextResponse.json(
              {
                error:
                  'Cannot remove all owners. At least one owner must remain.',
              },
              { status: 400 }
            );
          }
        }

        const result = await prisma.organizationMember.deleteMany({
          where: filterWhere,
        });
        return NextResponse.json({
          success: true,
          action: 'delete',
          affected: result.count,
        });
      }

      if (action === 'changeRole') {
        // Check manager can't change owners
        if (!isPlatformAdmin && membership?.role === 'MANAGER') {
          const ownerCount = await prisma.organizationMember.count({
            where: { ...filterWhere, role: 'OWNER' },
          });
          if (ownerCount > 0) {
            return NextResponse.json(
              { error: 'Managers cannot change owner roles' },
              { status: 403 }
            );
          }
        }

        // Protect last owner from demotion
        if (role !== 'OWNER') {
          const totalOwners = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: 'OWNER' },
          });
          const ownersInFilter = await prisma.organizationMember.count({
            where: { ...filterWhere, role: 'OWNER' },
          });
          if (ownersInFilter > 0 && ownersInFilter >= totalOwners) {
            return NextResponse.json(
              {
                error:
                  'Cannot demote all owners. At least one owner must remain.',
              },
              { status: 400 }
            );
          }
        }

        const result = await prisma.organizationMember.updateMany({
          where: filterWhere,
          data: { role: role as OrgRole },
        });
        return NextResponse.json({
          success: true,
          action: 'changeRole',
          role,
          affected: result.count,
        });
      }
    }

    // ---------- ID-based path: page-level selection ----------
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'No members matched the selection' },
        { status: 400 }
      );
    }

    const targetMembers = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, userId: { in: memberIds } },
    });

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: 'No matching members found' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      if (memberIds.includes(userId)) {
        return NextResponse.json(
          { error: 'Cannot remove yourself via bulk action' },
          { status: 400 }
        );
      }

      if (!isPlatformAdmin && membership?.role === 'MANAGER') {
        if (targetMembers.some((m) => m.role === 'OWNER')) {
          return NextResponse.json(
            { error: 'Managers cannot remove owners' },
            { status: 403 }
          );
        }
      }

      const ownerIdsBeingRemoved = targetMembers
        .filter((m) => m.role === 'OWNER')
        .map((m) => m.userId);
      if (ownerIdsBeingRemoved.length > 0 && !isPlatformAdmin) {
        const totalOwners = await prisma.organizationMember.count({
          where: { organizationId: orgId, role: 'OWNER' },
        });
        if (ownerIdsBeingRemoved.length >= totalOwners) {
          return NextResponse.json(
            {
              error:
                'Cannot remove all owners. At least one owner must remain.',
            },
            { status: 400 }
          );
        }
      }

      const result = await prisma.organizationMember.deleteMany({
        where: { organizationId: orgId, userId: { in: memberIds } },
      });

      return NextResponse.json({
        success: true,
        action: 'delete',
        affected: result.count,
      });
    }

    if (action === 'changeRole') {
      if (!isPlatformAdmin && membership?.role === 'MANAGER') {
        if (targetMembers.some((m) => m.role === 'OWNER')) {
          return NextResponse.json(
            { error: 'Managers cannot change owner roles' },
            { status: 403 }
          );
        }
      }

      if (role !== 'OWNER') {
        const ownersBeingDemoted = targetMembers.filter(
          (m) => m.role === 'OWNER'
        );
        if (ownersBeingDemoted.length > 0) {
          const totalOwners = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: 'OWNER' },
          });
          if (ownersBeingDemoted.length >= totalOwners) {
            return NextResponse.json(
              {
                error:
                  'Cannot demote all owners. At least one owner must remain.',
              },
              { status: 400 }
            );
          }
        }
      }

      const result = await prisma.organizationMember.updateMany({
        where: { organizationId: orgId, userId: { in: memberIds } },
        data: { role: role as OrgRole },
      });

      return NextResponse.json({
        success: true,
        action: 'changeRole',
        role,
        affected: result.count,
      });
    }
  } catch (error) {
    console.error('Error in bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}
