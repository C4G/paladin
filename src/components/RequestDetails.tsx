'use client';

import { useEffect, useState } from 'react';

// Updated interface to match the Prisma schema
interface Farm {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  totalAcreage?: string | null;
  yearEstablished?: string | null;
  otherInfo?: string | null;
}

interface Gate {
  id: string;
  name: string;
}

interface Request {
  id: string;
  farmId: string;
  userId: string;
  disasterType: string;
  createdAt: Date;
  closedOn?: Date | null;
  preferredGateId?: string | null;
  comments?: string | null;
  preferredGate?: Gate | null;
  farm?: Farm; // This might be undefined if not included in the query
}

export default function RequestDetails({ request }: { request: Request }) {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch farm data
    const fetchFarmData = async () => {
      try {
        setLoading(true);

        // If farm is already included in the request, use it
        if (request.farm) {
          setFarm(request.farm);
          setLoading(false);
          return;
        }

        // Otherwise, fetch the farm data using the farmId
        const response = await fetch(`/api/farms?farmId=${request.farmId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch farm: ${response.status}`);
        }

        const farms = await response.json();

        if (farms && farms.length > 0) {
          setFarm(farms[0]);
        } else {
          setError('Farm not found');
        }
      } catch (err) {
        console.error('Error fetching farm data:', err);
        setError('Failed to load farm data');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmData();
  }, [request]);

  if (loading) {
    return (
      <div className='mb-4 rounded-lg bg-white p-4 shadow'>
        <h2 className='mb-4 text-xl font-bold text-black'>Request Details</h2>
        <p>Loading farm data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mb-4 rounded-lg bg-white p-4 shadow'>
        <h2 className='mb-4 text-xl font-bold text-black'>Request Details</h2>
        <p className='text-red-500'>{error}</p>
        <p>Disaster Type: {request.disasterType}</p>
        <p>Created At: {new Date(request.createdAt).toLocaleString()}</p>
      </div>
    );
  }

  // Format address from farm fields
  const formatAddress = () => {
    if (!farm) return 'No address provided';

    const addressParts = [];

    if (farm.streetAddress) addressParts.push(farm.streetAddress);
    if (farm.city) addressParts.push(farm.city);
    if (farm.state) addressParts.push(farm.state);
    if (farm.zipcode) addressParts.push(farm.zipcode);

    return addressParts.length > 0
      ? addressParts.join(', ')
      : 'No address provided';
  };

  const formattedAddress = formatAddress();

  return (
    <div className='mb-4 rounded-lg bg-white p-4 shadow'>
      <h2 className='mb-4 text-xl font-bold text-black'>Request Details</h2>
      <div className='space-y-2 text-black'>
        {farm && (
          <p>
            <span className='font-semibold'>Farm:</span> {farm.name}
          </p>
        )}
        <p>
          <span className='font-semibold'>Disaster Type:</span>{' '}
          {request.disasterType}
        </p>

        <p>
          <span className='font-semibold'>Address:</span> {formattedAddress}
        </p>

        {request.preferredGate && (
          <p>
            <span className='font-semibold'>Preferred Gate:</span>{' '}
            {request.preferredGate.name}
          </p>
        )}
        {request.comments && (
          <p>
            <span className='font-semibold'>Comments:</span> {request.comments}
          </p>
        )}
        <p>
          <span className='font-semibold'>Created At:</span>{' '}
          {new Date(request.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
