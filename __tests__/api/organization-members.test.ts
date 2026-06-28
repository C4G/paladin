/**
 * Tests for Organization Members API routes
 *
 * Covers:
 * - GET /api/organizations/[id]/members - List members
 * - POST /api/organizations/[id]/members - Add member
 * - DELETE /api/organizations/[id]/members - Remove member
 * - PATCH /api/organizations/[id]/members - Update member role
 *
 * Test Count: 21 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and prisma using vi.hoisted for proper hoisting
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
import {
  GET,
  POST,
  DELETE,
  PATCH,
} from '@/app/api/organizations/[id]/members/route';

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
  method: 'POST' | 'PATCH' = 'POST'
): Request {
  return new Request('http://localhost/api/organizations/org-1/members', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Organization Members - Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/organizations/[id]/members - List Members', () => {
    /**
     * Test #1:
     *    Members of an organization can view the full member list
     *    including names, emails, and roles.
     */
    it('Members can view member list', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'member-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });
      const mockMembers = [{ id: 'm1', userId: 'user-1', role: 'OWNER' }];
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers);
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toEqual(mockMembers);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
    });

    /**
     * Test #2:
     *    Non-members cannot access the member list. They must join
     *    the organization first.
     */
    it('Non-members cannot view member list', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'outsider-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.organizationMember.findMany).not.toHaveBeenCalled();
    });

    /**
     * Test #3:
     *    Platform admins can view member lists of any organization
     *    for administrative oversight.
     */
    it('Platform ADMIN can view any org member list', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      const mockMembers = [{ id: 'm1', userId: 'user-1', role: 'OWNER' }];
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers);

      const response = await GET(
        new Request('http://localhost'),
        createRouteParams('org-1')
      );

      expect(response.status).toBe(200);
      // Platform admin doesn't need membership check
      expect(mockPrisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/organizations/[id]/members - Add Member', () => {
    /**
     * Test #4:
     *    Organization owners can add new members to the organization
     *    by email address.
     */
    it('OWNER can add members', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: 'OWNER' }) // membership check
        .mockResolvedValueOnce(null); // existing member check
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
      });
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: 'new-member',
        userId: 'new-user',
        role: 'MEMBER',
      });

      const request = createMockRequest({
        email: 'new@test.com',
        role: 'MEMBER',
      });
      const response = await POST(request, createRouteParams('org-1'));

      expect(response.status).toBe(201);
      expect(mockPrisma.organizationMember.create).toHaveBeenCalled();
    });

    /**
     * Test #5:
     *    Organization managers can also add new members to help
     *    with organization administration.
     */
    it('MANAGER can add members', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique
        .mockResolvedValueOnce({ role: 'MANAGER' })
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
      });
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: 'new-member',
        userId: 'new-user',
        role: 'MEMBER',
      });

      const request = createMockRequest({ email: 'new@test.com' });
      const response = await POST(request, createRouteParams('org-1'));

      expect(response.status).toBe(201);
    });

    /**
     * Test #6:
     *    Regular members cannot add other members. Only owners and
     *    managers have this privilege.
     */
    it('MEMBER cannot add members', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'member-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });

      const request = createMockRequest({ email: 'new@test.com' });
      const response = await POST(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Not authorized');
      expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
    });

    /**
     * Test #7:
     *    Platform admins can add members to any organization
     *    for administrative purposes.
     */
    it('Platform ADMIN can add members to any org', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
      });
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: 'new-member',
        userId: 'new-user',
        role: 'MEMBER',
      });

      const request = createMockRequest({ email: 'new@test.com' });
      const response = await POST(request, createRouteParams('org-1'));

      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/organizations/[id]/members - Remove Member', () => {
    /**
     * Test #8:
     *    Users can always remove themselves from an organization
     *    (leave voluntarily).
     */
    it('Users can remove themselves (leave org)', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-123',
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      const request = new Request(
        'http://localhost/api/organizations/org-1/members?memberId=user-123',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    /**
     * Test #9:
     *    Organization owners can remove any member except the last
     *    owner (to prevent orphaned organizations).
     */
    it('OWNER can remove other members', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      const request = new Request(
        'http://localhost/api/organizations/org-1/members?memberId=other-user',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      expect(mockPrisma.organizationMember.delete).toHaveBeenCalled();
    });

    /**
     * Test #10:
     *    Managers cannot remove owners. This protects organization
     *    ownership from being usurped by managers.
     */
    it('MANAGER cannot remove OWNER', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'owner-member',
        userId: 'owner-user',
        role: 'OWNER',
      });
      mockPrisma.organizationMember.count.mockResolvedValue(2);

      const request = new Request(
        'http://localhost/api/organizations/org-1/members?memberId=owner-user',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(mockPrisma.organizationMember.delete).not.toHaveBeenCalled();
    });

    /**
     * Test #11:
     *    The last owner of an organization cannot be removed by
     *    regular users. This prevents orphaned organizations.
     */
    it('Cannot remove last OWNER (unless platform admin)', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'owner-member',
        userId: 'owner-123',
        role: 'OWNER',
      });
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      const request = new Request(
        'http://localhost/api/organizations/org-1/members?memberId=owner-123',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('only owner');
      expect(mockPrisma.organizationMember.delete).not.toHaveBeenCalled();
    });

    /**
     * Test #12:
     *    Platform admins can remove the last owner if needed (e.g.,
     *    to clean up or transfer ownership).
     */
    it('Platform ADMIN can remove last OWNER', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'owner-member',
        userId: 'owner-user',
        role: 'OWNER',
      });
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      const request = new Request(
        'http://localhost/api/organizations/org-1/members?memberId=owner-user',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      expect(mockPrisma.organizationMember.delete).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/organizations/[id]/members - Update Role', () => {
    /**
     * Test #13:
     *    Organization owners can assign any role including promoting
     *    other members to owner.
     */
    it('OWNER can assign any role', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.update.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'OWNER',
      });

      const request = createMockRequest(
        { memberId: 'other-user', role: 'OWNER' },
        'PATCH'
      );
      const response = await PATCH(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
      expect(mockPrisma.organizationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: 'OWNER' },
        })
      );
    });

    /**
     * Test #14:
     *    Managers cannot promote members to owner. Only owners can
     *    create other owners.
     */
    it('MANAGER cannot assign OWNER role', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });

      const request = createMockRequest(
        { memberId: 'other-user', role: 'OWNER' },
        'PATCH'
      );
      const response = await PATCH(request, createRouteParams('org-1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owner');
      expect(mockPrisma.organizationMember.update).not.toHaveBeenCalled();
    });

    /**
     * Test #15:
     *    Managers can assign MANAGER or MEMBER roles, allowing them
     *    to promote regular members to managers.
     */
    it('MANAGER can assign MANAGER or MEMBER roles', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'manager-123'));
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: 'MANAGER',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.update.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'MANAGER',
      });

      const request = createMockRequest(
        { memberId: 'other-user', role: 'MANAGER' },
        'PATCH'
      );
      const response = await PATCH(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
    });

    /**
     * Test #16:
     *    Platform admins can assign any role including owner for
     *    administrative management.
     */
    it('Platform ADMIN can assign any role', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-123'));
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.update.mockResolvedValue({
        id: 'member-1',
        userId: 'other-user',
        role: 'OWNER',
      });

      const request = createMockRequest(
        { memberId: 'other-user', role: 'OWNER' },
        'PATCH'
      );
      const response = await PATCH(request, createRouteParams('org-1'));

      expect(response.status).toBe(200);
    });
  });
});

describe('Organization Members - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #17:
   *    When adding a member, the email field is required.
   *    Empty emails are rejected.
   */
  it('should require email when adding member', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });

    const request = createMockRequest({ email: '', role: 'MEMBER' });
    const response = await POST(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Email');
    expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
  });

  /**
   * Test #18:
   *    Role values must be one of the valid OrgRole enum values:
   *    OWNER, MANAGER, or MEMBER.
   */
  it('should validate role values', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: 'OWNER' })
      .mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'new-user',
      email: 'new@test.com',
    });

    const request = createMockRequest({
      email: 'new@test.com',
      role: 'INVALID_ROLE',
    });
    const response = await POST(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid role');
    expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
  });

  /**
   * Test #19:
   *    Users who are already members of an organization cannot
   *    be added again. Duplicate memberships are prevented.
   */
  it('should prevent adding existing member', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique
      .mockResolvedValueOnce({ role: 'OWNER' }) // auth check
      .mockResolvedValueOnce({ id: 'member-1', userId: 'user-123' }); // existing member check
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'existing@test.com',
    });

    const request = createMockRequest({ email: 'existing@test.com' });
    const response = await POST(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already a member');
    expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
  });

  /**
   * Test #20:
   *    When removing a member, the memberId parameter is required
   *    to identify which member to remove.
   */
  it('should require memberId when removing', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });

    const request = new Request(
      'http://localhost/api/organizations/org-1/members',
      {
        method: 'DELETE',
      }
    );
    const response = await DELETE(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Member ID');
    expect(mockPrisma.organizationMember.delete).not.toHaveBeenCalled();
  });

  /**
   * Test #21:
   *    When updating a member's role, both memberId and the new
   *    role are required fields.
   */
  it('should require memberId and role when updating', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'owner-123'));
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      role: 'OWNER',
    });

    const request = createMockRequest(
      { memberId: '', role: 'MANAGER' },
      'PATCH'
    );
    const response = await PATCH(request, createRouteParams('org-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(mockPrisma.organizationMember.update).not.toHaveBeenCalled();
  });
});
