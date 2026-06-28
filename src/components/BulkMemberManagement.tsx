'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Download,
  Trash2,
  UserPlus,
  Users,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
} from 'lucide-react';
import {
  parseCSV,
  generateCSVTemplate,
  generateLargeCSVSample,
  generate10kCSVSample,
  generate50kCSVSample,
} from '@/lib/csv-parser';
import type { ParsedMember } from '@/lib/csv-parser';

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

const MEMBERS_PER_PAGE = 50;

interface BulkMemberManagementProps {
  orgId: string;
  currentUserId: string;
  currentUserOrgRole: OrgRole | null;
  isPlatformAdmin: boolean;
  onRefresh: () => Promise<void>;
}

interface BulkJob {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  createdAt: string;
  createdBy?: { name: string | null; email: string };
  errorDetails?: { email: string; error: string }[];
}

export default function BulkMemberManagement({
  orgId,
  currentUserId,
  currentUserOrgRole,
  isPlatformAdmin,
  onRefresh,
}: BulkMemberManagementProps) {
  // CSV upload state
  const [csvMembers, setCsvMembers] = useState<ParsedMember[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job tracking state
  const [activeJob, setActiveJob] = useState<BulkJob | null>(null);
  const [, setRecentJobs] = useState<BulkJob[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Paginated members state
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bulk selection state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set()
  );
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [excludedFromSelectAll, setExcludedFromSelectAll] = useState<
    Set<string>
  >(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'changeRole' | null>(
    null
  );
  const [bulkRole, setBulkRole] = useState<OrgRole>('MEMBER');
  const [isProcessing, setIsProcessing] = useState(false);

  const canAssignOwner = currentUserOrgRole === 'OWNER' || isPlatformAdmin;

  // ---------- Paginated member fetching ----------

  const fetchMembers = useCallback(
    async (page: number, search: string, role: string) => {
      setIsLoadingMembers(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(MEMBERS_PER_PAGE),
        });
        if (search) params.set('search', search);
        if (role && role !== 'ALL') params.set('role', role);

        const res = await fetch(
          `/api/organizations/${orgId}/members?${params}`
        );
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
          setTotalMembers(data.total);
          setTotalPages(data.totalPages);
          setCurrentPage(data.page);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    },
    [orgId]
  );

  // Fetch members on mount and when page/search/role changes
  useEffect(() => {
    fetchMembers(currentPage, searchQuery, roleFilter);
  }, [currentPage, searchQuery, roleFilter, fetchMembers]);

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
      setSelectedMemberIds(new Set());
      setSelectAllFiltered(false);
      setExcludedFromSelectAll(new Set());
    }, 300);
  };

  const refreshMembers = useCallback(async () => {
    await fetchMembers(currentPage, searchQuery, roleFilter);
    await onRefresh();
  }, [currentPage, searchQuery, roleFilter, fetchMembers, onRefresh]);

  // ---------- Job polling ----------

  const fetchJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(
          `/api/organizations/${orgId}/members/bulk/${jobId}`
        );
        if (res.ok) {
          const job: BulkJob = await res.json();
          setActiveJob(job);

          if (job.status !== 'processing') {
            // Job finished — stop polling, refresh members
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            if (job.status === 'completed') {
              toast({
                title: 'Import Complete',
                description: `${job.successCount} added, ${job.skippedCount} skipped, ${job.errorCount} errors.`,
              });
              await refreshMembers();
            } else if (job.status === 'cancelled') {
              toast({
                title: 'Import Cancelled',
                description: `Processed ${job.processedItems} of ${job.totalItems} before cancellation.`,
              });
              await refreshMembers();
            } else if (job.status === 'failed') {
              toast({
                title: 'Import Failed',
                description: 'The bulk import encountered a fatal error.',
                variant: 'destructive',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling job:', error);
      }
    },
    [orgId, refreshMembers]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      // Poll immediately, then every 2 seconds
      fetchJobStatus(jobId);
      pollingRef.current = setInterval(() => fetchJobStatus(jobId), 2000);
    },
    [fetchJobStatus]
  );

  // On mount: check for active jobs
  useEffect(() => {
    const checkActiveJobs = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/members/bulk`);
        if (res.ok) {
          const jobs: BulkJob[] = await res.json();
          setRecentJobs(jobs);

          const processing = jobs.find((j) => j.status === 'processing');
          if (processing) {
            setActiveJob(processing);
            startPolling(processing.id);
          }
        }
      } catch (error) {
        console.error('Error checking jobs:', error);
      }
    };
    checkActiveJobs();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orgId, startPolling]);

  // ---------- CSV Upload ----------

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'text/plain',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith('.csv') &&
      !file.name.endsWith('.tsv') &&
      !file.name.endsWith('.txt')
    ) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV, TSV, or TXT file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 50MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseCSV(text);
      setCsvMembers(result.members);
      setCsvErrors(result.errors);
      setShowCSVPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    downloadCSV(generateCSVTemplate(), 'member-import-template.csv');
  };

  const handleDownloadLargeSample = () => {
    downloadCSV(generateLargeCSVSample(), 'member-import-sample-1000.csv');
  };

  const handleDownload10kSample = () => {
    downloadCSV(generate10kCSVSample(), 'member-import-sample-10000.csv');
  };

  const handleDownload50kSample = () => {
    downloadCSV(generate50kCSVSample(), 'member-import-sample-50000.csv');
  };

  const handleStartImport = async () => {
    if (csvMembers.length === 0) return;
    setIsUploading(true);

    try {
      const response = await fetch(`/api/organizations/${orgId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: csvMembers }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobId) {
          setShowCSVPreview(false);
          setCsvMembers([]);
          setCsvErrors([]);
          toast({
            title: 'Import Started',
            description: `Processing ${data.totalItems} members in the background…`,
          });
          setActiveJob({
            id: data.jobId,
            status: 'processing',
            totalItems: data.totalItems,
            processedItems: 0,
            successCount: 0,
            errorCount: data.errorCount,
            skippedCount: 0,
            createdAt: new Date().toISOString(),
          });
          startPolling(data.jobId);
        } else {
          toast({
            title: 'No valid entries',
            description: `${data.errorCount} validation error(s). No entries to import.`,
            variant: 'destructive',
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Import Failed',
          description: error.error || 'Failed to start import',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import start error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start bulk import',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/members/bulk/${activeJob.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setActiveJob((prev) =>
          prev ? { ...prev, status: 'cancelled' } : null
        );
        toast({
          title: 'Import Cancelled',
          description: 'The bulk import has been cancelled.',
        });
        await refreshMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to cancel',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const dismissJob = () => {
    setActiveJob(null);
  };

  // ---------- Bulk Selection ----------

  const toggleMember = (userId: string) => {
    if (selectAllFiltered) {
      // In selectAll mode, toggle exclusion instead of dropping out
      setExcludedFromSelectAll((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
      return;
    }
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectAllFiltered(false);
    setExcludedFromSelectAll(new Set());
    const pageSelectableIds = new Set(selectableMembers.map((m) => m.userId));
    const allPageSelected =
      selectableMembers.length > 0 &&
      selectableMembers.every((m) => selectedMemberIds.has(m.userId));
    if (allPageSelected) {
      // Deselect all on this page
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        pageSelectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on this page
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        pageSelectableIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const selectableMembers = members.filter((m) => {
    if (
      !isPlatformAdmin &&
      currentUserOrgRole === 'MANAGER' &&
      m.role === 'OWNER'
    )
      return false;
    return true;
  });

  const selectedCount = selectAllFiltered
    ? totalMembers - excludedFromSelectAll.size
    : selectedMemberIds.size;
  const selfSelected = selectAllFiltered
    ? !excludedFromSelectAll.has(currentUserId)
    : selectedMemberIds.has(currentUserId);

  const allOwnersSelected = selectAllFiltered
    ? roleFilter === 'ALL' || roleFilter === 'OWNER'
    : (() => {
        const ownerIds = members
          .filter((m) => m.role === 'OWNER')
          .map((m) => m.userId);
        return (
          ownerIds.length > 0 &&
          ownerIds.every((id) => selectedMemberIds.has(id))
        );
      })();

  const openBulkAction = (action: 'delete' | 'changeRole') => {
    if (action === 'delete' && selfSelected && !selectAllFiltered) {
      toast({
        title: 'Cannot remove yourself',
        description:
          'You are included in the selection. Deselect yourself to proceed.',
        variant: 'destructive',
      });
      return;
    }
    setBulkAction(action);
    setShowBulkConfirm(true);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCount === 0) return;
    setIsProcessing(true);

    try {
      const body: Record<string, unknown> = {
        action: bulkAction,
        ...(bulkAction === 'changeRole' ? { role: bulkRole } : {}),
      };

      if (selectAllFiltered) {
        body.selectAll = true;
        // For delete: always exclude self. For changeRole: only exclude manually excluded.
        const excludeSet = new Set(excludedFromSelectAll);
        if (bulkAction === 'delete') excludeSet.add(currentUserId);
        body.excludeIds = Array.from(excludeSet);
        if (searchQuery) body.search = searchQuery;
        if (roleFilter && roleFilter !== 'ALL') body.roleFilter = roleFilter;
      } else {
        // For page-level delete: strip self from IDs
        let ids = Array.from(selectedMemberIds);
        if (bulkAction === 'delete')
          ids = ids.filter((id) => id !== currentUserId);
        body.memberIds = ids;
      }

      const response = await fetch(`/api/organizations/${orgId}/members/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: bulkAction === 'delete' ? 'Members Removed' : 'Roles Updated',
          description: `${data.affected} member(s) ${bulkAction === 'delete' ? 'removed' : 'updated'}.`,
        });
        setSelectedMemberIds(new Set());
        setSelectAllFiltered(false);
        setExcludedFromSelectAll(new Set());
        setShowBulkConfirm(false);
        await refreshMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to perform bulk action',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- Progress calculations ----------

  const progressPercent = activeJob
    ? activeJob.totalItems > 0
      ? Math.round((activeJob.processedItems / activeJob.totalItems) * 100)
      : 0
    : 0;

  return (
    <div className='space-y-4'>
      {/* Active Job Progress */}
      {activeJob && (
        <Card
          className={
            activeJob.status === 'completed'
              ? 'border-green-300 dark:border-green-700'
              : activeJob.status === 'cancelled' ||
                  activeJob.status === 'failed'
                ? 'border-red-300 dark:border-red-700'
                : 'border-blue-300 dark:border-blue-700'
          }
        >
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center gap-2 text-lg'>
                {activeJob.status === 'processing' && (
                  <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                )}
                {activeJob.status === 'completed' && (
                  <CheckCircle2 className='h-4 w-4 text-green-500' />
                )}
                {(activeJob.status === 'cancelled' ||
                  activeJob.status === 'failed') && (
                  <XCircle className='h-4 w-4 text-red-500' />
                )}
                Bulk Import
                {activeJob.status === 'processing' && ' — In Progress'}
                {activeJob.status === 'completed' && ' — Complete'}
                {activeJob.status === 'cancelled' && ' — Cancelled'}
                {activeJob.status === 'failed' && ' — Failed'}
              </CardTitle>
              <div className='flex items-center gap-2'>
                {activeJob.status === 'processing' && (
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={handleCancelJob}
                  >
                    <X className='mr-1 h-3 w-3' />
                    Cancel
                  </Button>
                )}
                {activeJob.status !== 'processing' && (
                  <Button variant='ghost' size='sm' onClick={dismissJob}>
                    <X className='h-3 w-3' />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            <div className='mb-3'>
              <div className='mb-1 flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {activeJob.processedItems.toLocaleString()} of{' '}
                  {activeJob.totalItems.toLocaleString()} processed
                </span>
                <span className='font-medium'>{progressPercent}%</span>
              </div>
              <div className='h-3 w-full overflow-hidden rounded-full bg-muted'>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeJob.status === 'completed'
                      ? 'bg-green-500'
                      : activeJob.status === 'cancelled' ||
                          activeJob.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className='flex flex-wrap gap-4 text-sm'>
              <span className='text-green-600'>
                ✓ {activeJob.successCount.toLocaleString()} added
              </span>
              <span className='text-yellow-600'>
                ↷ {activeJob.skippedCount.toLocaleString()} skipped
              </span>
              <span className='text-red-600'>
                ✗ {activeJob.errorCount.toLocaleString()} errors
              </span>
            </div>

            {/* Error details */}
            {activeJob.errorDetails &&
              activeJob.errorDetails.length > 0 &&
              activeJob.status !== 'processing' && (
                <details className='mt-3'>
                  <summary className='cursor-pointer text-sm text-muted-foreground hover:text-foreground'>
                    View error details ({activeJob.errorDetails.length})
                  </summary>
                  <div className='mt-2 max-h-40 overflow-y-auto rounded-md border p-2'>
                    <ul className='space-y-1 text-xs'>
                      {activeJob.errorDetails.slice(0, 100).map((err, i) => (
                        <li key={i} className='text-red-600'>
                          {err.email}: {err.error}
                        </li>
                      ))}
                      {activeJob.errorDetails.length > 100 && (
                        <li className='text-muted-foreground'>
                          …and {activeJob.errorDetails.length - 100} more
                        </li>
                      )}
                    </ul>
                  </div>
                </details>
              )}
          </CardContent>
        </Card>
      )}

      {/* CSV Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Users className='h-4 w-4' />
            Bulk Import Members
          </CardTitle>
          <CardDescription>
            Upload a CSV file to add multiple members at once. Users who
            haven&apos;t signed up yet will be pre-registered and can sign in
            with Google later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-3'>
            <Button
              variant='secondary'
              onClick={() => fileInputRef.current?.click()}
              disabled={activeJob?.status === 'processing'}
            >
              <Upload className='mr-2 h-4 w-4' />
              Upload CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                  <Download className='mr-2 h-4 w-4' />
                  Download Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  Sample (5 rows)
                </DropdownMenuItem>
                {isPlatformAdmin && (
                  <>
                    <DropdownMenuItem onClick={handleDownloadLargeSample}>
                      Sample (1K rows)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload10kSample}>
                      Sample (10K rows)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload50kSample}>
                      Sample (50K rows)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,.tsv,.txt'
              onChange={handleFileSelect}
              className='hidden'
            />
          </div>

          <p className='mt-3 text-sm text-muted-foreground'>
            CSV format:{' '}
            <code className='rounded bg-muted px-1'>email,name,role</code> —
            name and role are optional (defaults to MEMBER).
          </p>
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showCSVPreview} onOpenChange={setShowCSVPreview}>
        <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing.{' '}
              {csvMembers.length.toLocaleString()} member(s) found.
            </DialogDescription>
          </DialogHeader>

          {csvErrors.length > 0 && (
            <div className='rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950'>
              <div className='flex items-center gap-2 font-medium text-yellow-800 dark:text-yellow-200'>
                <AlertTriangle className='h-4 w-4' />
                Warnings ({csvErrors.length})
              </div>
              <ul className='mt-1 max-h-32 list-inside list-disc overflow-y-auto text-sm text-yellow-700 dark:text-yellow-300'>
                {csvErrors.slice(0, 50).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {csvErrors.length > 50 && (
                  <li>…and {csvErrors.length - 50} more warnings</li>
                )}
              </ul>
            </div>
          )}

          {csvMembers.length > 0 && (
            <div className='overflow-x-auto rounded-md border'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b bg-muted/50'>
                    <th className='px-3 py-2 text-left font-medium'>Email</th>
                    <th className='px-3 py-2 text-left font-medium'>Name</th>
                    <th className='px-3 py-2 text-left font-medium'>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {csvMembers.slice(0, 50).map((member, i) => (
                    <tr key={i} className='border-b'>
                      <td className='px-3 py-2'>{member.email}</td>
                      <td className='px-3 py-2 text-muted-foreground'>
                        {member.name || '—'}
                      </td>
                      <td className='px-3 py-2'>
                        <span className='rounded bg-muted px-2 py-0.5 text-xs font-medium'>
                          {(member.role || 'MEMBER').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvMembers.length > 50 && (
                <p className='p-2 text-center text-sm text-muted-foreground'>
                  Showing first 50 of {csvMembers.length.toLocaleString()}{' '}
                  entries
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowCSVPreview(false);
                setCsvMembers([]);
                setCsvErrors([]);
              }}
            >
              Cancel
            </Button>
            {csvMembers.length > 0 && (
              <Button
                variant='secondary'
                onClick={handleStartImport}
                disabled={isUploading}
              >
                <UserPlus className='mr-2 h-4 w-4' />
                {isUploading
                  ? 'Starting…'
                  : `Import ${csvMembers.length.toLocaleString()} Member(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Selection on Existing Members */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className='text-lg'>Organization Members</CardTitle>
            <CardDescription>
              {totalMembers.toLocaleString()} member(s). Select members to
              perform bulk actions.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Role Filter */}
          <div className='mb-3 flex flex-col gap-2 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by name or email…'
                className='pl-9'
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setCurrentPage(1);
                setSelectedMemberIds(new Set());
                setSelectAllFiltered(false);
                setExcludedFromSelectAll(new Set());
              }}
            >
              <SelectTrigger className='w-full sm:w-36'>
                <SelectValue placeholder='Filter role' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>All Roles</SelectItem>
                <SelectItem value='OWNER'>Owner</SelectItem>
                <SelectItem value='MANAGER'>Manager</SelectItem>
                <SelectItem value='MEMBER'>Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Action Bar */}
          {selectedCount > 0 && (
            <div className='mb-3 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2'>
              <span className='text-sm font-medium text-muted-foreground'>
                {selectedCount.toLocaleString()} selected
              </span>
              <div className='ml-auto flex items-center gap-2'>
                <Button
                  variant='secondary'
                  size='sm'
                  className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700'
                  onClick={() => openBulkAction('changeRole')}
                >
                  <Shield className='mr-1 h-3 w-3' />
                  Change Role
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => openBulkAction('delete')}
                >
                  <Trash2 className='mr-1 h-3 w-3' />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {selectableMembers.length > 0 && (
            <div className='mb-3 flex items-center gap-2 border-b pb-3'>
              <Checkbox
                checked={
                  selectableMembers.length > 0 &&
                  (selectAllFiltered
                    ? selectableMembers.every(
                        (m) => !excludedFromSelectAll.has(m.userId)
                      )
                    : selectableMembers.every((m) =>
                        selectedMemberIds.has(m.userId)
                      ))
                }
                onCheckedChange={toggleSelectAll}
                aria-label='Select all on this page'
              />
              <span className='text-sm text-muted-foreground'>
                Select all on this page
              </span>
            </div>
          )}

          {/* Select all filtered banner */}
          {selectableMembers.length > 0 &&
            !selectAllFiltered &&
            selectableMembers.every((m) => selectedMemberIds.has(m.userId)) &&
            totalMembers > MEMBERS_PER_PAGE && (
              <div className='mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm dark:border-blue-800 dark:bg-blue-950'>
                All {selectableMembers.length} members on this page are
                selected.{' '}
                <button
                  className='font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                  onClick={() => {
                    setSelectAllFiltered(true);
                    setExcludedFromSelectAll(new Set());
                  }}
                >
                  Select all {totalMembers.toLocaleString()} filtered results
                </button>
              </div>
            )}

          {selectAllFiltered && (
            <div className='mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm dark:border-blue-800 dark:bg-blue-950'>
              {excludedFromSelectAll.size > 0
                ? `${(totalMembers - excludedFromSelectAll.size).toLocaleString()} of ${totalMembers.toLocaleString()} filtered members selected (${excludedFromSelectAll.size} manually excluded). `
                : `All ${totalMembers.toLocaleString()} filtered members selected. `}
              <button
                className='font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                onClick={() => {
                  setSelectAllFiltered(false);
                  setExcludedFromSelectAll(new Set());
                  setSelectedMemberIds(new Set());
                }}
              >
                Clear selection
              </button>
            </div>
          )}

          {isLoadingMembers && members.length === 0 && (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          )}

          <div className='space-y-2'>
            {members.map((member) => {
              const isSelectable = selectableMembers.some(
                (m) => m.userId === member.userId
              );
              const isSelected = selectAllFiltered
                ? isSelectable && !excludedFromSelectAll.has(member.userId)
                : selectedMemberIds.has(member.userId);
              const isSelf = member.userId === currentUserId;

              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
                      : ''
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    {isSelectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(member.userId)}
                        aria-label={`Select ${member.user.name || member.user.email}`}
                      />
                    ) : (
                      <div className='h-4 w-4' />
                    )}
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
                        {isSelf && (
                          <span className='ml-2 text-xs text-muted-foreground'>
                            (you)
                          </span>
                        )}
                      </p>
                      <a
                        href={`mailto:${member.user.email}`}
                        className='flex items-center gap-1 text-sm text-muted-foreground hover:underline'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className='h-3 w-3' />
                        {member.user.email}
                      </a>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      member.role === 'OWNER'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        : member.role === 'MANAGER'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className='mt-4 flex items-center justify-between border-t pt-3'>
              <span className='text-sm text-muted-foreground'>
                Page {currentPage} of {totalPages.toLocaleString()}
              </span>
              <div className='flex items-center gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'secondary' : 'outline'}
                      size='sm'
                      className='w-9'
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'delete'
                ? `Remove ${selectedCount} Member(s)?`
                : `Change Role for ${selectedCount} Member(s)?`}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'delete'
                ? 'This will remove the selected members from the organization. This action cannot be undone.'
                : 'Select the new role to apply to all selected members.'}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === 'changeRole' && (
            <div className='py-2'>
              <Select
                value={bulkRole}
                onValueChange={(value) => setBulkRole(value as OrgRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='MEMBER'>Member</SelectItem>
                  <SelectItem value='MANAGER'>Manager</SelectItem>
                  {canAssignOwner && (
                    <SelectItem value='OWNER'>Owner</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {allOwnersSelected && bulkRole !== 'OWNER' && (
                <p className='mt-2 text-sm text-red-500'>
                  <AlertTriangle className='mr-1 inline h-3 w-3' />
                  All owners are selected. This would leave the org with no
                  owner.
                </p>
              )}
            </div>
          )}

          <div className='max-h-40 overflow-y-auto rounded-md border p-2'>
            <ul className='space-y-1 text-sm'>
              {members
                .filter(
                  (m) =>
                    selectedMemberIds.has(m.userId) &&
                    !(bulkAction === 'delete' && m.userId === currentUserId)
                )
                .map((m) => (
                  <li key={m.id} className='flex items-center justify-between'>
                    <span>{m.user.name || m.user.email}</span>
                    <span className='text-muted-foreground'>{m.role}</span>
                  </li>
                ))}
            </ul>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowBulkConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'delete' ? 'destructive' : 'secondary'}
              onClick={handleBulkAction}
              disabled={
                isProcessing ||
                (bulkAction === 'changeRole' &&
                  allOwnersSelected &&
                  bulkRole !== 'OWNER')
              }
            >
              {isProcessing
                ? 'Processing…'
                : bulkAction === 'delete'
                  ? `Remove ${selectedCount} Member(s)`
                  : `Update ${selectedCount} Member(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
