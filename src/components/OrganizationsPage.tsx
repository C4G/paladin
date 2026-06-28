'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MoreHorizontal,
  LogOut,
  Trash2,
  ExternalLink,
  Mail,
  Building2,
  UserPlus,
  Plus,
  ClipboardList,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrgRequest {
  id: string;
  name: string;
  description: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  reviewer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SearchableOrg {
  id: string;
  name: string;
  description: string | null;
  hasPendingRequest: boolean;
  isMember: boolean;
  _count: {
    members: number;
    farms: number;
  };
}

interface MyOrg {
  id: string;
  name: string;
  description: string | null;
  members: {
    userId: string;
    role: 'OWNER' | 'MANAGER' | 'MEMBER';
  }[];
  _count: {
    members: number;
    farms: number;
  };
}

interface MemberRequest {
  id: string;
  userId: string;
  organizationId: string;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
}

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'my-orgs';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [orgRequests, setOrgRequests] = useState<OrgRequest[]>([]);
  const [myOrganizations, setMyOrganizations] = useState<MyOrg[]>([]);
  const [memberRequests, setMemberRequests] = useState<MemberRequest[]>([]);
  const [historicalMemberRequests, setHistoricalMemberRequests] = useState<
    MemberRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create org state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');

  // Search and join state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableOrg[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinRequestOrgId, setJoinRequestOrgId] = useState<string | null>(null);

  // Rejection reason state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState('');

  // Contact org state
  const [contactOrgId, setContactOrgId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  // Leave org state
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null);

  // Delete org state (admin only)
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const isAdmin = session?.user?.role === 'ADMIN';

  // Check if user can manage member requests (admin or org owner/manager)
  const canManageMembers =
    isAdmin ||
    myOrganizations.some((org) =>
      org.members?.some(
        (m) =>
          m.userId === session?.user?.id &&
          ['OWNER', 'MANAGER'].includes(m.role)
      )
    );

  const fetchOrgRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/org-requests?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const data = await response.json();
        setOrgRequests(data);
      }
    } catch (error) {
      console.error('Error fetching org requests:', error);
    }
  }, []);

  const fetchMyOrganizations = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const data = await response.json();
        setMyOrganizations(data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  }, []);

  const fetchMemberRequests = useCallback(async () => {
    try {
      // Fetch both pending and all (for history)
      const [pendingRes, allRes] = await Promise.all([
        fetch(`/api/member-requests?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
        fetch(`/api/member-requests?includeHistory=true&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ]);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setMemberRequests(pendingData);
      }
      if (allRes.ok) {
        const allData = await allRes.json();
        // Filter out pending to get only historical
        const historical = allData.filter(
          (r: MemberRequest) => r.status !== 'PENDING'
        );
        setHistoricalMemberRequests(historical);
      }
    } catch (error) {
      console.error('Error fetching member requests:', error);
    }
  }, []);

  const searchOrganizations = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/organizations/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching organizations:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchOrgRequests(),
        fetchMyOrganizations(),
        fetchMemberRequests(),
        searchOrganizations(''),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [
    fetchOrgRequests,
    fetchMyOrganizations,
    fetchMemberRequests,
    searchOrganizations,
  ]);

  const handleRequestAction = async (
    requestId: string,
    action: 'approve' | 'reject',
    reviewNotes?: string
  ) => {
    try {
      const response = await fetch('/api/org-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, reviewNotes }),
      });

      if (response.ok) {
        toast({
          title:
            action === 'approve' ? 'Organization Approved' : 'Request Rejected',
          description:
            action === 'approve'
              ? 'The organization has been created.'
              : 'The request has been rejected.',
        });
        await Promise.all([fetchOrgRequests(), fetchMyOrganizations()]);
        setRejectingRequestId(null);
        setRejectionReason('');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to process request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = (requestId: string) => {
    if (rejectingRequestId === requestId) {
      // Submit the rejection with reason
      handleRequestAction(requestId, 'reject', rejectionReason);
    } else {
      // Show the rejection reason input
      setRejectingRequestId(requestId);
      setRejectionReason('');
    }
  };

  const handleMemberRequestAction = async (
    orgId: string,
    requestId: string,
    action: 'approve' | 'reject'
  ) => {
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/join-requests`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, action }),
        }
      );

      if (response.ok) {
        toast({
          title: action === 'approve' ? 'Member Approved' : 'Request Rejected',
          description:
            action === 'approve'
              ? 'The user has been added to the organization.'
              : 'The join request has been rejected.',
        });
        await fetchMemberRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to process request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing member request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    }
  };

  const handleJoinRequest = async () => {
    if (!joinRequestOrgId) return;

    try {
      const response = await fetch(
        `/api/organizations/${joinRequestOrgId}/join-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: joinMessage }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Request Sent',
          description:
            'Your request to join has been sent to the organization admins.',
        });
        setJoinRequestOrgId(null);
        setJoinMessage('');
        await searchOrganizations(searchQuery);
        await fetchMemberRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to send join request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send join request',
        variant: 'destructive',
      });
    }
  };

  const handleContactOrg = async () => {
    if (!contactOrgId || !contactMessage.trim()) return;

    setIsSendingContact(true);
    try {
      const response = await fetch(
        `/api/organizations/${contactOrgId}/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: contactMessage }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Message Sent',
          description: 'Your message has been sent to the organization owner.',
        });
        setContactOrgId(null);
        setContactMessage('');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error contacting organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleRequestOrg = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          description: newOrgDescription,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Request Submitted',
          description:
            'Your organization request has been submitted for admin review.',
        });
        setNewOrgName('');
        setNewOrgDescription('');
        await fetchOrgRequests();
        await fetchMemberRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to submit request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting org request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveOrg = async (orgId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/members?memberId=${session.user.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast({
          title: 'Left Organization',
          description: 'You have successfully left the organization.',
        });
        setLeavingOrgId(null);
        await fetchMyOrganizations();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to leave organization',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error leaving organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave organization',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Organization Deleted',
          description: 'The organization has been permanently deleted.',
        });
        setDeletingOrgId(null);
        await fetchMyOrganizations();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete organization',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete organization',
        variant: 'destructive',
      });
    }
  };

  const pendingRequests = orgRequests.filter((r) => r.status === 'PENDING');

  if (isLoading) {
    return (
      <div className='container mx-auto p-8'>
        <div className='text-center'>Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-4 md:py-8'>
      <h1 className='mb-6 text-2xl font-bold md:text-3xl'>Organizations</h1>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', value);
          router.replace(`?${params.toString()}`, { scroll: false });
        }}
        className='flex flex-col gap-6 md:grid md:min-h-[calc(100dvh-12rem)] md:grid-cols-[240px_1fr] md:gap-0'
        orientation='vertical'
      >
        {/* Sidebar Navigation */}
        <aside className='md:border-r md:border-border md:pr-6'>
          {/* Mobile toggle */}
          <div className='flex flex-col gap-1 md:hidden'>
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className='flex w-full items-center justify-between rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium'
            >
              <span className='flex items-center gap-2'>
                {activeTab === 'my-orgs' && (
                  <>
                    <Building2 className='h-4 w-4' /> My Organizations (
                    {myOrganizations.length})
                  </>
                )}
                {activeTab === 'join' && (
                  <>
                    <UserPlus className='h-4 w-4' /> Join Organization
                  </>
                )}
                {activeTab === 'create' && (
                  <>
                    <Plus className='h-4 w-4' /> Create Organization
                  </>
                )}
                {activeTab === 'org-requests' && (
                  <>
                    <ClipboardList className='h-4 w-4' /> Org Requests
                  </>
                )}
                {activeTab === 'member-requests' && (
                  <>
                    <Users className='h-4 w-4' /> Member Requests
                  </>
                )}
              </span>
              {mobileSidebarOpen ? (
                <X className='h-4 w-4' />
              ) : (
                <Menu className='h-4 w-4' />
              )}
            </button>

            {mobileSidebarOpen && (
              <nav className='rounded-md border border-border bg-muted/50 p-1'>
                <button
                  onClick={() => {
                    setActiveTab('my-orgs');
                    setMobileSidebarOpen(false);
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('tab', 'my-orgs');
                    router.replace(`?${p.toString()}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${activeTab === 'my-orgs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Building2 className='h-4 w-4' /> My Organizations (
                  {myOrganizations.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('join');
                    setMobileSidebarOpen(false);
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('tab', 'join');
                    router.replace(`?${p.toString()}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${activeTab === 'join' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <UserPlus className='h-4 w-4' /> Join Organization
                </button>
                <button
                  onClick={() => {
                    setActiveTab('create');
                    setMobileSidebarOpen(false);
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('tab', 'create');
                    router.replace(`?${p.toString()}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${activeTab === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Plus className='h-4 w-4' /> Create Organization
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('org-requests');
                      setMobileSidebarOpen(false);
                      const p = new URLSearchParams(searchParams.toString());
                      p.set('tab', 'org-requests');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${activeTab === 'org-requests' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    <ClipboardList className='h-4 w-4' /> Org Requests
                    {pendingRequests.length > 0 && (
                      <span className='rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                )}
                {canManageMembers && (
                  <button
                    onClick={() => {
                      setActiveTab('member-requests');
                      setMobileSidebarOpen(false);
                      const p = new URLSearchParams(searchParams.toString());
                      p.set('tab', 'member-requests');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${activeTab === 'member-requests' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    <Users className='h-4 w-4' /> Member Requests
                    {memberRequests.length > 0 && (
                      <span className='rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>
                        {memberRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Desktop sidebar */}
          <TabsList className='hidden h-auto flex-col items-stretch rounded-lg bg-muted/40 p-2 md:flex'>
            <TabsTrigger
              value='my-orgs'
              className='justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm'
            >
              <Building2 className='h-4 w-4' />
              My Organizations ({myOrganizations.length})
            </TabsTrigger>
            <TabsTrigger
              value='join'
              className='justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm'
            >
              <UserPlus className='h-4 w-4' />
              Join Organization
            </TabsTrigger>
            <TabsTrigger
              value='create'
              className='justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm'
            >
              <Plus className='h-4 w-4' />
              Create Organization
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value='org-requests'
                className='justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm'
              >
                <ClipboardList className='h-4 w-4' />
                Org Requests
                {pendingRequests.length > 0 && (
                  <span className='rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {canManageMembers && (
              <TabsTrigger
                value='member-requests'
                className='justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm'
              >
                <Users className='h-4 w-4' />
                Member Requests
                {memberRequests.length > 0 && (
                  <span className='rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>
                    {memberRequests.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </aside>

        {/* Main Content */}
        <main className='min-w-0 max-w-4xl md:pl-8'>
          {/* My Organizations Tab */}
          <TabsContent value='my-orgs'>
            {myOrganizations.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-center gap-4 py-8 text-center'>
                  <p className='text-muted-foreground'>
                    You are not a member of any organizations yet.
                  </p>
                  <div className='flex gap-3'>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setActiveTab('join');
                        const params = new URLSearchParams(
                          searchParams.toString()
                        );
                        params.set('tab', 'join');
                        router.replace(`?${params.toString()}`, {
                          scroll: false,
                        });
                      }}
                    >
                      Join an Organization
                    </Button>
                    <Button
                      className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                      onClick={() => {
                        setActiveTab('create');
                        const params = new URLSearchParams(
                          searchParams.toString()
                        );
                        params.set('tab', 'create');
                        router.replace(`?${params.toString()}`, {
                          scroll: false,
                        });
                      }}
                    >
                      Create an Organization
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className='grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {myOrganizations.map((org) => (
                  <Card key={org.id} className='flex flex-col'>
                    <CardHeader>
                      <CardTitle className='text-lg'>{org.name}</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-1 flex-col justify-between gap-4'>
                      <div>
                        {org.description && (
                          <p className='text-sm text-muted-foreground'>
                            {org.description}
                          </p>
                        )}
                      </div>
                      <div className='flex flex-col gap-3'>
                        <p className='text-sm text-muted-foreground'>
                          {org._count.members} member
                          {org._count.members !== 1 ? 's' : ''} &bull;{' '}
                          {org._count.farms} farm
                          {org._count.farms !== 1 ? 's' : ''}
                        </p>

                        {leavingOrgId === org.id ? (
                          <div className='space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950'>
                            <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                              Leave {org.name}?
                            </p>
                            <p className='text-xs text-red-700 dark:text-red-300'>
                              You will need to request to join again.
                            </p>
                            <div className='flex gap-2'>
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() => handleLeaveOrg(org.id)}
                              >
                                Leave
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setLeavingOrgId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : deletingOrgId === org.id ? (
                          <div className='space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950'>
                            <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                              Delete {org.name}?
                            </p>
                            <p className='text-xs text-red-700 dark:text-red-300'>
                              This will permanently delete the organization, all
                              memberships, and disassociate all farms. This
                              action cannot be undone.
                            </p>
                            <div className='flex gap-2'>
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() => handleDeleteOrg(org.id)}
                              >
                                Delete
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setDeletingOrgId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className='flex gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                (window.location.href = `/dashboard?org=${org.id}`)
                              }
                            >
                              Manage in Dashboard
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-8 w-8 p-0'
                                >
                                  <MoreHorizontal className='h-4 w-4' />
                                  <span className='sr-only'>Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem
                                  onClick={() => setContactOrgId(org.id)}
                                  className='text-muted-foreground'
                                >
                                  <Mail className='mr-2 h-4 w-4' />
                                  Contact Owner
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setLeavingOrgId(org.id)}
                                  className='text-muted-foreground'
                                >
                                  <LogOut className='mr-2 h-4 w-4' />
                                  Leave Organization
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeletingOrgId(org.id)}
                                      className='text-destructive focus:text-destructive'
                                    >
                                      <Trash2 className='mr-2 h-4 w-4' />
                                      Delete Organization
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Join Organization Tab */}
          <TabsContent value='join'>
            <Card>
              <CardHeader>
                <CardTitle>Find and Join an Organization</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-col gap-6'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='searchOrg'>Search Organizations</Label>
                  <div className='flex gap-2'>
                    <Input
                      id='searchOrg'
                      placeholder='Search by organization name...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchOrganizations(searchQuery);
                        }
                      }}
                    />
                    <Button
                      variant='secondary'
                      onClick={() => searchOrganizations(searchQuery)}
                      disabled={isSearching}
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <div className='space-y-4'>
                    {searchResults.map((org) => (
                      <div
                        key={org.id}
                        className='flex items-center justify-between rounded-lg bg-muted p-4'
                      >
                        <div>
                          <p className='font-medium'>{org.name}</p>
                          {org.description && (
                            <p className='text-sm text-muted-foreground'>
                              {org.description}
                            </p>
                          )}
                          <p className='text-xs text-muted-foreground'>
                            {org._count.members} member
                            {org._count.members !== 1 ? 's' : ''} &bull;{' '}
                            {org._count.farms} farm
                            {org._count.farms !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          {org.isMember ? (
                            <div className='flex items-center gap-2'>
                              <span className='rounded bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-200'>
                                Joined
                              </span>
                              <a
                                href={`/dashboard?org=${org.id}`}
                                className='text-muted-foreground hover:text-foreground'
                                title='View organization'
                              >
                                <ExternalLink className='h-4 w-4' />
                              </a>
                            </div>
                          ) : org.hasPendingRequest ? (
                            <div className='flex items-center gap-2'>
                              <span className='rounded bg-yellow-100 px-3 py-1 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'>
                                Pending
                              </span>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setContactOrgId(org.id)}
                                title='Contact organization'
                              >
                                <Mail className='h-4 w-4' />
                              </Button>
                              {isAdmin && (
                                <a
                                  href={`/dashboard?org=${org.id}`}
                                  className='text-muted-foreground hover:text-foreground'
                                  title='Manage organization'
                                >
                                  <ExternalLink className='h-4 w-4' />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className='flex items-center gap-2'>
                              <Button
                                variant='outline'
                                onClick={() => setJoinRequestOrgId(org.id)}
                              >
                                Request to Join
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setContactOrgId(org.id)}
                                title='Contact organization'
                              >
                                <Mail className='h-4 w-4' />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <p className='py-8 text-center text-muted-foreground'>
                    No organizations found matching &quot;{searchQuery}&quot;
                  </p>
                ) : (
                  <p className='py-8 text-center text-muted-foreground'>
                    Search for organizations to request to join.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Organization Tab */}
          <TabsContent value='create'>
            <Card>
              <CardHeader>
                <CardTitle>Request New Organization</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <Label htmlFor='orgName'>
                    Organization Name <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='orgName'
                    placeholder='e.g., Local Fire Department Volunteers'
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='orgDescription'>Description</Label>
                  <Input
                    id='orgDescription'
                    placeholder='Brief description of your organization'
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                  />
                </div>
                <Button
                  variant='secondary'
                  className='w-fit'
                  onClick={handleRequestOrg}
                >
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Org Requests Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value='org-requests'>
              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Organization Requests</CardTitle>
                    <CardDescription>
                      Review and approve requests to create new organizations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingRequests.length === 0 ? (
                      <p className='text-muted-foreground'>
                        No pending organization requests.
                      </p>
                    ) : (
                      <div className='space-y-4'>
                        {pendingRequests.map((request) => (
                          <div
                            key={request.id}
                            className='space-y-3 rounded-lg border p-4'
                          >
                            <div className='flex items-start justify-between'>
                              <div>
                                <p className='font-medium'>{request.name}</p>
                                {request.description && (
                                  <p className='text-sm text-muted-foreground'>
                                    {request.description}
                                  </p>
                                )}
                                <p className='text-sm text-muted-foreground'>
                                  Requested by:{' '}
                                  {request.requester.name ||
                                    request.requester.email}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className='flex items-center gap-2'>
                                <Button
                                  variant='secondary'
                                  size='sm'
                                  onClick={() =>
                                    handleRequestAction(request.id, 'approve')
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant='destructive'
                                  size='sm'
                                  onClick={() => handleReject(request.id)}
                                >
                                  {rejectingRequestId === request.id
                                    ? 'Confirm Reject'
                                    : 'Reject'}
                                </Button>
                                {rejectingRequestId === request.id && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                      setRejectingRequestId(null);
                                      setRejectionReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                            {rejectingRequestId === request.id && (
                              <div className='border-t pt-2'>
                                <Label
                                  htmlFor={`reason-${request.id}`}
                                  className='text-sm'
                                >
                                  Rejection Reason
                                </Label>
                                <Textarea
                                  id={`reason-${request.id}`}
                                  placeholder='Provide a reason for rejection...'
                                  value={rejectionReason}
                                  onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                  }
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Request History */}
                {orgRequests.filter((r) => r.status !== 'PENDING').length >
                  0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Request History</CardTitle>
                      <CardDescription>
                        Previously processed org requests.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {orgRequests
                          .filter((r) => r.status !== 'PENDING')
                          .sort(
                            (a, b) =>
                              new Date(b.reviewedAt || b.createdAt).getTime() -
                              new Date(a.reviewedAt || a.createdAt).getTime()
                          )
                          .map((request) => (
                            <div
                              key={request.id}
                              className='rounded-lg bg-muted p-4'
                            >
                              <div className='flex items-start justify-between'>
                                <div>
                                  <p className='font-medium'>{request.name}</p>
                                  {request.description && (
                                    <p className='text-sm text-muted-foreground'>
                                      Description: {request.description}
                                    </p>
                                  )}
                                  <p className='text-sm text-muted-foreground'>
                                    Requested by:{' '}
                                    {request.requester.name ||
                                      request.requester.email}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    Submitted:{' '}
                                    {new Date(
                                      request.createdAt
                                    ).toLocaleDateString()}
                                    {request.reviewedAt && (
                                      <>
                                        {' '}
                                        • Reviewed:{' '}
                                        {new Date(
                                          request.reviewedAt
                                        ).toLocaleDateString()}
                                        {request.reviewer && (
                                          <>
                                            {' '}
                                            by{' '}
                                            {request.reviewer.name ||
                                              request.reviewer.email}
                                          </>
                                        )}
                                      </>
                                    )}
                                  </p>
                                  {request.status === 'REJECTED' &&
                                    request.reviewNotes && (
                                      <p className='text-sm text-red-600 dark:text-red-400'>
                                        <span className='font-medium'>
                                          Reason:
                                        </span>{' '}
                                        {request.reviewNotes}
                                      </p>
                                    )}
                                </div>
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                                      request.status === 'APPROVED'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}
                                  >
                                    {request.status === 'APPROVED'
                                      ? 'Approved'
                                      : 'Rejected'}
                                  </span>
                                  <div className='w-4'>
                                    {request.status === 'APPROVED' &&
                                      (() => {
                                        const matchingOrg =
                                          myOrganizations.find(
                                            (org) => org.name === request.name
                                          );
                                        return matchingOrg ? (
                                          <a
                                            href={`/dashboard?org=${matchingOrg.id}`}
                                            className='text-muted-foreground hover:text-foreground'
                                            title='View organization'
                                          >
                                            <ExternalLink className='h-4 w-4' />
                                          </a>
                                        ) : null;
                                      })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* Member Requests Tab */}
          {canManageMembers && (
            <TabsContent value='member-requests'>
              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Member Requests</CardTitle>
                    <CardDescription>
                      Review requests from users who want to join your
                      organizations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {memberRequests.length === 0 ? (
                      <p className='text-muted-foreground'>
                        No pending member requests.
                      </p>
                    ) : (
                      <div className='space-y-4'>
                        {memberRequests.map((request) => (
                          <div
                            key={request.id}
                            className='flex items-start justify-between rounded-lg border p-4'
                          >
                            <div className='flex items-start gap-3'>
                              {request.user.image ? (
                                <img
                                  src={request.user.image}
                                  alt=''
                                  className='h-10 w-10 rounded-full'
                                />
                              ) : (
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium'>
                                  {(request.user.name || request.user.email)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className='font-medium'>
                                  {request.user.name || request.user.email}
                                </p>
                                {request.user.name && (
                                  <p className='text-sm text-muted-foreground'>
                                    {request.user.email}
                                  </p>
                                )}
                                <p className='text-sm text-muted-foreground'>
                                  Wants to join:{' '}
                                  <span className='font-medium'>
                                    {request.organization.name}
                                  </span>
                                </p>
                                {request.message && (
                                  <p className='mt-1 text-sm italic text-muted-foreground'>
                                    &quot;{request.message}&quot;
                                  </p>
                                )}
                                <p className='text-xs text-muted-foreground'>
                                  Requested:{' '}
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <Button
                                variant='secondary'
                                size='sm'
                                onClick={() =>
                                  handleMemberRequestAction(
                                    request.organizationId,
                                    request.id,
                                    'approve'
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() =>
                                  handleMemberRequestAction(
                                    request.organizationId,
                                    request.id,
                                    'reject'
                                  )
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Historical Member Requests */}
                {historicalMemberRequests.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Request History</CardTitle>
                      <CardDescription>
                        Previously processed member requests.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {historicalMemberRequests.map((request) => (
                          <div
                            key={request.id}
                            className='flex items-start justify-between rounded-lg bg-muted p-4'
                          >
                            <div className='flex items-start gap-3'>
                              {request.user.image ? (
                                <img
                                  src={request.user.image}
                                  alt=''
                                  className='h-10 w-10 rounded-full'
                                />
                              ) : (
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-background text-sm font-medium'>
                                  {(request.user.name || request.user.email)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className='font-medium'>
                                  {request.user.name || request.user.email}
                                </p>
                                <p className='text-sm text-muted-foreground'>
                                  {request.organization.name}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                  request.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}
                              >
                                {request.status === 'APPROVED'
                                  ? 'Approved'
                                  : 'Rejected'}
                              </span>
                              <a
                                href={`/dashboard?org=${request.organization.id}`}
                                className='text-muted-foreground hover:text-foreground'
                                title='View organization'
                              >
                                <ExternalLink className='h-4 w-4' />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}
        </main>
      </Tabs>

      {/* Contact Organization Modal */}
      <Dialog
        open={contactOrgId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContactOrgId(null);
            setContactMessage('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Organization</DialogTitle>
            <DialogDescription>
              Send a message to the owner of{' '}
              <span className='font-medium'>
                {searchResults.find((o) => o.id === contactOrgId)?.name ||
                  myOrganizations.find((o) => o.id === contactOrgId)?.name}
              </span>
              . They will receive your message via email and can reply directly
              to you.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='contactMessage'>Message</Label>
            <Textarea
              id='contactMessage'
              placeholder='Write your message to the organization owner...'
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={4}
              className='mt-2'
              maxLength={2000}
            />
            <p className='mt-1 text-xs text-muted-foreground'>
              {contactMessage.length}/2000 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setContactOrgId(null);
                setContactMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleContactOrg}
              disabled={!contactMessage.trim() || isSendingContact}
              className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            >
              {isSendingContact ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Request Modal */}
      <Dialog
        open={joinRequestOrgId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setJoinRequestOrgId(null);
            setJoinMessage('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join</DialogTitle>
            <DialogDescription>
              Send a request to join{' '}
              <span className='font-medium'>
                {searchResults.find((o) => o.id === joinRequestOrgId)?.name}
              </span>
              . Organization admins will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='joinMessage'>Message</Label>
            <Textarea
              id='joinMessage'
              placeholder='(Optional) Introduce yourself or explain why you want to join...'
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              rows={3}
              className='mt-2'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setJoinRequestOrgId(null);
                setJoinMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinRequest}
              className='dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700'
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
