/**
 * Tests for role-based request filtering on the dashboard
 *
 * These tests verify that:
 * - ADMINs can view all requests (no userId filter applied)
 * - Regular users can only see their own requests when no bounds provided
 * - Organization members can see requests from farms belonging to their orgs
 * - When bounds (bounding box) are provided, ALL requests in that area are visible (nearby requests feature)
 * - Access is determined purely by session role, not URL parameters
 *
 * Test Count: 11 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mock variables before vi.mock
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    request: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock the actions module to prevent web-push initialization
vi.mock('@/app/actions', () => ({
  sendNotification: vi.fn(),
}));

// Mock the utils module for filterFarmsByDistance
vi.mock('@/lib/utils', () => ({
  filterFarmsByDistance: vi.fn((requests) => requests),
}));

// Import the actual route handlers after mocks are set up
import { GET } from '@/app/api/requests/route';

// Helper to create a mock session
function createMockSession(role: 'ADMIN' | 'STAFF' | null, userId: string) {
  return {
    user: {
      id: userId,
      role,
      email: 'test@example.com',
      name: 'Test User',
    },
  };
}

// Mock request data
const mockRequests = [
  {
    id: 'req-1',
    userId: 'user-1',
    status: 'OPEN',
    farm: { latitude: 1, longitude: 1 },
  },
  {
    id: 'req-2',
    userId: 'user-2',
    status: 'OPEN',
    farm: { latitude: 2, longitude: 2 },
  },
  {
    id: 'req-3',
    userId: 'admin-001',
    status: 'OPEN',
    farm: { latitude: 3, longitude: 3 },
  },
];

describe('Role-based request filtering logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('effectiveUserId logic', () => {
    /**
     * Test #1:
     *    Admin users have no userId filter applied, allowing them
     *    to see all requests in the system.
     */
    it('should return undefined for ADMIN (sees all requests)', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-001'));
      mockPrisma.request.findMany.mockResolvedValue(mockRequests);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // ADMIN sees all requests - no userId filter in where clause
      const callArg = mockPrisma.request.findMany.mock.calls[0][0];
      expect(callArg.where.userId).toBeUndefined();
      expect(callArg.where.OR).toBeUndefined(); // No OR clause for admins
      expect(data).toHaveLength(3);
    });

    /**
     * Test #2:
     *    Staff users are filtered to only see their own requests
     *    when no bounding box is provided. The userId filter is
     *    applied for non-admin users without bounds.
     */
    it('should return userId for STAFF when no bounds provided (sees only their own)', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'staff-123'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]); // not in any org
      mockPrisma.request.findMany.mockResolvedValue([mockRequests[0]]);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // STAFF sees only their own requests - userId filter applied
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'staff-123',
          }),
        })
      );
    });

    /**
     * Test #3:
     *    When no userId is explicitly provided, non-admin users
     *    default to seeing their own requests via session userId.
     */
    it('should return session userId when no userId provided for non-admin', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-456'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]); // not in any org
      mockPrisma.request.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-456',
          }),
        })
      );
    });

    /**
     * Test #4:
     *    If a userId is explicitly provided for a non-admin user,
     *    that userId takes priority over the session userId.
     */
    it('should prioritize provided userId for non-admin', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'session-user'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]); // not in any org
      mockPrisma.request.findMany.mockResolvedValue([]);

      const request = new Request(
        'http://localhost/api/requests?userId=requested-user'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'requested-user',
          }),
        })
      );
    });
  });

  describe('Dashboard URL construction', () => {
    /**
     * Test #5:
     *    Both admin and non-admin users use the same URL, but the server
     *    applies different filters based on session role. ADMIN sees all
     *    requests (no userId filter), while STAFF is filtered to their own.
     */
    it('same URL produces different queries based on role', async () => {
      const sharedUrl = 'http://localhost/api/requests?activeRequestsOnly=true';

      // Test with ADMIN
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-001'));
      mockPrisma.request.findMany.mockResolvedValue(mockRequests);

      const adminResponse = await GET(new Request(sharedUrl));
      expect(adminResponse.status).toBe(200);

      // Capture ADMIN query - should have no userId filter
      const adminQuery = mockPrisma.request.findMany.mock.calls[0][0];
      expect(adminQuery.where.userId).toBeUndefined();
      expect(adminQuery.where.OR).toBeUndefined();

      vi.clearAllMocks();

      // Test with STAFF using exact same URL
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'staff-001'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.request.findMany.mockResolvedValue([mockRequests[0]]);

      const staffResponse = await GET(new Request(sharedUrl));
      expect(staffResponse.status).toBe(200);

      // Capture STAFF query - should have userId filter applied
      const staffQuery = mockPrisma.request.findMany.mock.calls[0][0];
      expect(staffQuery.where.userId).toBe('staff-001');
    });
  });

  describe('Organization-based request visibility', () => {
    /**
     * Test #6:
     *    Organization members can see requests from farms that belong
     *    to their organizations, in addition to their own requests.
     */
    it('should show org farm requests to org members', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'org-member-1'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { organizationId: 'org-1' },
        { organizationId: 'org-2' },
      ]);
      mockPrisma.request.findMany.mockResolvedValue(mockRequests);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should use OR clause for user's own requests + org farm requests
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { userId: 'org-member-1' },
              { farm: { organizationId: { in: ['org-1', 'org-2'] } } },
            ],
          }),
        })
      );
    });

    /**
     * Test #7:
     *    Users not in any organization only see their own requests.
     *    No org-based visibility is applied.
     */
    it('should show only own requests when user has no org memberships', async () => {
      mockAuth.mockResolvedValue(createMockSession('STAFF', 'solo-user'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]); // not in any org
      mockPrisma.request.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should filter only by userId, no OR clause
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'solo-user',
          }),
        })
      );
      // Should NOT have an OR clause
      const callArg = mockPrisma.request.findMany.mock.calls[0][0];
      expect(callArg.where.OR).toBeUndefined();
    });

    /**
     * Test #8:
     *    ADMINs should NOT query for org memberships since they see
     *    all requests anyway.
     */
    it('should not query org memberships for ADMIN users', async () => {
      mockAuth.mockResolvedValue(createMockSession('ADMIN', 'admin-001'));
      mockPrisma.request.findMany.mockResolvedValue(mockRequests);

      const request = new Request('http://localhost/api/requests');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should NOT call organizationMember.findMany for admins
      expect(mockPrisma.organizationMember.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('Bounding box (nearby requests) visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test #9:
   *    When bounding box coordinates are provided (nearby requests),
   *    ALL requests in that area should be visible regardless of user.
   *    This enables users to see and respond to nearby emergencies.
   */
  it('should skip user filter when valid bounds are provided', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organizationMember.findMany.mockResolvedValue([]); // not in any org
    mockPrisma.request.findMany.mockResolvedValue(mockRequests);

    const request = new Request(
      'http://localhost/api/requests?ne_lat=34.0&ne_lng=-83.0&sw_lat=33.0&sw_lng=-84.0&activeRequestsOnly=true'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    // When bounds provided, should NOT filter by userId
    const callArg = mockPrisma.request.findMany.mock.calls[0][0];
    expect(callArg.where.userId).toBeUndefined();
    expect(callArg.where.OR).toBeUndefined();
    // Should have farm lat/lng filter
    expect(callArg.where.farm).toBeDefined();
    expect(callArg.where.farm.latitude).toBeDefined();
    expect(callArg.where.farm.longitude).toBeDefined();
  });

  /**
   * Test #10:
   *    Invalid bounds (NaN values) should NOT skip the user filter.
   *    This prevents bypassing security with malformed URLs.
   */
  it('should apply user filter when bounds are invalid (NaN)', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);
    mockPrisma.request.findMany.mockResolvedValue([]);

    const request = new Request(
      'http://localhost/api/requests?ne_lat=NaN&ne_lng=NaN&sw_lat=NaN&sw_lng=NaN&activeRequestsOnly=true'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    // Invalid bounds should still apply userId filter
    const callArg = mockPrisma.request.findMany.mock.calls[0][0];
    expect(callArg.where.userId).toBe('user-123');
  });

  /**
   * Test #11:
   *    Partial bounds (missing some coordinates) should NOT skip
   *    the user filter.
   */
  it('should apply user filter when bounds are partial', async () => {
    mockAuth.mockResolvedValue(createMockSession('STAFF', 'user-123'));
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);
    mockPrisma.request.findMany.mockResolvedValue([]);

    // Only ne_lat and ne_lng provided
    const request = new Request(
      'http://localhost/api/requests?ne_lat=34.0&ne_lng=-83.0&activeRequestsOnly=true'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    // Partial bounds should still apply userId filter
    const callArg = mockPrisma.request.findMany.mock.calls[0][0];
    expect(callArg.where.userId).toBe('user-123');
  });
});
