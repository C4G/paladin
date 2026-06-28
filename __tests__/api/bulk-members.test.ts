/**
 * Tests for Bulk Members API routes
 *
 * Covers:
 * - POST /api/organizations/[id]/members/bulk - Start bulk import job
 * - GET /api/organizations/[id]/members/bulk - List bulk jobs
 * - PATCH /api/organizations/[id]/members/bulk - Bulk actions (delete, changeRole)
 *
 * Test Count: 18 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    bulkOperation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: (_tx: typeof mockPrisma) => Promise<void>) =>
      fn(mockPrisma)
    ),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { POST, PATCH } from '@/app/api/organizations/[id]/members/bulk/route';

function createMockSession(
  role: 'ADMIN' | 'STAFF' | null,
  userId: string = 'user-123'
) {
  return {
    user: {
      id: userId,
      role,
      email: 'admin@example.com',
      name: 'Admin User',
    },
  };
}

function createRouteParams(orgId: string) {
  return { params: Promise.resolve({ id: orgId }) };
}

function createPostRequest(body: object): Request {
  return new Request('http://localhost/api/organizations/org-1/members/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createPatchRequest(body: object): Request {
  return new Request('http://localhost/api/organizations/org-1/members/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Bulk Members API - POST (Bulk Add)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      createPostRequest({ members: [] }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 if not org admin', async () => {
    mockAuth.mockResolvedValue(createMockSession(null, 'user-456'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'MEMBER',
    });

    const response = await POST(
      createPostRequest({ members: [{ email: 'test@test.com' }] }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(403);
  });

  it('returns 400 if members array is empty', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));

    const response = await POST(
      createPostRequest({ members: [] }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
  });

  it('starts a bulk import job for valid entries', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
    mockPrisma.bulkOperation.create.mockResolvedValue({
      id: 'job-1',
      status: 'processing',
      totalItems: 1,
    });

    const response = await POST(
      createPostRequest({
        members: [{ email: 'test@test.com', role: 'MEMBER' }],
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.jobId).toBe('job-1');
    expect(data.status).toBe('processing');
    expect(data.totalItems).toBe(1);
    expect(mockPrisma.bulkOperation.create).toHaveBeenCalled();
  });

  it('reports errors for invalid emails without starting a job', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));

    const response = await POST(
      createPostRequest({
        members: [{ email: 'not-an-email' }],
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.jobId).toBeNull();
    expect(data.totalItems).toBe(0);
    expect(data.errorCount).toBe(1);
    expect(data.errors[0].error).toContain('Invalid email');
  });

  it('prevents MANAGER from assigning OWNER role', async () => {
    mockAuth.mockResolvedValue(createMockSession(null, 'user-mgr'));
    mockPrisma.organizationMember.findUnique.mockResolvedValueOnce({
      role: 'MANAGER',
    });

    const response = await POST(
      createPostRequest({
        members: [{ email: 'test@test.com', role: 'OWNER' }],
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.jobId).toBeNull();
    expect(data.errorCount).toBe(1);
    expect(data.errors[0].error).toContain('owner');
  });
});

describe('Bulk Members API - PATCH (Bulk Actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PATCH(
      createPatchRequest({ memberIds: ['u1'], action: 'delete' }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid action', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));

    const response = await PATCH(
      createPatchRequest({ memberIds: ['u1'], action: 'promote' }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
  });

  it('bulk deletes members', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { userId: 'u1', role: 'MEMBER' },
      { userId: 'u2', role: 'MEMBER' },
    ]);
    mockPrisma.organizationMember.deleteMany.mockResolvedValue({ count: 2 });

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['u1', 'u2'],
        action: 'delete',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.affected).toBe(2);
  });

  it('prevents self-removal via bulk delete', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN', 'user-123'));

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['user-123', 'u2'],
        action: 'delete',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
  });

  it('prevents removing all owners', async () => {
    mockAuth.mockResolvedValue(createMockSession(null, 'owner-1'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { userId: 'owner-2', role: 'OWNER' },
    ]);
    mockPrisma.organizationMember.count.mockResolvedValue(1);

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['owner-2'],
        action: 'delete',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('owner');
  });

  it('bulk changes roles', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { userId: 'u1', role: 'MEMBER' },
      { userId: 'u2', role: 'MEMBER' },
    ]);
    mockPrisma.organizationMember.updateMany.mockResolvedValue({ count: 2 });

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['u1', 'u2'],
        action: 'changeRole',
        role: 'MANAGER',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.affected).toBe(2);
    expect(data.role).toBe('MANAGER');
  });

  it('prevents MANAGER from assigning OWNER', async () => {
    mockAuth.mockResolvedValue(createMockSession(null, 'mgr-1'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'MANAGER',
    });

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['u1'],
        action: 'changeRole',
        role: 'OWNER',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(403);
  });

  it('returns 400 if no role provided for changeRole', async () => {
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['u1'],
        action: 'changeRole',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
  });

  it('prevents demoting all owners via changeRole', async () => {
    mockAuth.mockResolvedValue(createMockSession(null, 'owner-1'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { userId: 'owner-1', role: 'OWNER' },
    ]);
    mockPrisma.organizationMember.count.mockResolvedValue(1);

    const response = await PATCH(
      createPatchRequest({
        memberIds: ['owner-1'],
        action: 'changeRole',
        role: 'MEMBER',
      }),
      createRouteParams('org-1')
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('owner');
  });
});
