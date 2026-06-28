import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Farm as PrismaFarm } from '@prisma/client';

export const EARTH_RADIUS_MILES = 3958.8;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Debounce utility function
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to wait before calling the function
 * @returns A debounced version of the function
 */
export const debounce = <T extends (..._args: any[]) => unknown>(
  func: T,
  wait: number
): ((..._args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (..._args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(..._args), wait);
  };
};

interface Location {
  lat: number;
  lng: number;
}

interface ETAResponse {
  days: string;
  hours: string;
  minutes: string;
}

/**
 * Calculates estimated time of arrival using Google Maps Distance Matrix Service
 * @param origin - Starting location coordinates
 * @param destination - Destination location coordinates
 * @param google - Google Maps API instance
 * @returns Promise with ETA in hours and minutes
 */
export async function calculateETA(
  origin: Location,
  destination: Location,
  google: typeof window.google
): Promise<ETAResponse> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();
    const originLatLng = new google.maps.LatLng(origin.lat, origin.lng);
    const destinationLatLng = new google.maps.LatLng(
      destination.lat,
      destination.lng
    );

    service.getDistanceMatrix(
      {
        origins: [originLatLng],
        destinations: [destinationLatLng],
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (response, status) => {
        if (status === 'OK' && response?.rows[0]?.elements[0]?.duration) {
          const durationInMinutes = Math.ceil(
            response.rows[0].elements[0].duration.value / 60
          );
          const totalHours = Math.floor(durationInMinutes / 60);
          const days = Math.floor(totalHours / 24);
          const hours = totalHours % 24;
          const minutes = durationInMinutes % 60;

          resolve({
            days: days.toString(),
            hours: hours.toString(),
            minutes: minutes.toString(),
          });
        } else {
          reject(new Error('Unable to calculate ETA'));
        }
      }
    );
  });
}
export function filterFarmsByDistance(
  farms: PrismaFarm[],
  latitude: number | undefined,
  longitude: number | undefined,
  searchDistance: number | undefined
) {
  // const latitude = searchParams.get('latitude')
  //   ? parseFloat(searchParams.get('latitude')!)
  //   : undefined;
  // const longitude = searchParams.get('longitude')
  //   ? parseFloat(searchParams.get('longitude')!)
  //   : undefined;
  // const searchDistance = parseFloat(searchParams.get('distance') || '100');

  if (!searchDistance) {
    searchDistance = 100;
  }
  // if a latitude and longitude are provided, filter the requests by distance from the given latitude and longitude
  if (latitude && longitude) {
    farms = farms.filter((farm) => {
      const distance =
        EARTH_RADIUS_MILES *
        Math.acos(
          Math.cos(convertToRadians(latitude)) *
            Math.cos(convertToRadians(farm.latitude)) *
            Math.cos(convertToRadians(farm.longitude - longitude)) +
            Math.sin(convertToRadians(latitude)) *
              Math.sin(convertToRadians(farm.latitude))
        );
      return distance <= searchDistance;
    });
  }

  return farms;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
