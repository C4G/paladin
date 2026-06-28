'use client';

import React, { createContext, FC, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { UseLoadScriptOptions } from '@react-google-maps/api/dist/useJsApiLoader';

interface GoogleMapsProviderProps extends UseLoadScriptOptions {
  children: ReactNode;
}

export type GoogleMapsState = {
  isLoaded: boolean;
  loadError?: Error;
};

const GoogleMapsContext = createContext<GoogleMapsState>({ isLoaded: false });

export const GoogleMapsProvider: FC<GoogleMapsProviderProps> = ({
  children,
  ...loadScriptOptions
}) => {
  const { isLoaded, loadError } = useJsApiLoader(loadScriptOptions);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => useContext(GoogleMapsContext);
