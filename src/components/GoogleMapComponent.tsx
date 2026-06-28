'use client';

import { GoogleMap, GoogleMapProps } from '@react-google-maps/api';
import { useGoogleMaps } from './providers/GoogleMapsProvider';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';
import { MutableRefObject } from 'react';

interface ExtendedGoogleMapProps extends Omit<
  GoogleMapProps,
  'onBoundsChanged'
> {
  onBoundsChanged?: (_bounds: google.maps.LatLngBounds) => void;
  mapRef?: MutableRefObject<google.maps.Map | null>;
}

const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultZoom = 10;

export default function GoogleMapComponent({
  center = DEFAULT_MAP_CENTER,
  mapContainerStyle = defaultMapContainerStyle,
  zoom = defaultZoom,
  onBoundsChanged,
  mapRef,
  ...restProps
}: ExtendedGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  const onLoad = (map: google.maps.Map) => {
    if (mapRef) {
      mapRef.current = map;
    }
  };

  if (loadError) return <div>Error loading maps</div>;

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={zoom}
      center={center}
      onLoad={onLoad}
      options={{
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT,
        },
        streetViewControl: false,
        fullscreenControl: false,
      }}
      onBoundsChanged={() => {
        if (onBoundsChanged && mapRef && mapRef.current) {
          const bounds = mapRef.current.getBounds();
          if (bounds) {
            onBoundsChanged(bounds);
          }
        }
      }}
      {...restProps}
    >
      {/* Allow child components like Markers to be passed in */}
      {restProps.children}
    </GoogleMap>
  ) : (
    <div>Loading Maps...</div>
  );
}
