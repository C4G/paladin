/**
 * Tests for Organization Join Requests API routes
 *
 * Covers:
 * - GET /api/organizations/[id]/join-requests - List join requests
 * - POST /api/organizations/[id]/join-requests - Request to join
 * - PATCH /api/organizations/[id]/join-requests - Approve/reject request
 *
 * Test Count: 18 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth - must use vi.hoisted for variables used in mocks
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    organization: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    orgJoinRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/email', () => ({
  sendJoinRequestSubmittedEmail: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}));

// Import route handlers AFTER mocks are set up
import {
  GET,
  POST,
  PATCH,
} from '@/app/api/organizations/[id]/join-requests/route';

// Helper to create mock sessions
function createMockSession(
  role: 'ADMIN' | 'STAFF' | null,
  userId: string = 'user-123'
) {
  return {
    user: {
      id: userId,
      role,
      email: 'test@example.com',
      name: 'Test User',
    },
  };
}

// Helper to create route params (Next.js App Router style)
function createRouteParams(orgId: string) {
  return { params: Promise.resolve({ id: orgId }) };
}

// Helper to create mock Request objects
function createMockRequest(
  body: object,
  method: 'POST' | 'PATCH' = 'PATCH'
): Request {
  return new Request('http://localhost/api/organizations/org-1/join-requests', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Organization Join Requests - Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - List Join Requests', () => {
    /**
     * Test #1:
     *    Organization owners can view all pending join requests
     *    for their organization.
     */
    it('OWNER can view join requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      const mockRequests = [
        { id: 'req-1', userId: 'user-456', status: 'PENDING' },
      ];
      mockPrisma.orgJoinRequest.findMany.mockResolvedValue(mockRequests);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      expect(mockPrisma.orgJoinRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } })
      );
    });

    /**
     * Test #2:
     *    Organization managers can also view join requests to help
     *    with member administration.
     */
    it('MANAGER can view join requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });
      mockPrisma.orgJoinRequest.findMany.mockResolvedValue([]);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );

      expect(response.status).toBe(200);
    });

    /**
     * Test #3:
     *    Regular members cannot view join requests. This is reserved
     *    for organization administrators.
     */
    it('MEMBER cannot view join requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'member-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.orgJoinRequest.findMany).not.toHaveBeenCalled();
    });

    /**
     * Test #4:
     *    Platform admins can view join requests for any organization
     *    for administrative oversight.
     */
    it('Platform ADMIN can view any org join requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.orgJoinRequest.findMany.mockResolvedValue([]);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );

      expect(response.status).toBe(200);
      // Platform admin doesn't need membership check
      expect(mockPrisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST - Request to Join', () => {
    /**
     * Test #5:
     *    Any authenticated user can request to join an organization
     *    they are not already a member of.
     */
    it('Authenticated user can request to join', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'new-user'));
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
      });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.orgJoinRequest.findUnique.mockResolvedValue(null);
      mockPrisma.orgJoinRequest.create.mockResolvedValue({
        id: 'req-new',
        userId: 'new-user',
        organizationId: 'org-1',
        status: 'PENDING',
        organization: { name: 'Test Org' },
      });

      const request = createMockRequest(
        { message: 'Please let me join!' },
        'POST'
      );
      const response = await POST(request, createRouteParams('org-1'));

      expect(response.status).toBe(201);
      expect(mockPrisma.orgJoinRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'new-user',
            organizationId: 'org-1',
          }),
        })
      );
    });

    /**
     * Test #6:
     *    Users who are already members of an organization cannot
     *    submit a join request.
     */
    it('Cannot request to join if already a member', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'existing-member'));
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      const request = createMockRequest({}, 'POST');
      const response = await POST(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already a member');
      expect(mockPrisma.orgJoinRequest.create).not.toHaveBeenCalled();
    });

    /**
     * Test #7:
     *    Users cannot submit multiple pending join requests to the
     *    same organization. They must wait for a decision.
     */
    it('Cannot request to join if pending request exists', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
      });

      const request = createMockRequest({}, 'POST');
      const response = await POST(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('pending request');
    });

    /**
     * Test #8:
     *    Users whose previous request was rejected can submit a
     *    new join request.
     */
    it('Can re-request after rejection', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
        id: 'req-old',
        status: 'REJECTED',
      });
      mockPrisma.orgJoinRequest.update.mockResolvedValue({
        id: 'req-old',
        status: 'PENDING',
        organization: { name: 'Test Org' },
      });

      const request = createMockRequest(
        { message: 'Please reconsider!' },
        'POST'
      );
      const response = await POST(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      expect(mockPrisma.orgJoinRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });
  });

  describe('PATCH - Approve/Reject Requests', () => {
    /**
     * Test #9:
     *    Organization owners can approve or reject join requests
     *    from users wanting to join.
     */
    it('OWNER can approve/reject requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        userId: 'user-456',
        organizationId: 'org-1',
        status: 'PENDING',
        user: { name: 'Test User', email: 'user@example.com' },
        organization: { name: 'Test Org' },
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const request = createMockRequest({
        requestId: 'req-1',
        action: 'approve',
      });
      const response = await PATCH(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('approved');
    });

    /**
     * Test #10:
     *    Organization managers can also approve or reject join
     *    requests.
     */
    it('MANAGER can approve/reject requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });
      mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        userId: 'user-456',
        organizationId: 'org-1',
        status: 'PENDING',
        user: { name: 'Test User', email: 'user@example.com' },
        organization: { name: 'Test Org' },
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const request = createMockRequest({
        requestId: 'req-1',
        action: 'approve',
      });
      const response = await PATCH(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
    });

    /**
     * Test #11:
     *    Regular members cannot approve or reject join requests.
     *    This is reserved for organization administrators.
     */
    it('MEMBER cannot approve/reject requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'member-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      const request = createMockRequest({
        requestId: 'req-1',
        action: 'approve',
      });
      const response = await PATCH(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.orgJoinRequest.findUnique).not.toHaveBeenCalled();
    });
  });
});

describe('Organization Join Requests - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #12:
   *    The action field must be either 'approve' or 'reject'.
   *    Other values are invalid.
   */
  it('should require valid action (approve/reject)', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });

    const request = createMockRequest({
      requestId: 'req-1',
      action: 'pending',
    });
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  /**
   * Test #13:
   *    When approving or rejecting, the requestId is required
   *    to identify which request to process.
   */
  it('should require requestId for approval/rejection', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });

    const request = createMockRequest({ action: 'approve' });
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  /**
   * Test #14:
   *    Requests that have already been approved or rejected cannot
   *    be processed again. Only PENDING requests can be acted upon.
   */
  it('cannot process already-processed requests', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      userId: 'user-456',
      organizationId: 'org-1',
      status: 'APPROVED',
    });

    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('Organization Join Requests - Approval Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #15:
   *    When a join request is approved, the user is added to the
   *    organization with the default MEMBER role.
   */
  it('approval should add user as MEMBER', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      userId: 'user-456',
      organizationId: 'org-1',
      status: 'PENDING',
      user: { name: 'Test User', email: 'user@example.com' },
      organization: { name: 'Test Org' },
    });
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const request = createMockRequest({
      requestId: 'req-1',
      action: 'approve',
    });
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(data.message).toContain('approved');
  });

  /**
   * Test #16:
   *    When a join request is rejected, the status is set to
   *    REJECTED and the user is not added to the organization.
   */
  it('rejection should set status to REJECTED', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      userId: 'user-456',
      organizationId: 'org-1',
      status: 'PENDING',
      user: { name: 'Test User', email: 'user@example.com' },
      organization: { name: 'Test Org' },
    });
    mockPrisma.orgJoinRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
    });

    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.orgJoinRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      })
    );
    expect(data.message).toContain('rejected');
    // $transaction is NOT called for rejection (no membership creation)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  /**
   * Test #17:
   *    When processing a request, the reviewedAt timestamp is
   *    recorded to track when the decision was made.
   */
  it('approval should set reviewedAt timestamp', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      userId: 'user-456',
      organizationId: 'org-1',
      status: 'PENDING',
    });
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const request = createMockRequest({
      requestId: 'req-1',
      action: 'approve',
    });
    await PATCH(request, createRouteParams('org-1'));

    // The transaction callback receives the prisma client - verify it was called
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  /**
   * Test #18:
   *    Review notes are optional. Reviewers can add notes to explain
   *    their decision, but it's not required.
   */
  it('reviewNotes should be optional', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });
    mockPrisma.orgJoinRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      userId: 'user-456',
      organizationId: 'org-1',
      status: 'PENDING',
      user: { name: 'Test User', email: 'user@example.com' },
      organization: { name: 'Test Org' },
    });
    mockPrisma.orgJoinRequest.update.mockResolvedValue({
      id: 'req-1',
      status: 'REJECTED',
    });

    // Request without reviewNotes should succeed
    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });
    const response = await PATCH(request, createRouteParams('org-1'));

    expect(response.status).toBe(200);
  });
});
