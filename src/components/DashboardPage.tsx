'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Building2,
  Clock,
  Check,
  X,
  ChevronRight,
  Map,
  ChevronDown,
  Mail,
} from 'lucide-react';
import type { Farm, Request as PrismaRequest, Gate } from '@prisma/client';
import { MAP_EXCLAMATION_POINT, MAP_FARM_POINT } from '@/lib/constants';
import {
  CheckCircle2,
  ExternalLink,
  Info,
  MessageCircle,
  Copy,
  ChevronLeft,
} from 'lucide-react';
import {
  RequestList,
  type Request,
  getDisasterTypeColors,
} from './RequestsList';
import { debounce } from '@/lib/utils';
import GoogleMapComponent from './GoogleMapComponent';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { DonateDialog } from './donate-dialog';
import BulkMemberManagement from './BulkMemberManagement';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  className: 'google-map-container',
};

interface CommunityFarm {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  hasActiveRequest: boolean;
  ownerName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  canContact: boolean;
}

type OrgRole = 'OWNER' | 'MANAGER' | 'MEMBER';

interface OrgMember {
  id: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  members: OrgMember[];
  farms?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    city: string | null;
    state: string | null;
  }[];
  _count: {
    farms: number;
    members: number;
  };
}

interface JoinRequest {
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
}

interface FullRequestDetails {
  id: string;
  farmId: string;
  userId: string;
  disasterType: string;
  createdAt: string;
  closedOn: string | null;
  comments: string | null;
  preferredGateId: string | null;
  preferredGate: {
    id: string;
    name: string;
  } | null;
  farm: {
    latitude: number;
    longitude: number;
    name: string;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
    totalAcreage: string | null;
    yearEstablished: string | null;
    otherInfo: string | null;
    gates?: { id: string; name: string; latitude: number; longitude: number }[];
  };
  user: {
    name: string | null;
    email: string;
  };
  responses?: {
    id: string;
    status: string;
    respondedAt: string;
    estimatedArrivalTime: string;
    equipment: string;
    userId: string;
    responder: { name: string | null };
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>('MEMBER');
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [activeView, setActiveViewState] = useState<
    'dashboard' | 'members' | 'join-requests'
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('dashboard-active-view');
      if (
        saved === 'members' ||
        saved === 'join-requests' ||
        saved === 'dashboard'
      )
        return saved;
    }
    return 'dashboard';
  });
  const setActiveView = (view: 'dashboard' | 'members' | 'join-requests') => {
    setActiveViewState(view);
    sessionStorage.setItem('dashboard-active-view', view);
  };

  // Contact org owner state
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  // Map-related state
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  const [memberRequests, setMemberRequests] = useState<Request[]>([]);
  const [closedRequests, setClosedRequests] = useState<Request[]>([]);
  const [activeRequests, setActiveRequests] = useState<Request[]>([]);
  const [userFarms, setUserFarms] = useState<Farm[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [fullRequestDetails, setFullRequestDetails] =
    useState<FullRequestDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [respondFormData, setRespondFormData] = useState({
    days: '',
    hours: '',
    minutes: '',
    equipment: '',
  });
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [expandedResponders, setExpandedResponders] = useState<Set<string>>(
    new Set()
  );
  const [showAllResponders, setShowAllResponders] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [mapCenter, setMapCenter] = useState<
    google.maps.LatLngLiteral | undefined
  >(undefined);
  const [zoom, setZoom] = useState<number>(10);

  // Community farms state
  const [communityFarms, setCommunityFarms] = useState<CommunityFarm[]>([]);
  const [hoveredFarm, setHoveredFarm] = useState<CommunityFarm | null>(null);
  const [hoveredRequest, setHoveredRequest] = useState<Request | null>(null);
  const [pinnedFarm, setPinnedFarm] = useState<CommunityFarm | null>(null);
  const [pinnedRequest, setPinnedRequest] = useState<Request | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverInfoWindowRef = useRef(false);
  const [contactFarm, setContactFarm] = useState<CommunityFarm | null>(null);

  const [farmContactMessage, setFarmContactMessage] = useState('');
  const [isSendingFarmContact, setIsSendingFarmContact] = useState(false);

  // Create Request Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    disasterType: 'fire',
    farmId: '',
    useGate: false,
    preferredGateId: '',
    comments: '',
  });
  const [createFarms, setCreateFarms] = useState<Farm[]>([]);
  const [createGates, setCreateGates] = useState<Gate[]>([]);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);

  // Member requests filter: null = all, orgId = specific org
  const [memberOrgFilter, setMemberOrgFilter] = useState<string | null>(null);

  // Yours tab status filter: 'active' (default), 'all', or 'inactive'
  const [yoursStatusFilter, setYoursStatusFilter] = useState<
    'active' | 'all' | 'inactive'
  >('active');

  // Default the org filter to the currently selected organization
  useEffect(() => {
    if (selectedOrg) {
      setMemberOrgFilter(selectedOrg.id);
    }
  }, [selectedOrg]);

  // Compute filtered member requests for consistent use in tab count and list
  const filteredMemberRequests = memberOrgFilter
    ? memberRequests.filter((r) => r.farm?.organizationId === memberOrgFilter)
    : memberRequests;

  // Compute filtered yours requests based on status filter
  const allUserRequests = [...userRequests, ...closedRequests];
  const filteredYoursRequests =
    yoursStatusFilter === 'active'
      ? userRequests
      : yoursStatusFilter === 'inactive'
        ? closedRequests
        : allUserRequests;

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
    return [];
  }, []);

  const fetchJoinRequests = useCallback(async (orgId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${orgId}/join-requests?_t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  }, []);

  // Map-related fetch callbacks
  const getActiveRequestsInRange = useCallback(
    async (bounds: google.maps.LatLngBounds) => {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const response = await fetch(
        `/api/requests?` +
          `ne_lat=${ne.lat()}&` +
          `ne_lng=${ne.lng()}&` +
          `sw_lat=${sw.lat()}&` +
          `sw_lng=${sw.lng()}&` +
          `activeRequestsOnly=true`
      );
      if (response.ok) {
        const data: Request[] = await response.json();
        setActiveRequests(
          data.filter(
            (request: PrismaRequest) =>
              !request.closedOn && request.userId !== session?.user?.id
          )
        );
      }
    },
    [session?.user?.id]
  );

  const getCommunityFarmsInRange = useCallback(
    async (bounds: google.maps.LatLngBounds) => {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const response = await fetch(
        `/api/farms/map?` +
          `ne_lat=${ne.lat()}&` +
          `ne_lng=${ne.lng()}&` +
          `sw_lat=${sw.lat()}&` +
          `sw_lng=${sw.lng()}`
      );
      if (response.ok) {
        const data: CommunityFarm[] = await response.json();
        setCommunityFarms(data);
      }
    },
    []
  );

  const debouncedGetActiveRequests = useCallback(
    (bounds: google.maps.LatLngBounds) => {
      const debouncedFn = debounce(() => {
        getActiveRequestsInRange(bounds);
        getCommunityFarmsInRange(bounds);
      }, 500);
      debouncedFn();
    },
    [getActiveRequestsInRange, getCommunityFarmsInRange]
  );

  const handleShowAllRequests = useCallback(async () => {
    const response = await fetch(
      '/api/requests?activeRequestsOnly=true&ne_lat=90&ne_lng=180&sw_lat=-90&sw_lng=-180'
    );
    if (!response.ok) return;
    const data: Request[] = await response.json();
    const allActive = data.filter(
      (r) => !r.closedOn && r.farm?.latitude && r.farm?.longitude
    );
    if (allActive.length === 0) return;
    setActiveRequests(allActive.filter((r) => r.userId !== session?.user?.id));
    if (mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      allActive.forEach((r) => {
        bounds.extend({ lat: r.farm.latitude, lng: r.farm.longitude });
      });
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [session?.user?.id]);

  const handleShowAllFarms = useCallback(async () => {
    if (!mapRef.current) return;
    // Fetch all community farms (worldwide bounds) and combine with user's own farms
    const response = await fetch(
      `/api/farms/map?ne_lat=90&ne_lng=180&sw_lat=-90&sw_lng=-180`
    );
    const communityAll: CommunityFarm[] = response.ok
      ? await response.json()
      : [];
    const allCoords: { lat: number; lng: number }[] = [];
    userFarms.forEach((f) => {
      if (f.latitude && f.longitude)
        allCoords.push({ lat: f.latitude, lng: f.longitude });
    });
    communityAll.forEach((f) => {
      if (f.latitude && f.longitude)
        allCoords.push({ lat: f.latitude, lng: f.longitude });
    });
    if (allCoords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    allCoords.forEach((pos) => bounds.extend(pos));
    mapRef.current.fitBounds(bounds, 60);
  }, [userFarms]);

  const getUserRequests = useCallback(async () => {
    if (!session?.user?.id) return;

    const response = await fetch(`/api/requests?activeRequestsOnly=true`);
    if (response.ok) {
      const data: Request[] = await response.json();
      setUserRequests(
        data.filter(
          (request) => !request.closedOn && request.userId === session.user.id
        )
      );
      // Member requests: from organizations but not my own
      setMemberRequests(
        data.filter(
          (request) => !request.closedOn && request.userId !== session.user.id
        )
      );
    }

    // Fetch closed requests for history
    const closedResponse = await fetch(
      `/api/requests?userId=${session.user.id}`
    );
    if (closedResponse.ok) {
      const allData: Request[] = await closedResponse.json();
      setClosedRequests(
        allData.filter(
          (request) => request.closedOn && request.userId === session.user.id
        )
      );
    }
  }, [session]);

  const getUserFarms = useCallback(async () => {
    if (!session?.user?.id) return [];

    const response = await fetch(`/api/farms?userId=${session.user.id}`);
    if (response.ok) {
      const data: Farm[] = await response.json();
      setUserFarms(data);
      return data;
    }
    return [];
  }, [session]);

  // Fetch farms for create modal
  const fetchCreateFarms = useCallback(async () => {
    if (!session?.user?.id) return;
    const response = await fetch(`/api/farms?userId=${session.user.id}`);
    if (response.ok) {
      const data: Farm[] = await response.json();
      setCreateFarms(data);
    }
  }, [session?.user?.id]);

  // Fetch gates for a farm in create modal
  const fetchCreateGates = useCallback(async (farmId: string) => {
    const response = await fetch(`/api/gates?farmId=${farmId}`);
    if (response.ok) {
      const data: Gate[] = await response.json();
      setCreateGates(data);
    }
  }, []);

  // Handle create request submit
  const handleCreateRequestSubmit = useCallback(async () => {
    if (!session?.user?.id || !createFormData.farmId) return;

    setIsCreatingRequest(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          disasterType: createFormData.disasterType,
          farmId: createFormData.farmId,
          preferredGateId: createFormData.useGate
            ? createFormData.preferredGateId
            : null,
          comments: createFormData.comments || null,
        }),
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => null);
        if (response.status === 403) {
          setShowSubscriptionGate(true);
          throw new Error(
            responseData?.error ||
              'An active PayPal subscription is required to create requests.'
          );
        }
        throw new Error(responseData?.error || 'Failed to create request');
      }

      const newRequest = await response.json();

      // Reset form
      setCreateFormData({
        disasterType: 'fire',
        farmId: '',
        useGate: false,
        preferredGateId: '',
        comments: '',
      });
      setCreateGates([]);
      setCreateSuccess(true);

      // Refresh requests
      await getUserRequests();

      // Auto-select the new request
      setTimeout(async () => {
        setShowCreateModal(false);
        setCreateSuccess(false);
        // Find and select the new request
        const detailsResponse = await fetch(
          `/api/requests?requestId=${newRequest.id}`
        );
        if (detailsResponse.ok) {
          const details = await detailsResponse.json();
          if (details.length > 0) {
            setSelectedRequest(details[0] as Request);
            setFullRequestDetails(details[0] as FullRequestDetails);
            if (details[0].farm) {
              setMapCenter({
                lat: details[0].farm.latitude,
                lng: details[0].farm.longitude,
              });
              setZoom(14);
            }
          }
        }
      }, 1500);

      toast({ title: 'Success', description: 'Request created successfully' });
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create request',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingRequest(false);
    }
  }, [session?.user?.id, createFormData, getUserRequests]);

  const handleSendFarmContact = useCallback(async () => {
    if (!contactFarm || !farmContactMessage.trim()) return;

    setIsSendingFarmContact(true);
    try {
      const response = await fetch(`/api/farms/${contactFarm.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: farmContactMessage.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: 'Message Sent',
        description: `Your message to ${contactFarm.name} has been sent.`,
      });
      setContactFarm(null);
      setFarmContactMessage('');
    } catch (error) {
      console.error('Error sending farm contact:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSendingFarmContact(false);
    }
  }, [contactFarm, farmContactMessage]);

  const calculateOptimalZoom = useCallback(
    (bounds: google.maps.LatLngBounds) => {
      if (!bounds) return 10;
      const latDiff = Math.abs(
        bounds.getNorthEast().lat() - bounds.getSouthWest().lat()
      );
      const lngDiff = Math.abs(
        bounds.getNorthEast().lng() - bounds.getSouthWest().lng()
      );
      const latZoom = Math.log2((360 * window.innerHeight) / (latDiff * 256));
      const lngZoom = Math.log2((360 * window.innerWidth) / (lngDiff * 256));
      return Math.floor(Math.min(latZoom, lngZoom) - 0.5);
    },
    []
  );

  const handleMarkerClick = useCallback(
    (e: google.maps.MapMouseEvent, request: Request) => {
      // Pin the InfoWindow open on click
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setPinnedFarm(null);
      setHoveredFarm(null);
      setPinnedRequest(request);
      setHoveredRequest(request);
    },
    []
  );

  const fetchFullRequestDetails = useCallback(async (requestId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/requests?requestId=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setFullRequestDetails(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleSelectRequest = useCallback(
    (request: Request) => {
      setSelectedRequest(request);
      setFullRequestDetails(null);
      setShowAllResponders(false);

      // Switch to map view when selecting a request
      setActiveView('dashboard');

      // Auto-center and zoom on map
      if (request.farm?.latitude && request.farm?.longitude) {
        const pos = { lat: request.farm.latitude, lng: request.farm.longitude };
        if (mapRef.current) {
          mapRef.current.panTo(pos);
          mapRef.current.setZoom(14);
        } else {
          setMapCenter(pos);
          setZoom(14);
        }
      }

      // Fetch full details
      fetchFullRequestDetails(request.id);
    },
    [fetchFullRequestDetails]
  );

  const handleCloseRequest = useCallback(async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(
        `/api/requests?requestId=${selectedRequest.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Request Closed',
          description: 'The request has been successfully closed.',
        });
        setShowCloseConfirmation(false);
        setSelectedRequest(null);
        setFullRequestDetails(null);

        // Refresh the requests
        getUserRequests();
      } else {
        throw new Error('Failed to close request');
      }
    } catch (error) {
      console.error('Error closing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to close request. Please try again.',
        variant: 'destructive',
      });
    }
  }, [selectedRequest, getUserRequests]);

  const handleRespondSubmit = useCallback(async () => {
    if (!selectedRequest) return;

    setIsSubmittingResponse(true);
    try {
      const now = new Date();
      const totalMinutes =
        parseInt(respondFormData.days || '0') * 24 * 60 +
        parseInt(respondFormData.hours || '0') * 60 +
        parseInt(respondFormData.minutes || '0');

      const estimatedArrivalTime = new Date(
        now.getTime() + totalMinutes * 60 * 1000
      );

      const response = await fetch(
        `/api/requests/${selectedRequest.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: selectedRequest.id,
            estimatedArrivalTime: estimatedArrivalTime.toISOString(),
            equipment: respondFormData.equipment,
          }),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.error || 'Failed to submit response');
      }

      toast({
        title: 'Response Submitted',
        description: 'Your response has been recorded.',
      });

      setShowRespondModal(false);
      setRespondFormData({ days: '', hours: '', minutes: '', equipment: '' });

      // Refresh request details
      fetchFullRequestDetails(selectedRequest.id);
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to submit response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingResponse(false);
    }
  }, [selectedRequest, respondFormData, fetchFullRequestDetails]);

  const handleCancelResponse = useCallback(
    async (responseId: string) => {
      if (!selectedRequest) return;

      try {
        const response = await fetch(
          `/api/requests/${selectedRequest.id}/respond/${responseId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Failed to cancel response');
        }

        toast({
          title: 'Response Cancelled',
          description: 'Your response has been cancelled.',
        });

        // Refresh request details
        fetchFullRequestDetails(selectedRequest.id);
      } catch (error) {
        console.error('Error cancelling response:', error);
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to cancel response. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [selectedRequest, fetchFullRequestDetails]
  );

  const refreshSelectedOrg = useCallback(async () => {
    if (!selectedOrg) return;
    try {
      const response = await fetch(
        `/api/organizations/${selectedOrg.id}?_t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedOrg(data);
        await fetchJoinRequests(selectedOrg.id);
      }
    } catch (error) {
      console.error('Error refreshing org:', error);
    }
  }, [selectedOrg, fetchJoinRequests]);

  // Load orgs and select from URL param if present
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const orgs = await fetchOrganizations();

      const orgIdParam = searchParams.get('org');
      if (orgIdParam && orgs.length > 0) {
        const org = orgs.find((o: Organization) => o.id === orgIdParam);
        if (org) {
          setSelectedOrg(org);
          await fetchJoinRequests(org.id);
        }
      } else if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        await fetchJoinRequests(orgs[0].id);
      }

      setIsLoading(false);
    };
    loadData();
  }, [fetchOrganizations, fetchJoinRequests, searchParams]);

  // Handle URL params for new request modal and auto-selecting a request
  useEffect(() => {
    const newRequestParam = searchParams.get('newRequest');
    const requestIdParam = searchParams.get('requestId');
    const respondParam = searchParams.get('respond');

    if (newRequestParam === 'true') {
      fetchCreateFarms();
      setShowCreateModal(true);
      // Clear the URL param
      router.replace('/dashboard', { scroll: false });
    }

    if (requestIdParam && !selectedRequest) {
      // Auto-select the request from URL
      const loadRequest = async () => {
        const response = await fetch(
          `/api/requests?requestId=${requestIdParam}`
        );
        if (response.ok) {
          const details = await response.json();
          if (details.length > 0) {
            setSelectedRequest(details[0] as Request);
            setFullRequestDetails(details[0] as FullRequestDetails);
            if (details[0].farm) {
              setMapCenter({
                lat: details[0].farm.latitude,
                lng: details[0].farm.longitude,
              });
              setZoom(14);
            }
            if (respondParam === 'true') {
              setShowRespondModal(true);
            }
          }
        }
      };
      loadRequest();
      // Clear the URL param
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, fetchCreateFarms, router, selectedRequest]);

  // Fetch map data (requests and farms)
  useEffect(() => {
    if (session?.user?.id) {
      getUserRequests();
      getUserFarms().then((farms) => {
        if (farms && farms.length > 0 && !mapCenter) {
          // Check if Google Maps API is loaded
          if (window.google?.maps?.LatLngBounds) {
            const bounds = new window.google.maps.LatLngBounds();
            farms.forEach((farm: Farm) => {
              bounds.extend({ lat: farm.latitude, lng: farm.longitude });
            });
            const optimalZoom = calculateOptimalZoom(bounds);
            setZoom(optimalZoom);
            setMapCenter({
              lat: bounds.getCenter().lat(),
              lng: bounds.getCenter().lng(),
            });
          } else {
            // Fallback: use first farm's coordinates
            setMapCenter({
              lat: farms[0].latitude,
              lng: farms[0].longitude,
            });
            setZoom(10);
          }
        }
      });
    }
  }, [
    session?.user?.id,
    getUserRequests,
    getUserFarms,
    calculateOptimalZoom,
    mapCenter,
  ]);

  // Initialize map center from geolocation
  useEffect(() => {
    if (!mapCenter) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback to a broad view of the US if geolocation fails
          setMapCenter({ lat: 39.8, lng: -98.6 });
          setZoom(4);
        }
      );
    }
  }, [mapCenter]);

  const handleOrgSwitch = async (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setSelectedOrg(org);
      router.push(`/dashboard?org=${orgId}`);
      await fetchJoinRequests(orgId);
    }
  };

  const getUserOrgRole = (org: Organization): OrgRole | null => {
    const member = org.members.find((m) => m.userId === session?.user?.id);
    return member?.role || null;
  };

  const canManageMembers = (org: Organization): boolean => {
    // System admins can manage any org
    if (session?.user?.role === 'ADMIN') return true;
    const role = getUserOrgRole(org);
    return role === 'OWNER' || role === 'MANAGER';
  };

  const handleAddMember = async () => {
    if (!selectedOrg || !newMemberEmail) return;

    try {
      const response = await fetch(
        `/api/organizations/${selectedOrg.id}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Member Added',
          description: `${newMemberEmail} has been added to the organization.`,
        });
        setNewMemberEmail('');
        setNewMemberRole('MEMBER');
        await refreshSelectedOrg();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to add member',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    }
  };

  const handleJoinRequestAction = async (
    requestId: string,
    action: 'approve' | 'reject'
  ) => {
    if (!selectedOrg) return;

    try {
      const response = await fetch(
        `/api/organizations/${selectedOrg.id}/join-requests`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, action }),
        }
      );

      if (response.ok) {
        toast({
          title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
          description:
            action === 'approve'
              ? 'The user has been added to the organization.'
              : 'The join request has been rejected.',
        });
        await fetchJoinRequests(selectedOrg.id);
        await refreshSelectedOrg();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to process request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing join request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className='container mx-auto py-8'>
        <div className='flex min-h-[400px] items-center justify-center'>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    );
  }

  const hasOrganizations = organizations.length > 0;

  const pendingJoinRequests = joinRequests.filter(
    (r) => r.status === 'PENDING'
  );

  const historicalJoinRequests = joinRequests.filter(
    (r) => r.status === 'APPROVED' || r.status === 'REJECTED'
  );

  return (
    <div className='px-4 py-4'>
      {/* Breadcrumb */}
      <div className='mb-4 flex items-center gap-1 text-sm text-muted-foreground'>
        <button
          onClick={() => router.push('/organizations')}
          className='hover:text-foreground hover:underline'
        >
          Organizations
        </button>
        <ChevronRight className='h-4 w-4' />
        <span className='text-foreground'>
          {selectedOrg?.name || 'Dashboard'}
        </span>
      </div>

      <div className='flex flex-col gap-4 pb-4 lg:h-[calc(100vh-8rem)] lg:flex-row lg:gap-2 lg:pb-0'>
        {/* Sidebar - hidden on mobile when request selected */}
        <div
          className={`w-full shrink-0 lg:flex lg:h-auto lg:w-80 lg:flex-col ${selectedRequest ? 'hidden' : 'block'}`}
        >
          <div className='flex flex-col overflow-hidden rounded-lg border bg-card lg:h-full'>
            {/* Org Switcher / Header */}
            <div className='border-b p-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                  <Building2 className='h-5 w-5 text-primary' />
                </div>
                <div className='min-w-0 flex-1'>
                  {hasOrganizations ? (
                    organizations.length > 1 ? (
                      <Select
                        value={selectedOrg?.id || ''}
                        onValueChange={handleOrgSwitch}
                      >
                        <SelectTrigger className='h-auto max-w-full truncate border-0 p-0 text-base font-semibold shadow-none hover:bg-transparent focus:ring-0 [&>span]:truncate [&>svg]:ml-1 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:opacity-50'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className='truncate text-base font-semibold'>
                        {selectedOrg?.name}
                      </p>
                    )
                  ) : (
                    <div>
                      <p className='text-base font-semibold'>Dashboard</p>
                      <p className='text-xs text-muted-foreground'>
                        Not a member of any organization
                      </p>
                    </div>
                  )}
                  {selectedOrg?.description && (
                    <p className='truncate text-xs text-muted-foreground'>
                      {selectedOrg.description}
                    </p>
                  )}
                  {selectedOrg && (
                    <span className='mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                      {getUserOrgRole(selectedOrg)?.charAt(0).toUpperCase()}
                      {getUserOrgRole(selectedOrg)?.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className='p-2'>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className='flex items-center gap-2'>
                  <Map className='h-4 w-4' />
                  Map
                </span>
              </button>

              {selectedOrg && (
                <>
                  <button
                    onClick={() => setActiveView('members')}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      activeView === 'members'
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className='flex items-center gap-2'>
                      <Users className='h-4 w-4' />
                      Members
                    </span>
                    <span className='rounded-full bg-muted px-2 py-0.5 text-xs'>
                      {selectedOrg._count.members.toLocaleString()}
                    </span>
                  </button>

                  {canManageMembers(selectedOrg) && (
                    <button
                      onClick={() => setActiveView('join-requests')}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        activeView === 'join-requests'
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className='flex items-center gap-2'>
                        <Clock className='h-4 w-4' />
                        Join Requests
                      </span>
                      {pendingJoinRequests.length > 0 && (
                        <span className='rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>
                          {pendingJoinRequests.length}
                        </span>
                      )}
                    </button>
                  )}
                </>
              )}

              {!hasOrganizations && (
                <Button
                  variant='secondary'
                  className='mt-2 w-full'
                  onClick={() => router.push('/organizations')}
                >
                  Browse Organizations
                </Button>
              )}

              {selectedOrg && (
                <button
                  onClick={() => setShowContactDialog(true)}
                  className='flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                >
                  <span className='flex items-center gap-2'>
                    <Mail className='h-4 w-4' />
                    Contact Owner
                  </span>
                </button>
              )}
            </div>

            {/* Disaster Requests - Tabbed Interface */}
            <div className='flex min-h-0 flex-1 flex-col border-t p-4'>
              <div className='mb-2 flex shrink-0 items-center justify-between'>
                <h3 className='text-sm font-medium'>Disaster Requests</h3>
                <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <button
                    onClick={handleShowAllFarms}
                    className='transition-colors hover:text-foreground'
                  >
                    All Farms
                  </button>
                  <span>·</span>
                  <button
                    onClick={handleShowAllRequests}
                    className='transition-colors hover:text-foreground'
                  >
                    All Requests
                  </button>
                </span>
              </div>
              <Tabs
                defaultValue='yours'
                className='flex min-h-0 flex-1 flex-col'
              >
                <TabsList className='mb-2 grid w-full grid-cols-3'>
                  <TabsTrigger value='yours' className='text-xs'>
                    Yours ({filteredYoursRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value='members' className='text-xs'>
                    Members ({filteredMemberRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value='nearby' className='text-xs'>
                    Nearby ({activeRequests.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value='yours'
                  className='mt-0 flex-1 overflow-hidden'
                >
                  {/* Status filter dropdown */}
                  <div className='mb-2'>
                    <Select
                      value={yoursStatusFilter}
                      onValueChange={(value) =>
                        setYoursStatusFilter(
                          value as 'active' | 'all' | 'inactive'
                        )
                      }
                    >
                      <SelectTrigger className='h-8 w-full text-xs focus:ring-0 focus:ring-offset-0'>
                        <SelectValue placeholder='Filter by status' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='active' className='text-xs'>
                          Active
                        </SelectItem>
                        <SelectItem value='inactive' className='text-xs'>
                          Inactive
                        </SelectItem>
                        <SelectItem value='all' className='text-xs'>
                          All
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='h-full max-h-40 overflow-y-auto rounded border bg-muted/30 p-2 lg:max-h-none'>
                    {filteredYoursRequests.length > 0 ? (
                      <RequestList
                        requests={filteredYoursRequests}
                        onSelect={handleSelectRequest}
                        selectedId={selectedRequest?.id}
                        compact
                      />
                    ) : (
                      <p className='py-4 text-center text-xs text-muted-foreground'>
                        {yoursStatusFilter === 'active'
                          ? 'No open requests'
                          : yoursStatusFilter === 'inactive'
                            ? 'No closed requests'
                            : 'No requests'}
                      </p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent
                  value='members'
                  className='mt-0 flex-1 overflow-hidden'
                >
                  {/* Org filter dropdown */}
                  <div className='mb-2'>
                    <Select
                      value={memberOrgFilter || 'all'}
                      onValueChange={(value) =>
                        setMemberOrgFilter(value === 'all' ? null : value)
                      }
                    >
                      <SelectTrigger className='h-8 w-full text-xs focus:ring-0 focus:ring-offset-0'>
                        <SelectValue placeholder='Filter by organization' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all' className='text-xs'>
                          All Organizations
                        </SelectItem>
                        {organizations.map((org) => (
                          <SelectItem
                            key={org.id}
                            value={org.id}
                            className='text-xs'
                          >
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='h-full max-h-40 overflow-y-auto rounded border bg-muted/30 p-2 lg:max-h-none'>
                    {filteredMemberRequests.length > 0 ? (
                      <RequestList
                        requests={filteredMemberRequests}
                        onSelect={handleSelectRequest}
                        selectedId={selectedRequest?.id}
                        compact
                      />
                    ) : (
                      <div className='flex flex-col items-center gap-3 py-4'>
                        <p className='text-center text-xs text-muted-foreground'>
                          No member requests
                        </p>
                        <button
                          onClick={handleShowAllRequests}
                          className='rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20'
                        >
                          Show all active requests
                        </button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent
                  value='nearby'
                  className='mt-0 flex-1 overflow-hidden'
                >
                  <div className='h-full max-h-48 overflow-y-auto rounded border bg-muted/30 p-2 lg:max-h-none'>
                    {activeRequests.length > 0 ? (
                      <RequestList
                        requests={activeRequests}
                        onSelect={handleSelectRequest}
                        selectedId={selectedRequest?.id}
                        compact
                      />
                    ) : (
                      <div className='flex flex-col items-center gap-3 py-4'>
                        <p className='text-center text-xs text-muted-foreground'>
                          No requests in this area
                        </p>
                        <button
                          onClick={handleShowAllRequests}
                          className='rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20'
                        >
                          Show all active requests
                        </button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='w-full lg:min-w-0 lg:flex-1 lg:overflow-hidden'>
          {activeView === 'dashboard' && (
            <div className='flex flex-col gap-4 lg:h-full lg:flex-row lg:gap-2'>
              {/* Request Detail Panel - shows when request is selected */}
              {selectedRequest && (
                <div className='flex flex-col rounded-lg border bg-card lg:h-full lg:w-96 lg:shrink-0'>
                  <div className='flex items-center justify-between rounded-t-lg border-b bg-card p-4'>
                    {/* Back button on mobile */}
                    <button
                      className='mr-2 rounded p-1 hover:bg-muted lg:hidden'
                      onClick={() => {
                        setSelectedRequest(null);
                        setFullRequestDetails(null);
                        setShowCloseConfirmation(false);
                        setShowRequestInfo(false);
                      }}
                    >
                      <ChevronLeft className='h-5 w-5' />
                    </button>
                    <div className='flex flex-1 items-center gap-2'>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDisasterTypeColors(selectedRequest.disasterType)}`}
                      >
                        {selectedRequest.disasterType.charAt(0).toUpperCase() +
                          selectedRequest.disasterType.slice(1).toLowerCase()}
                      </span>
                      <h3 className='font-semibold'>Request Details</h3>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='hidden lg:flex'
                      onClick={() => {
                        setSelectedRequest(null);
                        setFullRequestDetails(null);
                        setShowCloseConfirmation(false);
                        setShowRequestInfo(false);
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>

                  {isLoadingDetails ? (
                    <div className='flex flex-1 items-center justify-center p-8'>
                      <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                    </div>
                  ) : (
                    <div className='flex flex-1 flex-col overflow-hidden'>
                      <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-4'>
                        {/* Relative Time and Requester */}
                        <div className='flex items-center justify-between text-xs text-muted-foreground'>
                          <span>
                            {(() => {
                              const now = new Date();
                              const created = new Date(
                                selectedRequest.createdAt
                              );
                              const diffMs = now.getTime() - created.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              if (diffMins < 1) return 'Created just now';
                              if (diffMins < 60)
                                return `Created ${diffMins}m ago`;
                              if (diffHours < 24)
                                return `Created ${diffHours}h ago`;
                              return `Created ${diffDays}d ago`;
                            })()}
                          </span>
                          {fullRequestDetails?.user && (
                            <span>
                              by{' '}
                              {fullRequestDetails.user.name ||
                                fullRequestDetails.user.email}
                            </span>
                          )}
                        </div>

                        {/* Farm Info */}
                        {fullRequestDetails?.farm && (
                          <div className='rounded-lg bg-muted/50 p-3'>
                            <p className='mb-1 text-xs font-medium uppercase text-muted-foreground'>
                              Farm
                            </p>
                            <p className='font-medium'>
                              {fullRequestDetails.farm.name}
                            </p>
                            {(fullRequestDetails.farm.streetAddress ||
                              fullRequestDetails.farm.city) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className='mt-0.5 text-left text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-foreground'>
                                    🏠{' '}
                                    {[
                                      fullRequestDetails.farm.streetAddress,
                                      fullRequestDetails.farm.city,
                                      fullRequestDetails.farm.state,
                                      fullRequestDetails.farm.zipcode,
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}{' '}
                                    <ExternalLink className='inline h-3 w-3' />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start'>
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        [
                                          fullRequestDetails.farm.streetAddress,
                                          fullRequestDetails.farm.city,
                                          fullRequestDetails.farm.state,
                                          fullRequestDetails.farm.zipcode,
                                        ]
                                          .filter(Boolean)
                                          .join(', ')
                                      )}`}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                    >
                                      <ExternalLink className='mr-2 h-4 w-4' />
                                      Open in Google Maps
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`https://maps.apple.com/?address=${encodeURIComponent(
                                        [
                                          fullRequestDetails.farm.streetAddress,
                                          fullRequestDetails.farm.city,
                                          fullRequestDetails.farm.state,
                                          fullRequestDetails.farm.zipcode,
                                        ]
                                          .filter(Boolean)
                                          .join(', ')
                                      )}`}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                    >
                                      <ExternalLink className='mr-2 h-4 w-4' />
                                      Open in Apple Maps
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const address = [
                                        fullRequestDetails.farm.streetAddress,
                                        fullRequestDetails.farm.city,
                                        fullRequestDetails.farm.state,
                                        fullRequestDetails.farm.zipcode,
                                      ]
                                        .filter(Boolean)
                                        .join(', ');
                                      navigator.clipboard.writeText(address);
                                      toast({ title: 'Address copied' });
                                    }}
                                  >
                                    <Copy className='mr-2 h-4 w-4' />
                                    Copy address
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className='mt-0.5 flex items-center gap-1 text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-foreground'>
                                  📍{' '}
                                  {fullRequestDetails.farm.latitude.toFixed(4)},{' '}
                                  {fullRequestDetails.farm.longitude.toFixed(4)}
                                  <ExternalLink className='ml-0.5 h-3 w-3 shrink-0' />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='start'>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${fullRequestDetails.farm.latitude},${fullRequestDetails.farm.longitude}`}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                  >
                                    <ExternalLink className='mr-2 h-4 w-4' />
                                    Open in Google Maps
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://maps.apple.com/?ll=${fullRequestDetails.farm.latitude},${fullRequestDetails.farm.longitude}`}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                  >
                                    <ExternalLink className='mr-2 h-4 w-4' />
                                    Open in Apple Maps
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    const coords = `${fullRequestDetails.farm.latitude}, ${fullRequestDetails.farm.longitude}`;
                                    navigator.clipboard.writeText(coords);
                                    toast({ title: 'Coordinates copied' });
                                  }}
                                >
                                  <Copy className='mr-2 h-4 w-4' />
                                  Copy coordinates
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Preferred Gate */}
                        {fullRequestDetails?.preferredGate && (
                          <div className='text-sm'>
                            <p className='text-muted-foreground'>
                              Preferred Gate
                            </p>
                            <p className='font-medium'>
                              {fullRequestDetails.preferredGate.name}
                            </p>
                          </div>
                        )}

                        {/* Respond Button */}
                        <Button
                          className='w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                          onClick={() => setShowRespondModal(true)}
                        >
                          Respond to Request
                        </Button>

                        {/* Message from Requester */}
                        {fullRequestDetails?.comments && (
                          <div>
                            <p className='mb-1 text-xs text-muted-foreground'>
                              Comments
                            </p>
                            <blockquote className='border-l-4 border-muted-foreground/30 pl-3 text-sm italic text-foreground'>
                              <p className='whitespace-pre-wrap'>
                                {fullRequestDetails.comments}
                              </p>
                              {fullRequestDetails?.user && (
                                <footer className='mt-1 text-xs not-italic text-muted-foreground'>
                                  —{' '}
                                  {fullRequestDetails.user.name ||
                                    fullRequestDetails.user.email}
                                </footer>
                              )}
                            </blockquote>
                          </div>
                        )}

                        {/* Responders */}
                        {fullRequestDetails?.responses &&
                          fullRequestDetails.responses.length > 0 && (
                            <div className='rounded-lg bg-muted/30 p-3'>
                              <p className='mb-2 text-xs font-medium uppercase text-muted-foreground'>
                                Responders (
                                {fullRequestDetails.responses.length})
                              </p>
                              <div className='space-y-2'>
                                {(showAllResponders
                                  ? fullRequestDetails.responses
                                  : fullRequestDetails.responses.slice(0, 3)
                                ).map((response) => {
                                  const eta = new Date(
                                    response.estimatedArrivalTime
                                  );
                                  const now = new Date();
                                  const diffMs = eta.getTime() - now.getTime();
                                  const diffDays = Math.floor(
                                    diffMs / (1000 * 60 * 60 * 24)
                                  );
                                  const diffHours = Math.floor(
                                    (diffMs % (1000 * 60 * 60 * 24)) /
                                      (1000 * 60 * 60)
                                  );
                                  const diffMinutes = Math.floor(
                                    (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                                  );
                                  const etaStr =
                                    diffMs > 0
                                      ? `${diffDays > 0 ? `${diffDays}d ` : ''}${diffHours}h ${diffMinutes}m`
                                      : 'Arrived';
                                  // Format arrival time in local timezone
                                  const arrivalTimeStr = eta.toLocaleString(
                                    undefined,
                                    {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    }
                                  );
                                  const isExpanded = expandedResponders.has(
                                    response.id
                                  );
                                  const isOwnResponse =
                                    response.userId === session?.user?.id;

                                  return (
                                    <div
                                      key={response.id}
                                      className='rounded-lg border bg-muted/30 p-2'
                                    >
                                      <div className='flex items-center justify-between'>
                                        <div className='flex-1'>
                                          <div className='flex items-center gap-2'>
                                            <p className='text-sm font-medium'>
                                              {response.responder.name ||
                                                'Unknown'}
                                            </p>
                                            {isOwnResponse && (
                                              <span className='rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300'>
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <p className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
                                            {diffMs > 0
                                              ? `Arriving ${arrivalTimeStr}`
                                              : 'Arrived'}
                                          </p>
                                          {diffMs > 0 && (
                                            <p className='text-xs text-muted-foreground'>
                                              (in {etaStr})
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newSet = new Set(
                                              expandedResponders
                                            );
                                            if (isExpanded) {
                                              newSet.delete(response.id);
                                            } else {
                                              newSet.add(response.id);
                                            }
                                            setExpandedResponders(newSet);
                                          }}
                                          className='p-1 text-muted-foreground hover:text-foreground'
                                        >
                                          <ChevronDown
                                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      </div>
                                      {isExpanded && (
                                        <div className='mt-2 space-y-2 border-t pt-2'>
                                          <div>
                                            <p className='text-xs text-muted-foreground'>
                                              Equipment
                                            </p>
                                            <p className='whitespace-pre-wrap text-sm'>
                                              {response.equipment ||
                                                'Not specified'}
                                            </p>
                                          </div>
                                          {isOwnResponse && (
                                            <Button
                                              variant='outline'
                                              size='sm'
                                              className='w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                                              onClick={() =>
                                                handleCancelResponse(
                                                  response.id
                                                )
                                              }
                                            >
                                              Cancel My Response
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {fullRequestDetails.responses.length > 3 && (
                                <button
                                  onClick={() =>
                                    setShowAllResponders(!showAllResponders)
                                  }
                                  className='mt-2 w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                                >
                                  {showAllResponders
                                    ? 'Show fewer'
                                    : `Show all ${fullRequestDetails.responses.length} responders`}
                                </button>
                              )}
                            </div>
                          )}

                        {/* Collapsible Info Section - Bottom aligned */}
                        <div className='mt-auto'>
                          <button
                            onClick={() => setShowRequestInfo(!showRequestInfo)}
                            className='flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground'
                          >
                            <Info className='h-3 w-3' />
                            <span>Request Info</span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${showRequestInfo ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {showRequestInfo && (
                            <div className='mt-2 space-y-2 rounded-lg bg-muted/30 p-3 text-sm'>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Created
                                </p>
                                <p className='font-medium'>
                                  {new Date(
                                    selectedRequest.createdAt
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Request ID
                                </p>
                                <p className='font-mono text-xs'>
                                  {selectedRequest.id}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className='border-t p-4'>
                        {/* Close Request Confirmation */}
                        {showCloseConfirmation ? (
                          <div className='space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950'>
                            <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                              Are you sure you want to close this request?
                            </p>
                            <p className='text-xs text-red-700 dark:text-red-300'>
                              This action cannot be undone.
                            </p>
                            <div className='flex gap-2'>
                              <Button
                                variant='destructive'
                                size='sm'
                                className='flex-1'
                                onClick={handleCloseRequest}
                              >
                                Close Request
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='flex-1'
                                onClick={() => setShowCloseConfirmation(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {/* Close button for owner or privileged users */}
                            {(selectedRequest.userId === session?.user?.id ||
                              session?.user?.role === 'ADMIN' ||
                              (selectedOrg &&
                                canManageMembers(selectedOrg))) && (
                              <Button
                                variant='destructive'
                                className='w-full'
                                onClick={() => setShowCloseConfirmation(true)}
                              >
                                Close Request
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Map */}
              <div className='relative h-[80vh] min-h-[400px] overflow-hidden rounded-lg lg:h-full lg:flex-1'>
                <GoogleMapComponent
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={zoom}
                  mapRef={mapRef}
                  onBoundsChanged={(bounds: google.maps.LatLngBounds) => {
                    debouncedGetActiveRequests(bounds);
                  }}
                  onClick={() => {
                    setHoveredFarm(null);
                    setHoveredRequest(null);
                    setPinnedFarm(null);
                    setPinnedRequest(null);
                  }}
                >
                  {/* Legend */}
                  <div className='absolute right-4 top-4 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800'>
                    <div className='mb-2 flex items-center'>
                      <svg
                        className='mr-2 h-4 w-4 fill-[#DB4437]'
                        viewBox='0 0 16 16'
                      >
                        <path d={MAP_EXCLAMATION_POINT} />
                      </svg>
                      <span className='text-sm text-foreground'>
                        Nearby Requests
                      </span>
                    </div>
                    <div className='mb-2 flex items-center'>
                      <svg
                        className='mr-2 h-4 w-4 fill-[#4285F4]'
                        viewBox='0 0 16 16'
                      >
                        <path d={MAP_EXCLAMATION_POINT} />
                      </svg>
                      <span className='text-sm text-foreground'>
                        Your Requests
                      </span>
                    </div>
                    <div className='mb-2 flex items-center'>
                      <svg
                        className='mr-2 h-4 w-4 fill-[#0F9D58]'
                        viewBox='0 0 16 16'
                      >
                        <path d={MAP_FARM_POINT} />
                      </svg>
                      <span className='text-sm text-foreground'>
                        Your Farms
                      </span>
                    </div>
                    {selectedOrg?.farms && selectedOrg.farms.length > 0 && (
                      <div className='mb-2 flex items-center'>
                        <svg
                          className='mr-2 h-4 w-4 fill-[#9C27B0]'
                          viewBox='0 0 16 16'
                        >
                          <path d={MAP_FARM_POINT} />
                        </svg>
                        <span className='text-sm text-foreground'>
                          Org Farms
                        </span>
                      </div>
                    )}
                    {communityFarms.length > 0 && (
                      <div className='flex items-center'>
                        <svg
                          className='mr-2 h-4 w-4 fill-[#FF9800]'
                          viewBox='0 0 16 16'
                        >
                          <path d={MAP_FARM_POINT} />
                        </svg>
                        <span className='text-sm text-foreground'>
                          Community Farms
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nearby requests markers */}
                  {activeRequests
                    .filter(
                      (request) =>
                        request.farm?.latitude && request.farm?.longitude
                    )
                    .map((request) => (
                      <Marker
                        key={request.id}
                        position={{
                          lat: request.farm.latitude,
                          lng: request.farm.longitude,
                        }}
                        icon={{
                          path: MAP_EXCLAMATION_POINT,
                          fillColor: '#DB4437',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          scale: 1.5,
                        }}
                        onMouseOver={() => {
                          if (hoverTimeoutRef.current)
                            clearTimeout(hoverTimeoutRef.current);
                          setHoveredFarm(null);
                          setPinnedFarm(null);
                          setHoveredRequest(request);
                        }}
                        onMouseOut={() => {
                          hoverTimeoutRef.current = setTimeout(() => {
                            if (
                              !isOverInfoWindowRef.current &&
                              (!pinnedRequest ||
                                pinnedRequest.id !== request.id)
                            ) {
                              setHoveredRequest(null);
                            }
                          }, 100);
                        }}
                        onClick={(e) => handleMarkerClick(e, request)}
                      />
                    ))}

                  {/* User requests markers */}
                  {userRequests
                    .filter(
                      (request) =>
                        request.farm?.latitude && request.farm?.longitude
                    )
                    .map((request) => (
                      <Marker
                        key={request.id}
                        position={{
                          lat: request.farm.latitude,
                          lng: request.farm.longitude,
                        }}
                        icon={{
                          path: MAP_EXCLAMATION_POINT,
                          fillColor: '#4285F4',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          scale: 1.5,
                        }}
                        onMouseOver={() => {
                          if (hoverTimeoutRef.current)
                            clearTimeout(hoverTimeoutRef.current);
                          setHoveredFarm(null);
                          setPinnedFarm(null);
                          setHoveredRequest(request);
                        }}
                        onMouseOut={() => {
                          hoverTimeoutRef.current = setTimeout(() => {
                            if (
                              !isOverInfoWindowRef.current &&
                              (!pinnedRequest ||
                                pinnedRequest.id !== request.id)
                            ) {
                              setHoveredRequest(null);
                            }
                          }, 100);
                        }}
                        onClick={(e) => handleMarkerClick(e, request)}
                      />
                    ))}

                  {/* User farms markers — hide farms that already have a request marker */}
                  {userFarms
                    .filter(
                      (farm) =>
                        farm.latitude &&
                        farm.longitude &&
                        !userRequests.some(
                          (r) =>
                            r.farm?.latitude === farm.latitude &&
                            r.farm?.longitude === farm.longitude
                        ) &&
                        !activeRequests.some(
                          (r) =>
                            r.farm?.latitude === farm.latitude &&
                            r.farm?.longitude === farm.longitude
                        )
                    )
                    .map((farm) => (
                      <Marker
                        key={farm.id}
                        position={{
                          lat: farm.latitude,
                          lng: farm.longitude,
                        }}
                        icon={{
                          path: MAP_FARM_POINT,
                          fillColor: '#0F9D58',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          scale: 1.5,
                        }}
                      />
                    ))}

                  {/* Org farms markers — hide farms that already have a request marker */}
                  {selectedOrg?.farms
                    ?.filter(
                      (farm) =>
                        !userRequests.some(
                          (r) =>
                            r.farm?.latitude === farm.latitude &&
                            r.farm?.longitude === farm.longitude
                        ) &&
                        !activeRequests.some(
                          (r) =>
                            r.farm?.latitude === farm.latitude &&
                            r.farm?.longitude === farm.longitude
                        )
                    )
                    .map((farm) => (
                      <Marker
                        key={`org-${farm.id}`}
                        position={{
                          lat: farm.latitude,
                          lng: farm.longitude,
                        }}
                        icon={{
                          path: MAP_FARM_POINT,
                          fillColor: '#9C27B0',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          scale: 1.5,
                        }}
                      />
                    ))}

                  {/* Community farms markers — hide farms that have an active request marker */}
                  {communityFarms
                    .filter(
                      (cf) =>
                        !cf.hasActiveRequest &&
                        !userFarms.some((uf) => uf.id === cf.id) &&
                        !selectedOrg?.farms?.some((of) => of.id === cf.id)
                    )
                    .map((farm) => (
                      <Marker
                        key={`community-${farm.id}`}
                        position={{
                          lat: farm.latitude,
                          lng: farm.longitude,
                        }}
                        icon={{
                          path: MAP_FARM_POINT,
                          fillColor: '#FF9800',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          scale: 1.5,
                        }}
                        onMouseOver={() => {
                          if (hoverTimeoutRef.current)
                            clearTimeout(hoverTimeoutRef.current);
                          setHoveredRequest(null);
                          setPinnedRequest(null);
                          setHoveredFarm(farm);
                        }}
                        onMouseOut={() => {
                          hoverTimeoutRef.current = setTimeout(() => {
                            if (
                              !isOverInfoWindowRef.current &&
                              (!pinnedFarm || pinnedFarm.id !== farm.id)
                            ) {
                              setHoveredFarm(null);
                            }
                          }, 100);
                        }}
                        onClick={(_e) => {
                          // Pin the InfoWindow open on click
                          if (hoverTimeoutRef.current)
                            clearTimeout(hoverTimeoutRef.current);
                          setPinnedRequest(null);
                          setHoveredRequest(null);
                          setPinnedFarm(farm);
                          setHoveredFarm(farm);
                        }}
                      />
                    ))}

                  {/* Hover tooltip for community farms */}
                  {hoveredFarm && (
                    <InfoWindow
                      position={{
                        lat: hoveredFarm.latitude,
                        lng: hoveredFarm.longitude,
                      }}
                      options={{
                        disableAutoPan: true,
                        pixelOffset: new google.maps.Size(12, 0),
                      }}
                      onCloseClick={() => {
                        setHoveredFarm(null);
                        setPinnedFarm(null);
                      }}
                    >
                      <div
                        onMouseEnter={() => {
                          isOverInfoWindowRef.current = true;
                          if (hoverTimeoutRef.current)
                            clearTimeout(hoverTimeoutRef.current);
                        }}
                        onMouseLeave={() => {
                          isOverInfoWindowRef.current = false;
                          if (!pinnedFarm) {
                            hoverTimeoutRef.current = setTimeout(() => {
                              setHoveredFarm(null);
                            }, 100);
                          }
                        }}
                      >
                        <p className='text-sm font-semibold text-gray-900'>
                          {hoveredFarm.name}
                        </p>
                        {hoveredFarm.city && hoveredFarm.state && (
                          <p className='text-xs text-gray-500'>
                            {hoveredFarm.city}, {hoveredFarm.state}
                          </p>
                        )}
                        {(hoveredFarm.canContact ||
                          hoveredFarm.hasActiveRequest) && (
                          <>
                            <hr className='my-2 border-gray-300' />
                            <div className='flex flex-col gap-1.5'>
                              <button
                                className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${hoveredFarm.latitude},${hoveredFarm.longitude}`,
                                    '_blank'
                                  );
                                }}
                              >
                                <ExternalLink className='h-3.5 w-3.5' />
                                Directions
                              </button>
                              {hoveredFarm.canContact && (
                                <button
                                  className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                  onClick={() => {
                                    setContactFarm(hoveredFarm);
                                    setHoveredFarm(null);
                                  }}
                                >
                                  <Mail className='h-3.5 w-3.5' />
                                  Contact Owner
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </InfoWindow>
                  )}

                  {/* Hover tooltip for request markers */}
                  {hoveredRequest &&
                    hoveredRequest.farm?.latitude &&
                    hoveredRequest.farm?.longitude && (
                      <InfoWindow
                        position={{
                          lat: hoveredRequest.farm.latitude,
                          lng: hoveredRequest.farm.longitude,
                        }}
                        options={{
                          disableAutoPan: true,
                          pixelOffset: new google.maps.Size(12, 0),
                        }}
                        onCloseClick={() => {
                          setHoveredRequest(null);
                          setPinnedRequest(null);
                        }}
                      >
                        {(() => {
                          const matchingFarm = communityFarms.find(
                            (cf) =>
                              cf.latitude === hoveredRequest.farm?.latitude &&
                              cf.longitude === hoveredRequest.farm?.longitude
                          );
                          return (
                            <div
                              onMouseEnter={() => {
                                isOverInfoWindowRef.current = true;
                                if (hoverTimeoutRef.current)
                                  clearTimeout(hoverTimeoutRef.current);
                              }}
                              onMouseLeave={() => {
                                isOverInfoWindowRef.current = false;
                                if (!pinnedRequest) {
                                  hoverTimeoutRef.current = setTimeout(() => {
                                    setHoveredRequest(null);
                                  }, 100);
                                }
                              }}
                            >
                              <p className='text-sm font-semibold text-gray-900'>
                                {hoveredRequest.farm.name}
                              </p>
                              <p className='text-xs font-medium text-red-600'>
                                {hoveredRequest.disasterType}
                              </p>
                              {(hoveredRequest.user?.name ||
                                matchingFarm?.ownerName) && (
                                <p className='text-xs text-gray-500'>
                                  {hoveredRequest.user?.name ||
                                    matchingFarm?.ownerName}
                                </p>
                              )}
                              {matchingFarm?.city && matchingFarm?.state && (
                                <p className='text-xs text-gray-500'>
                                  {matchingFarm.city}, {matchingFarm.state}
                                </p>
                              )}
                              <hr className='my-2 border-gray-300' />
                              <div className='flex flex-col gap-1.5'>
                                <button
                                  className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                  onClick={() => {
                                    window.open(
                                      `https://www.google.com/maps/dir/?api=1&destination=${hoveredRequest.farm.latitude},${hoveredRequest.farm.longitude}`,
                                      '_blank'
                                    );
                                  }}
                                >
                                  <ExternalLink className='h-3.5 w-3.5' />
                                  Directions
                                </button>
                                <button
                                  className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                  onClick={() => {
                                    window.location.href = `/dashboard?requestId=${hoveredRequest.id}`;
                                  }}
                                >
                                  <Info className='h-3.5 w-3.5' />
                                  View Details
                                </button>
                                <button
                                  className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                  onClick={() => {
                                    window.location.href = `/dashboard?requestId=${hoveredRequest.id}&respond=true`;
                                  }}
                                >
                                  <MessageCircle className='h-3.5 w-3.5' />
                                  Respond
                                </button>
                                {matchingFarm?.canContact && (
                                  <button
                                    className='flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-100'
                                    onClick={() => {
                                      setContactFarm(matchingFarm);
                                      setHoveredRequest(null);
                                    }}
                                  >
                                    <Mail className='h-3.5 w-3.5' />
                                    Contact Owner
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </InfoWindow>
                    )}
                </GoogleMapComponent>
              </div>
            </div>
          )}

          {activeView === 'members' && selectedOrg && (
            <div className='mx-auto max-w-3xl space-y-4 overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:h-full [&::-webkit-scrollbar]:hidden'>
              {canManageMembers(selectedOrg) && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-lg'>
                        <UserPlus className='h-4 w-4' />
                        Add Member
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='flex flex-col gap-4 sm:flex-row'>
                        <div className='flex-1'>
                          <Label htmlFor='memberEmail'>Email</Label>
                          <Input
                            id='memberEmail'
                            type='email'
                            placeholder='user@example.com'
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                          />
                        </div>
                        <div className='w-full sm:w-32'>
                          <Label htmlFor='memberRole'>Role</Label>
                          <Select
                            value={newMemberRole}
                            onValueChange={(value) =>
                              setNewMemberRole(value as OrgRole)
                            }
                          >
                            <SelectTrigger id='memberRole'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='MEMBER'>Member</SelectItem>
                              <SelectItem value='MANAGER'>Manager</SelectItem>
                              {(session?.user?.role === 'ADMIN' ||
                                getUserOrgRole(selectedOrg) === 'OWNER') && (
                                <SelectItem value='OWNER'>Owner</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className='flex items-end'>
                          <Button variant='secondary' onClick={handleAddMember}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <BulkMemberManagement
                    orgId={selectedOrg.id}
                    currentUserId={session?.user?.id || ''}
                    currentUserOrgRole={getUserOrgRole(selectedOrg)}
                    isPlatformAdmin={session?.user?.role === 'ADMIN'}
                    onRefresh={refreshSelectedOrg}
                  />
                </>
              )}
              {!canManageMembers(selectedOrg) && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Organization Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {selectedOrg.members.map((member) => (
                        <div
                          key={member.id}
                          className='flex items-center justify-between rounded-lg border p-3'
                        >
                          <div className='flex items-center gap-3'>
                            {member.user.image ? (
                              <img
                                src={member.user.image}
                                alt={member.user.name || ''}
                                className='h-8 w-8 rounded-full'
                              />
                            ) : (
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                                {(member.user.name ||
                                  member.user.email)[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className='font-medium'>
                                {member.user.name || member.user.email}
                              </p>
                              <a
                                href={`mailto:${member.user.email}`}
                                className='flex items-center gap-1 text-sm text-muted-foreground hover:underline'
                              >
                                <Mail className='h-3 w-3' />
                                {member.user.email}
                              </a>
                            </div>
                          </div>
                          <span className='rounded bg-muted px-2 py-1 text-sm font-medium'>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeView === 'join-requests' &&
            selectedOrg &&
            canManageMembers(selectedOrg) && (
              <div className='mx-auto max-w-3xl space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Pending Join Requests
                    </CardTitle>
                    <CardDescription>
                      Review and approve or reject requests from users who want
                      to join your organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingJoinRequests.length === 0 ? (
                      <p className='py-8 text-center text-muted-foreground'>
                        No pending join requests
                      </p>
                    ) : (
                      <div className='space-y-3'>
                        {pendingJoinRequests.map((request) => (
                          <div
                            key={request.id}
                            className='flex items-center justify-between rounded-lg border p-4'
                          >
                            <div className='flex items-center gap-3'>
                              {request.user.image ? (
                                <img
                                  src={request.user.image}
                                  alt={request.user.name || ''}
                                  className='h-10 w-10 rounded-full'
                                />
                              ) : (
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                                  {(request.user.name ||
                                    request.user.email)[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className='font-medium'>
                                  {request.user.name || request.user.email}
                                </p>
                                <p className='text-sm text-muted-foreground'>
                                  {request.user.email}
                                </p>
                                {request.message && (
                                  <p className='mt-1 text-sm italic'>
                                    &quot;{request.message}&quot;
                                  </p>
                                )}
                                <p className='mt-1 text-xs text-muted-foreground'>
                                  Requested{' '}
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Button
                                variant='secondary'
                                size='sm'
                                onClick={() =>
                                  handleJoinRequestAction(request.id, 'approve')
                                }
                              >
                                <Check className='mr-1 h-4 w-4' />
                                Approve
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  handleJoinRequestAction(request.id, 'reject')
                                }
                              >
                                <X className='mr-1 h-4 w-4' />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Historical Join Requests */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Request History</CardTitle>
                    <CardDescription>
                      Previously processed join requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historicalJoinRequests.length === 0 ? (
                      <p className='py-8 text-center text-muted-foreground'>
                        No previous requests
                      </p>
                    ) : (
                      <div className='space-y-3'>
                        {historicalJoinRequests.map((request) => (
                          <div
                            key={request.id}
                            className='flex items-center justify-between rounded-lg border p-4'
                          >
                            <div className='flex items-center gap-3'>
                              {request.user.image ? (
                                <img
                                  src={request.user.image}
                                  alt={request.user.name || ''}
                                  className='h-10 w-10 rounded-full'
                                />
                              ) : (
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                                  {(request.user.name ||
                                    request.user.email)[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className='font-medium'>
                                  {request.user.name || request.user.email}
                                </p>
                                <p className='text-sm text-muted-foreground'>
                                  {request.user.email}
                                </p>
                                <p className='mt-1 text-xs text-muted-foreground'>
                                  Requested{' '}
                                  {new Date(
                                    request.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
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
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
        </div>
      </div>

      {/* Respond to Request Modal */}
      <Dialog open={showRespondModal} onOpenChange={setShowRespondModal}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Respond to Request</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            {selectedRequest && fullRequestDetails && (
              <div className='rounded-lg bg-muted/50 p-3 text-sm'>
                <p className='font-medium'>
                  {fullRequestDetails.farm?.name || 'Unknown Farm'}
                </p>
                <p className='text-muted-foreground'>
                  {selectedRequest.disasterType}
                </p>
                {fullRequestDetails.comments && (
                  <p className='mt-1 text-muted-foreground'>
                    {fullRequestDetails.comments}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className='mb-2 block text-sm font-medium'>
                Estimated Arrival Time
              </Label>
              <div className='flex gap-2'>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    value={respondFormData.days}
                    onChange={(e) =>
                      setRespondFormData({
                        ...respondFormData,
                        days: e.target.value,
                      })
                    }
                    placeholder='0'
                    className='w-16'
                  />
                  <span className='mt-1 text-xs text-muted-foreground'>
                    Days
                  </span>
                </div>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    max='23'
                    value={respondFormData.hours}
                    onChange={(e) =>
                      setRespondFormData({
                        ...respondFormData,
                        hours: e.target.value,
                      })
                    }
                    placeholder='0'
                    className='w-16'
                  />
                  <span className='mt-1 text-xs text-muted-foreground'>
                    Hours
                  </span>
                </div>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={respondFormData.minutes}
                    onChange={(e) =>
                      setRespondFormData({
                        ...respondFormData,
                        minutes: e.target.value,
                      })
                    }
                    placeholder='0'
                    className='w-16'
                  />
                  <span className='mt-1 text-xs text-muted-foreground'>
                    Minutes
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className='mb-2 block text-sm font-medium'>
                Available Equipment
              </Label>
              <Textarea
                value={respondFormData.equipment}
                onChange={(e) =>
                  setRespondFormData({
                    ...respondFormData,
                    equipment: e.target.value,
                  })
                }
                placeholder='List the equipment you can provide'
                rows={3}
                maxLength={2000}
              />
              <p className='mt-1 text-xs text-muted-foreground'>
                {respondFormData.equipment.length}/2000 characters
              </p>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setShowRespondModal(false)}
                disabled={isSubmittingResponse}
              >
                Cancel
              </Button>
              <Button
                className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                onClick={handleRespondSubmit}
                disabled={
                  isSubmittingResponse ||
                  (!respondFormData.days &&
                    !respondFormData.hours &&
                    !respondFormData.minutes)
                }
              >
                {isSubmittingResponse ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Request Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (open) fetchCreateFarms();
        }}
      >
        <DialogContent className='p-6 sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 pt-2'>
            {createSuccess ? (
              <div className='flex flex-col items-center gap-3 py-4'>
                <CheckCircle2 className='h-12 w-12 text-green-500' />
                <p className='text-center font-medium'>
                  Request created successfully!
                </p>
                <p className='text-center text-sm text-muted-foreground'>
                  Opening your request...
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label className='mb-2 block text-sm font-medium'>
                    Type of Disaster <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={createFormData.disasterType}
                    onValueChange={(value) =>
                      setCreateFormData({
                        ...createFormData,
                        disasterType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='fire'>Fire</SelectItem>
                      <SelectItem value='flood'>Flood</SelectItem>
                      <SelectItem value='hurricane'>Hurricane</SelectItem>
                      <SelectItem value='tornado'>Tornado</SelectItem>
                      <SelectItem value='drought'>Drought</SelectItem>
                      <SelectItem value='frost'>Frost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className='mb-2 block text-sm font-medium'>
                    Farm <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={createFormData.farmId}
                    onValueChange={(value) => {
                      setCreateFormData({
                        ...createFormData,
                        farmId: value,
                        preferredGateId: '',
                      });
                      fetchCreateGates(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select farm' />
                    </SelectTrigger>
                    <SelectContent>
                      {createFarms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className='mb-2 block text-sm font-medium'>
                    Description
                  </Label>
                  <Textarea
                    placeholder='(Optional) Describe the situation and what help is needed...'
                    value={createFormData.comments}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        comments: e.target.value.slice(0, 2000),
                      })
                    }
                    maxLength={2000}
                    rows={3}
                    className='resize-none'
                  />
                  <p className='mt-1 text-right text-xs text-muted-foreground'>
                    {createFormData.comments.length}/2000
                  </p>
                </div>

                <div className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    id='createUseGate'
                    checked={createFormData.useGate}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        useGate: e.target.checked,
                      })
                    }
                    className='h-4 w-4 rounded border-gray-300'
                  />
                  <Label htmlFor='createUseGate' className='text-sm'>
                    Do you have a Gate you want to add?
                  </Label>
                </div>

                {createFormData.useGate && (
                  <div>
                    <Label className='mb-2 block text-sm font-medium'>
                      Gate
                    </Label>
                    <Select
                      value={createFormData.preferredGateId}
                      onValueChange={(value) =>
                        setCreateFormData({
                          ...createFormData,
                          preferredGateId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select gate' />
                      </SelectTrigger>
                      <SelectContent>
                        {createGates.map((gate) => (
                          <SelectItem key={gate.id} value={gate.id}>
                            {gate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className='flex justify-end gap-2 pt-2'>
                  <Button
                    variant='outline'
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreatingRequest}
                  >
                    Cancel
                  </Button>
                  <Button
                    className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                    onClick={handleCreateRequestSubmit}
                    disabled={isCreatingRequest || !createFormData.farmId}
                  >
                    {isCreatingRequest ? 'Creating...' : 'Create Request'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSubscriptionGate}
        onOpenChange={setShowSubscriptionGate}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Subscription Required</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              You can continue browsing Paladin for free, but creating new
              requests requires an active PayPal subscription.
            </p>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setShowSubscriptionGate(false)}
              >
                Continue Free
              </Button>
              <Button
                className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                onClick={() => {
                  setShowSubscriptionGate(false);
                  setShowDonateDialog(true);
                }}
              >
                Subscribe / Donate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DonateDialog
        open={showDonateDialog}
        onOpenChange={setShowDonateDialog}
      />

      {/* Contact Organization Owner Dialog */}
      <Dialog
        open={showContactDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowContactDialog(false);
            setContactMessage('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Organization</DialogTitle>
            <DialogDescription>
              Send a message to the owner of{' '}
              <span className='font-medium'>{selectedOrg?.name}</span>. They
              will receive your message via email and can reply directly to you.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='dashboardContactMessage'>Message</Label>
            <Textarea
              id='dashboardContactMessage'
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
                setShowContactDialog(false);
                setContactMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedOrg || !contactMessage.trim()) return;
                setIsSendingContact(true);
                try {
                  const response = await fetch(
                    `/api/organizations/${selectedOrg.id}/contact`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: contactMessage.trim() }),
                    }
                  );
                  if (response.ok) {
                    toast({
                      title: 'Message Sent',
                      description:
                        'Your message has been sent to the organization owner.',
                    });
                    setShowContactDialog(false);
                    setContactMessage('');
                  } else {
                    const error = await response.json();
                    toast({
                      title: 'Error',
                      description: error.error || 'Failed to send message',
                      variant: 'destructive',
                    });
                  }
                } catch {
                  toast({
                    title: 'Error',
                    description: 'Failed to send message',
                    variant: 'destructive',
                  });
                } finally {
                  setIsSendingContact(false);
                }
              }}
              disabled={!contactMessage.trim() || isSendingContact}
              className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            >
              {isSendingContact ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Farm Dialog */}
      <Dialog
        open={!!contactFarm}
        onOpenChange={(open) => {
          if (!open) {
            setContactFarm(null);
            setFarmContactMessage('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {contactFarm?.name || 'Farm'}</DialogTitle>
            <DialogDescription>
              Send a message to the owner of this property. They will receive
              your message via email and can reply directly to you.
              {contactFarm?.ownerName && (
                <span className='mt-1 block font-medium'>
                  Owner: {contactFarm.ownerName}
                </span>
              )}
              {contactFarm?.city && contactFarm?.state && (
                <span className='block text-xs'>
                  {contactFarm.city}, {contactFarm.state}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='farm-contact-message'>Message</Label>
              <Textarea
                id='farm-contact-message'
                placeholder='Write your message here...'
                value={farmContactMessage}
                onChange={(e) => setFarmContactMessage(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className='mt-1 text-xs text-muted-foreground'>
                {farmContactMessage.length}/2000 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setContactFarm(null);
                setFarmContactMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendFarmContact}
              disabled={!farmContactMessage.trim() || isSendingFarmContact}
              className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            >
              {isSendingFarmContact ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
