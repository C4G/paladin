'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoadScript } from '@react-google-maps/api';
import { calculateETA } from '@/lib/utils';
import { Request, Farm } from '@prisma/client';

type RequestWithFarm = Request & {
  farm: Farm;
};

interface ResponseForm {
  estimatedArrivalTime: {
    days: string;
    hours: string;
    minutes: string;
  };
  equipment: string;
}

export default function ResponseRequestPage() {
  const [request, setRequest] = useState<RequestWithFarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ResponseForm>({
    estimatedArrivalTime: {
      days: '',
      hours: '',
      minutes: '',
    },
    equipment: '',
  });
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const fetchRequestData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/requests?requestId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch request data');
      const data = await response.json();
      setRequest(data[0]);
    } catch (error) {
      console.error('Error fetching request data:', error);
      setError('Failed to load request data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      // Convert days, hours and minutes to a future datetime
      const now = new Date();
      const totalMinutes =
        parseInt(formData.estimatedArrivalTime.days || '0') * 24 * 60 +
        parseInt(formData.estimatedArrivalTime.hours || '0') * 60 +
        parseInt(formData.estimatedArrivalTime.minutes || '0');

      const estimatedArrivalTime = new Date(
        now.getTime() + totalMinutes * 60 * 1000
      );

      const apiResponse = await fetch(`/api/requests/${id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          estimatedArrivalTime: estimatedArrivalTime.toISOString(),
          equipment: formData.equipment,
        }),
      });

      const responseData = await apiResponse.json().catch(() => null);

      if (!apiResponse.ok) {
        if (responseData?.error) {
          throw new Error(responseData.error);
        } else {
          throw new Error('Failed to submit response. Please try again.');
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error submitting response:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to submit response. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow for submitting on cmd+enter (Mac) or ctrl+enter (Windows)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const calculateETAForRequest = useCallback(async () => {
    if (!request?.farm || !userLocation || !isLoaded) return;
    try {
      const eta = await calculateETA(
        userLocation,
        { lat: request.farm.latitude, lng: request.farm.longitude },
        window.google
      );
      setFormData((prev) => ({
        ...prev,
        estimatedArrivalTime: eta,
      }));
    } catch (error) {
      setError(
        `Unable to calculate ETA: ${error instanceof Error ? error.message : 'Unknown error'}. Please enter arrival time manually.`
      );
    }
  }, [request, userLocation, isLoaded]);

  useEffect(() => {
    if (id) {
      fetchRequestData();
    }
  }, [id, fetchRequestData]);

  useEffect(() => {
    // Get user's location when component mounts
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          // Calculate ETA once we have the user's location and Google Maps is loaded
          if (request && isLoaded) {
            calculateETAForRequest();
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError(
            'Unable to get your location. Please enter arrival time manually.'
          );
        }
      );
    }
  }, [isLoaded]);

  // Add new useEffect to calculate ETA when all required data is available
  useEffect(() => {
    if (request && userLocation && isLoaded) {
      calculateETAForRequest();
    }
  }, [request, userLocation, isLoaded, calculateETAForRequest]);

  if (loading) {
    return (
      <div className='flex h-[calc(100vh-8.4rem)] flex-col items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary'></div>
        <p className='mt-4'>Loading request data...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className='flex h-[calc(100vh-8.4rem)] flex-col items-center justify-center'>
        <h1 className='mb-4 text-xl font-semibold'>Request not found</h1>
        <Button onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <Card>
        <CardHeader>
          <CardTitle>Respond to Request</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert
              variant='destructive'
              className='mb-6 duration-500 animate-in fade-in slide-in-from-top-4'
            >
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className='mb-6'>
            <h2 className='text-lg font-semibold'>Request Details</h2>
            <p className='text-sm text-gray-600'>
              Type: {request.disasterType}
            </p>
            <p className='text-sm text-gray-600'>
              Location: {request.farm?.streetAddress}, {request.farm?.city},{' '}
              {request.farm?.state} {request.farm?.zipcode}
            </p>
            <p className='text-sm text-gray-600'>{request.comments}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className='space-y-4'
          >
            <div>
              <label className='mb-2 block text-sm font-medium'>
                Estimated Arrival Time
              </label>
              <div className='flex gap-2'>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    value={formData.estimatedArrivalTime.days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedArrivalTime: {
                          ...formData.estimatedArrivalTime,
                          days: e.target.value,
                        },
                      })
                    }
                    placeholder='0'
                    className='w-20'
                  />
                  <span className='text-xs text-gray-500'>Days</span>
                </div>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    max='23'
                    value={formData.estimatedArrivalTime.hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedArrivalTime: {
                          ...formData.estimatedArrivalTime,
                          hours: e.target.value,
                        },
                      })
                    }
                    placeholder='0'
                    className='w-20'
                  />
                  <span className='text-xs text-gray-500'>Hours</span>
                </div>
                <div className='flex flex-col'>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={formData.estimatedArrivalTime.minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedArrivalTime: {
                          ...formData.estimatedArrivalTime,
                          minutes: e.target.value,
                        },
                      })
                    }
                    placeholder='0'
                    className='w-20'
                  />
                  <span className='text-xs text-gray-500'>Minutes</span>
                </div>
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium'>
                Available Equipment
              </label>
              <Textarea
                value={formData.equipment}
                onChange={(e) =>
                  setFormData({ ...formData, equipment: e.target.value })
                }
                placeholder='List the equipment you can provide'
                required
              />
            </div>

            <div className='flex justify-end space-x-4'>
              <Button
                type='button'
                variant='outline'
                className='dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                onClick={() => router.push(`/dashboard?requestId=${id}`)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={submitting}
                className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
              >
                {submitting ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
