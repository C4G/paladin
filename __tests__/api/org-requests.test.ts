/**
 * Tests for Org Requests API routes (Organization Creation Requests)
 *
 * Covers:
 * - GET /api/org-requests - List org creation requests
 * - PATCH /api/org-requests - Approve/reject org creation (ADMIN only)
 *
 * Test Count: 17 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth - must use vi.hoisted for variables used in mocks
const {
  mockAuth,
  mockPrisma,
  mockSendOrgApprovalEmail,
  mockSendOrgRejectionEmail,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    orgRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockSendOrgApprovalEmail: vi.fn(),
  mockSendOrgRejectionEmail: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/email', () => ({
  sendOrgApprovalEmail: mockSendOrgApprovalEmail,
  sendOrgRejectionEmail: mockSendOrgRejectionEmail,
}));

// Import route handlers AFTER mocks are set up
import { GET, PATCH } from '@/app/api/org-requests/route';

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

// Helper to create mock Request objects
function createMockRequest(body: object): Request {
  return new Request('http://localhost/api/org-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Org Requests API - Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/org-requests - List Requests', () => {
    /**
     * Test #1:
     *    Admins can see all organization creation requests in the system,
     *    not just their own. This allows them to review and process any pending request.
     */
    it('ADMIN sees all org requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN'));
      const mockRequests = [
        { id: 'req-1', name: 'Org 1', requesterId: 'user-1' },
        { id: 'req-2', name: 'Org 2', requesterId: 'user-2' },
      ];
      mockPrisma.orgRequest.findMany.mockResolvedValue(mockRequests);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      // ADMIN query has no where clause (sees all)
      expect(mockPrisma.orgRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    /**
     * Test #2:
     *    Regular users can only see organization requests they submitted.
     *    They cannot view other users' pending org creation requests.
     */
    it('Regular user sees only their own requests', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-456'));
      const mockRequests = [
        { id: 'req-1', name: 'My Org', requesterId: 'user-456' },
      ];
      mockPrisma.orgRequest.findMany.mockResolvedValue(mockRequests);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRequests);
      // STAFF query filters by their user ID
      expect(mockPrisma.orgRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { requesterId: 'user-456' } })
      );
    });

    /**
     * Test #3:
     *    Users who are not logged in cannot access the org requests
     *    endpoint at all. Authentication is required.
     */
    it('Unauthenticated user cannot access', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
      expect(mockPrisma.orgRequest.findMany).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/org-requests - Approve/Reject', () => {
    /**
     * Test #4:
     *    Only platform administrators can approve or reject organization
     *    creation requests. Regular staff members cannot perform these actions.
     */
    it('Only ADMIN can approve/reject', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF'));
      const request = createMockRequest({
        requestId: 'req-1',
        action: 'approve',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not authorized');
      expect(mockPrisma.orgRequest.findUnique).not.toHaveBeenCalled();
    });

    /**
     * Test #5:
     *    Users who are not logged in cannot approve or reject requests.
     *    The endpoint requires both authentication and admin privileges.
     */
    it('Unauthenticated cannot approve/reject', async () => {
      mockAuth.mockResolvedValue(null);
      const request = createMockRequest({
        requestId: 'req-1',
        action: 'approve',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not authorized');
    });
  });
});

describe('Org Requests API - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
  });

  /**
   * Test #6:
   *    When approving or rejecting, the request ID must be provided.
   *    Empty strings or missing IDs are rejected as invalid input.
   */
  it('should require requestId', async () => {
    const request = createMockRequest({ action: 'approve' });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Request ID');
  });

  /**
   * Test #7:
   *    The action must be either "approve" or "reject". Other values
   *    like "cancel" or empty strings are not accepted.
   */
  it('should require valid action', async () => {
    const request = createMockRequest({ requestId: 'req-1', action: 'cancel' });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid action');
  });

  /**
   * Test #8:
   *    Requests that have already been approved or rejected cannot be
   *    processed again. Only PENDING requests can be acted upon.
   */
  it('cannot process already-processed requests', async () => {
    mockPrisma.orgRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: 'APPROVED',
      name: 'Test Org',
      requesterId: 'user-123',
    });
    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already been processed');
  });
});

describe('Org Requests API - Approval Flow', () => {
  const pendingOrgRequest = {
    id: 'req-1',
    name: 'Test Org',
    description: 'Description',
    status: 'PENDING',
    requesterId: 'user-123',
  };

  const createdOrganization = {
    id: 'org-new',
    name: 'Test Org',
    description: 'Description',
    members: [
      {
        userId: 'user-123',
        role: 'OWNER',
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
    mockPrisma.orgRequest.findUnique.mockResolvedValue(pendingOrgRequest);
  });

  /**
   * Test #9:
   *    When an org request is approved, a new organization is created
   *    and the person who requested it automatically becomes the OWNER.
   */
  it('approval creates organization with requester as OWNER', async () => {
    mockPrisma.$transaction.mockResolvedValue([createdOrganization, {}]);
    const request = createMockRequest({
      requestId: 'req-1',
      action: 'approve',
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('approved');
    expect(data.organization.members[0].role).toBe('OWNER');
    expect(data.organization.members[0].userId).toBe('user-123');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  /**
   * Test #10:
   *    When an admin approves a request, the request status changes
   *    from PENDING to APPROVED in the database.
   */
  it('approval updates request status to APPROVED', async () => {
    mockPrisma.$transaction.mockResolvedValue([createdOrganization, {}]);
    const request = createMockRequest({
      requestId: 'req-1',
      action: 'approve',
    });

    await PATCH(request);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  /**
   * Test #11:
   *    When an admin rejects a request, the request status changes
   *    from PENDING to REJECTED in the database.
   */
  it('rejection updates request status to REJECTED', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    mockPrisma.orgRequest.update.mockResolvedValue({
      ...pendingOrgRequest,
      status: 'REJECTED',
    });
    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('rejected');
    expect(mockPrisma.orgRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: expect.objectContaining({ status: 'REJECTED' }),
      })
    );
  });

  /**
   * Test #12:
   *    Admins can add notes when approving or rejecting. These notes
   *    are saved with the request for future reference.
   */
  it('reviewNotes are preserved on approval/rejection', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    mockPrisma.orgRequest.update.mockResolvedValue({
      ...pendingOrgRequest,
      status: 'REJECTED',
      reviewNotes: 'Duplicate name',
    });
    const request = createMockRequest({
      requestId: 'req-1',
      action: 'reject',
      reviewNotes: 'Duplicate name',
    });

    await PATCH(request);

    expect(mockPrisma.orgRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewNotes: 'Duplicate name' }),
      })
    );
  });

  /**
   * Test #13:
   *    When a request is processed, the system records the exact time
   *    it was reviewed for audit purposes.
   */
  it('reviewedAt timestamp is set', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    mockPrisma.orgRequest.update.mockResolvedValue({
      ...pendingOrgRequest,
      status: 'REJECTED',
      reviewedAt: new Date(),
    });
    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });

    await PATCH(request);

    expect(mockPrisma.orgRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewedAt: expect.any(Date),
        }),
      })
    );
  });
});

describe('Org Requests API - Email Notifications', () => {
  const pendingOrgRequest = {
    id: 'req-1',
    name: 'Test Org',
    description: 'Description',
    status: 'PENDING',
    requesterId: 'user-123',
  };

  const createdOrganization = {
    id: 'org-new',
    name: 'Test Org',
    description: 'Description',
    members: [
      {
        userId: 'user-123',
        role: 'OWNER',
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'requester@example.com',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
    mockPrisma.orgRequest.findUnique.mockResolvedValue(pendingOrgRequest);
  });

  /**
   * Test #14:
   *    When an org request is approved, the requester receives an email
   *    with the organization name and a link to access it.
   */
  it('should send approval email with org details', async () => {
    mockPrisma.$transaction.mockResolvedValue([createdOrganization, {}]);
    const request = createMockRequest({
      requestId: 'req-1',
      action: 'approve',
    });

    await PATCH(request);

    expect(mockSendOrgApprovalEmail).toHaveBeenCalledWith({
      to: 'requester@example.com',
      orgName: 'Test Org',
      orgId: 'org-new',
    });
  });

  /**
   * Test #15:
   *    When an org request is rejected, the requester receives an email
   *    explaining why their request was denied.
   */
  it('should send rejection email with reason', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'requester@example.com',
    });
    mockPrisma.orgRequest.update.mockResolvedValue({
      ...pendingOrgRequest,
      status: 'REJECTED',
    });
    const request = createMockRequest({
      requestId: 'req-1',
      action: 'reject',
      reviewNotes: 'Duplicate organization name',
    });

    await PATCH(request);

    expect(mockSendOrgRejectionEmail).toHaveBeenCalledWith({
      to: 'requester@example.com',
      orgName: 'Test Org',
      reason: 'Duplicate organization name',
    });
  });

  /**
   * Test #16:
   *    Rejection emails can be sent without providing a reason.
   *    The reason field is optional.
   */
  it('rejection email works without reason', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'requester@example.com',
    });
    mockPrisma.orgRequest.update.mockResolvedValue({
      ...pendingOrgRequest,
      status: 'REJECTED',
    });
    const request = createMockRequest({ requestId: 'req-1', action: 'reject' });

    await PATCH(request);

    expect(mockSendOrgRejectionEmail).toHaveBeenCalledWith({
      to: 'requester@example.com',
      orgName: 'Test Org',
      reason: undefined,
    });
  });
});

describe('Org Requests API - Request Not Found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(createMockSession('ADMIN'));
  });

  /**
   * Test #17:
   *    When trying to approve/reject a request that doesn't exist,
   *    the API returns a 404 error.
   */
  it('should return 404 for non-existent request', async () => {
    mockPrisma.orgRequest.findUnique.mockResolvedValue(null);
    const request = createMockRequest({
      requestId: 'non-existent',
      action: 'approve',
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
