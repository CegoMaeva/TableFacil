import React, { createContext, useContext, useEffect, useState } from 'react';

interface TrackingConfig {
  // Google Maps
  googleMapsApiKey: string;
  
  // Polling intervals (in milliseconds)
  clientPollingInterval: number;  // How often client updates tracking
  driverGpsInterval: number;      // How often driver sends GPS
  
  // Thresholds
  minEtaThreshold: number;        // Min ETA in seconds
  maxDistance: number;             // Max distance in km
  
  // Features
  enableWebSocket: boolean;
  enableGps: boolean;
  enableRealTimeTracking: boolean;
  
  // Backend URLs
  apiBaseUrl: string;
  
  // Markers
  driverMarkerIcon: string;
  clientMarkerIcon: string;
}

const defaultConfig: TrackingConfig = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  clientPollingInterval: 5000,      // 5 seconds
  driverGpsInterval: 10000,         // 10 seconds
  minEtaThreshold: 60,              // 1 minute
  maxDistance: 100,                 // 100 km
  enableWebSocket: true,
  enableGps: true,
  enableRealTimeTracking: true,
  apiBaseUrl: 'http://127.0.0.1:5000',
  driverMarkerIcon: '🟡',
  clientMarkerIcon: '🔴',
};

const TrackingConfigContext = createContext<{
  config: TrackingConfig;
  setConfig: (config: Partial<TrackingConfig>) => void;
}>({
  config: defaultConfig,
  setConfig: () => {},
});

export const useTrackingConfig = () => {
  const context = useContext(TrackingConfigContext);
  if (!context) {
    throw new Error('useTrackingConfig must be used within TrackingConfigProvider');
  }
  return context;
};

export const TrackingConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<TrackingConfig>(defaultConfig);

  useEffect(() => {
    // Load config from environment variables
    const newConfig = {
      ...defaultConfig,
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || defaultConfig.googleMapsApiKey,
      clientPollingInterval: parseInt(import.meta.env.VITE_CLIENT_POLLING_INTERVAL || '5000'),
      driverGpsInterval: parseInt(import.meta.env.VITE_DRIVER_GPS_INTERVAL || '10000'),
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || defaultConfig.apiBaseUrl,
    };
    setConfig(newConfig);
  }, []);

  const updateConfig = (updates: Partial<TrackingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <TrackingConfigContext.Provider value={{ config, setConfig: updateConfig }}>
      {children}
    </TrackingConfigContext.Provider>
  );
};
