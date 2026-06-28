'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import type { DisasterResource } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import DisasterResourceList from '@/components/DisasterResourceList';
import AddEditResourceModal from '@/components/AddEditResourceModal';

export default function DisasterResourcesPage() {
  const { data: session, status } = useSession();
  const [resources, setResources] = useState<DisasterResource[]>([]);
  const [error, setError] = useState('');
  const [resourceToEdit, setResourceToEdit] = useState<DisasterResource | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAdmin = session?.user?.role === 'ADMIN';

  const fetchResources = useCallback(async () => {
    try {
      const response = await fetch('/api/disaster-resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      } else {
        const errorText = await response.text();
        console.error('Error fetching resources:', errorText);
        setError(
          `Failed to fetch resources. Status: ${response.status}. ${errorText}`
        );
      }
    } catch (error) {
      console.error('Error in fetchResources:', error);
      setError(`An error occurred: ${error}`);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      const response = await fetch(`/api/disaster-resources/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchResources();
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error occurred' }));
        console.error('Error deleting resource:', errorData);
        setError(
          `Failed to delete resource: ${errorData.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      setError(`An error occurred: ${error}`);
    }
  };

  const handleEdit = (resource: DisasterResource) => {
    if (!isAdmin) return;
    setResourceToEdit(resource);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (!isAdmin) return;
    setResourceToEdit(null);
    setIsModalOpen(true);
  };

  const handleResourceSaved = () => {
    fetchResources();
    setResourceToEdit(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const loadResources = () => {
      fetchResources();
    };

    loadResources();
  }, [fetchResources]);

  if (status === 'loading') {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-32 w-[500px]' />
          <Skeleton className='h-32 w-[500px]' />
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='mb-6 text-3xl font-bold'>Disaster Resources</h1>

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='grid gap-8 lg:grid-cols-2'>
        {/* Left Column - Introduction - Now Sticky */}
        <div className='lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start'>
          <div className='space-y-4'>
            {isAdmin && (
              <Alert className='border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'>
                <AlertDescription>
                  As an administrator, you have the ability to add new resources
                  using the &apos;Add Resource&apos; button below.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>About This Resource</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p>
                  Welcome to the Disaster Resources page. This platform is
                  designed to provide a centralized location for accessing and
                  sharing valuable resources during times of crisis or disaster.
                </p>
                <p>
                  Here, you&apos;ll find a curated list of links to essential
                  services, information, and support systems that can be crucial
                  during emergencies. These resources cover a wide range of
                  needs, from immediate assistance to long-term recovery
                  support.
                </p>
                <p>
                  <strong>Access Information:</strong> While anyone can view and
                  use these resources, only administrators have the ability to
                  add new resources or edit existing ones. This ensures that the
                  information provided remains accurate and reliable.
                </p>
                <p>
                  If you have any suggestions for additional resources or notice
                  any outdated information, please contact the site
                  administrators.
                </p>
              </CardContent>
            </Card>

            {/* Admin Actions - Only visible on mobile */}
            {isAdmin && (
              <div className='block lg:hidden'>
                <Button
                  onClick={handleAddNew}
                  className='w-full'
                  variant='default'
                >
                  + Add New Resource
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Resources List - Scrollable */}
        <div className='lg:max-h-full'>
          <DisasterResourceList
            resources={resources}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onAddNew={handleAddNew}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {isAdmin && (
        <AddEditResourceModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          onResourceAdded={handleResourceSaved}
          resourceToEdit={resourceToEdit}
        />
      )}
    </div>
  );
}
