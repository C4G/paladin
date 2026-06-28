/**
 * Tests for Organizations API routes
 *
 * Covers:
 * - GET /api/organizations - List organizations (ADMIN sees all, users see their own)
 * - POST /api/organizations - Request new organization creation
 * - GET /api/organizations/[id] - Get organization details
 * - PUT /api/organizations/[id] - Update organization
 * - DELETE /api/organizations/[id] - Delete organization (ADMIN only)
 * - GET /api/organizations/search - Search organizations
 *
 * Test Count: 19 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and prisma using vi.hoisted for proper hoisting
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
    },
    orgRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    orgJoinRequest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import route handlers AFTER mocks
import { GET, POST } from '@/app/api/organizations/route';
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from '@/app/api/organizations/[id]/route';
import { GET as SEARCH } from '@/app/api/organizations/search/route';

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

// Helper to create mock Request
function createMockRequest(
  body: object,
  method: 'POST' | 'PUT' = 'POST'
): Request {
  return new Request('http://localhost/api/organizations', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Organizations API - Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/organizations - Listing', () => {
    /**
     * Test #1:
     *    Admins can see all organizations in the system, regardless of
     *    membership. This allows them to manage the entire platform.
     */
    it('ADMIN should see all organizations', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      const mockOrgs = [
        { id: 'org-1', name: 'Org 1' },
        { id: 'org-2', name: 'Org 2' },
      ];
      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOrgs);
      // Admin query has no where clause filtering by membership
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.any(Object),
          orderBy: { name: 'asc' },
        })
      );
    });

    /**
     * Test #2:
     *    Regular users can only see organizations they belong to.
     *    They cannot browse or access other organizations.
     */
    it('Regular user should only see orgs they belong to', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-456'));
      const mockOrgs = [{ id: 'org-1', name: 'My Org' }];
      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOrgs);
      // Regular user query filters by membership
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: { some: { userId: 'user-456' } },
          },
        })
      );
    });

    /**
     * Test #3:
     *    Users who are not logged in cannot access the organizations
     *    endpoint. Authentication is required.
     */
    it('Unauthenticated request should be denied', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Not authenticated');
      expect(mockPrisma.organization.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/organizations/[id] - Details', () => {
    /**
     * Test #4:
     *    Platform admins can view details of any organization, even
     *    ones they are not a member of.
     */
    it('ADMIN can view any organization details', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      const mockOrg = { id: 'org-1', name: 'Test Org', members: [] };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const response = await GET_BY_ID(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOrg);
      // Admin doesn't need membership check
      expect(mockPrisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    /**
     * Test #5:
     *    Organization members can view details of their own
     *    organization including the member list and farms.
     */
    it('Member can view their organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });
      const mockOrg = { id: 'org-1', name: 'My Org', members: [] };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const response = await GET_BY_ID(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );

      expect(response.status).toBe(200);
    });

    /**
     * Test #6:
     *    Non-members cannot view organization details. They must
     *    join the organization first or be a platform admin.
     */
    it('Non-member cannot view organization details', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const response = await GET_BY_ID(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
    });
  });

  describe('PUT /api/organizations/[id] - Update', () => {
    /**
     * Test #7:
     *    Organization owners have full control and can update
     *    the organization name and description.
     */
    it('OWNER can update organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        name: 'Updated Name',
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      expect(mockPrisma.organization.update).toHaveBeenCalled();
    });

    /**
     * Test #8:
     *    Organization managers can also update organization
     *    details like name and description.
     */
    it('MANAGER can update organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        name: 'Updated Name',
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
    });

    /**
     * Test #9:
     *    Regular members cannot update organization details.
     *    They have read-only access to the organization.
     */
    it('MEMBER cannot update organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'member-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    /**
     * Test #10:
     *    Platform admins can update any organization, even ones
     *    they are not a member of.
     */
    it('Platform ADMIN can update any organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        name: 'Updated Name',
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      // Platform admin doesn't need membership check
      expect(mockPrisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/organizations/[id]', () => {
    /**
     * Test #11:
     *    Only platform administrators can delete organizations.
     *    This is a destructive action reserved for system admins.
     */
    it('Only platform ADMIN can delete organizations', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.organization.delete.mockResolvedValue({ id: 'org-1' });

      const response = await DELETE(
        new Request('http://localhost', { method: 'DELETE' }),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
    });

    /**
     * Test #12:
     *    Even organization owners cannot delete their organization.
     *    Deletion requires platform admin privileges.
     */
    it('Even org OWNER cannot delete organization', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));

      const response = await DELETE(
        new Request('http://localhost', { method: 'DELETE' }),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.organization.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Organizations API - Request Creation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #13:
   *    When creating an org request, the organization name is required.
   *    Empty names are rejected.
   */
  it('should require organization name', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));

    const request = createMockRequest({ name: '', description: 'Test desc' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name is required');
    expect(mockPrisma.orgRequest.create).not.toHaveBeenCalled();
  });

  /**
   * Test #14:
   *    Valid organization requests with a name and optional description
   *    are accepted for admin review.
   */
  it('should accept valid organization request', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.orgRequest.findFirst.mockResolvedValue(null);
    mockPrisma.orgRequest.create.mockResolvedValue({
      id: 'req-1',
      name: 'Test Org',
      description: 'Test description',
      requesterId: 'user-123',
      requester: { name: 'Test User', email: 'test@example.com' },
    });

    const request = createMockRequest({
      name: 'Test Org',
      description: 'Test description',
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPrisma.orgRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Org',
          requesterId: 'user-123',
        }),
      })
    );
  });

  /**
   * Test #15:
   *    Users cannot submit multiple pending org requests. They must
   *    wait for their existing request to be processed first.
   */
  it('should prevent duplicate pending requests from same user', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.orgRequest.findFirst.mockResolvedValue({
      id: 'req-1',
      status: 'PENDING',
      requesterId: 'user-123',
    });

    const request = createMockRequest({ name: 'Another Org' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('pending');
    expect(mockPrisma.orgRequest.create).not.toHaveBeenCalled();
  });

  /**
   * Test #16:
   *    If a user has no pending request, they can submit a new
   *    organization creation request.
   */
  it('should allow new request if no pending request exists', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.orgRequest.findFirst.mockResolvedValue(null);
    mockPrisma.orgRequest.create.mockResolvedValue({
      id: 'req-1',
      name: 'New Org',
      requesterId: 'user-123',
      requester: { name: 'Test User', email: 'test@example.com' },
    });

    const request = createMockRequest({ name: 'New Org' });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPrisma.orgRequest.create).toHaveBeenCalled();
  });
});

describe('Organizations Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #17:
   *    When searching organizations, the results show which ones the
   *    user is already a member of.
   */
  it('should mark organizations where user is already a member', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organization.findMany.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Test Org',
        members: [{ id: 'member-1' }],
        _count: { members: 5, farms: 2 },
      },
    ]);
    mockPrisma.orgJoinRequest.findMany.mockResolvedValue([]);

    const request = new Request(
      'http://localhost/api/organizations/search?q=Test'
    );
    const response = await SEARCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].isMember).toBe(true);
    expect(data[0].hasPendingRequest).toBe(false);
  });

  /**
   * Test #18:
   *    Search results indicate which organizations have pending join
   *    requests from the current user.
   */
  it('should mark organizations with pending join requests', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organization.findMany.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Test Org',
        members: [],
        _count: { members: 5, farms: 2 },
      },
    ]);
    mockPrisma.orgJoinRequest.findMany.mockResolvedValue([
      { organizationId: 'org-1' },
    ]);

    const request = new Request(
      'http://localhost/api/organizations/search?q=Test'
    );
    const response = await SEARCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].isMember).toBe(false);
    expect(data[0].hasPendingRequest).toBe(true);
  });

  /**
   * Test #19:
   *    Organizations where the user is not a member and has no pending
   *    request are available to join.
   */
  it('should identify orgs available to join', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organization.findMany.mockResolvedValue([
      {
        id: 'org-3',
        name: 'Available Org',
        members: [],
        _count: { members: 3, farms: 1 },
      },
    ]);
    mockPrisma.orgJoinRequest.findMany.mockResolvedValue([]);

    const request = new Request(
      'http://localhost/api/organizations/search?q=Available'
    );
    const response = await SEARCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].isMember).toBe(false);
    expect(data[0].hasPendingRequest).toBe(false);
  });
});
