'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Response {
  id: string;
  equipment: string;
  estimatedArrivalTime: Date;
  respondedAt: Date;
  responder: {
    name: string;
  };
}

interface Request {
  responses: Response[];
}

export default function RespondersWidget() {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const requestId = params?.id;

  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/requests?requestId=${requestId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch request data');
        }

        const data = await response.json();
        if (data && data.length > 0) {
          setRequest(data[0]);
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        setError('Failed to load responders');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  if (loading) {
    return (
      <div className='mb-4 rounded-lg bg-white p-4 shadow'>
        <h2 className='mb-4 text-xl font-bold text-black'>Active Responders</h2>
        <div className='flex items-center justify-center py-4'>
          <div className='h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary'></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mb-4 rounded-lg bg-white p-4 shadow'>
        <h2 className='mb-4 text-xl font-bold text-black'>Active Responders</h2>
        <p className='text-sm text-red-500'>{error}</p>
      </div>
    );
  }

  const responses = request?.responses || [];

  return (
    <div className='mb-4 rounded-lg bg-white p-4 shadow'>
      <h2 className='mb-4 text-xl font-bold text-black'>Active Responders</h2>
      {responses.length > 0 ? (
        <div className='space-y-3'>
          {responses.map((response) => {
            // Calculate ETA in minutes from now
            const etaDate = new Date(response.estimatedArrivalTime);
            const now = new Date();
            const etaMinutes = Math.max(
              0,
              Math.round((etaDate.getTime() - now.getTime()) / (1000 * 60))
            );

            return (
              <div key={response.id} className='rounded-md border p-3'>
                <div className='flex items-center justify-between'>
                  <span className='font-semibold text-black'>
                    {response.responder.name}
                  </span>
                  <span className='rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800'>
                    En Route
                  </span>
                </div>
                <div className='mt-2 text-sm text-gray-600'>
                  <p>
                    ETA: {Math.floor(etaMinutes / 60)}h {etaMinutes % 60}m
                  </p>
                  <p className='mt-1'>Equipment: {response.equipment}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className='text-sm text-gray-500'>No responders yet</p>
      )}
    </div>
  );
}
