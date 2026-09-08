import { useState, useEffect, useRef } from 'react';

interface MapProps {
  driverLocation: { lat: number; lng: number } | null;
  clientLocation: { lat: number; lng: number };
  driverName: string;
  status: string;
  distance: string;
  estimatedTime: string | null;
}

declare global {
  interface Window {
    google: any;
  }
}

export const DeliveryMap = ({
  driverLocation,
  clientLocation,
  driverName,
  status,
  distance,
  estimatedTime
}: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const driverMarker = useRef<any>(null);
  const clientMarker = useRef<any>(null);
  const polyline = useRef<any>(null);

  useEffect(() => {
    // Charger Google Maps API
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    // Centrer la carte sur la position du client
    const center = {
      lat: clientLocation.lat,
      lng: clientLocation.lng
    };

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center,
      mapTypeControl: false,
      fullscreenControl: false,
      styles: [
        {
          elementType: 'geometry',
          stylers: [{ color: '#242f3e' }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#242f3e' }]
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#746855' }]
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.fill',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry.fill',
          stylers: [{ color: '#17263c' }]
        }
      ]
    });

    // Marqueur client (destination)
    clientMarker.current = new window.google.maps.Marker({
      position: clientLocation,
      map: mapInstance.current,
      title: 'Votre adresse',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    });

    // Ajouter info window client
    new window.google.maps.InfoWindow({
      content: `<div style="color: #000; font-weight: bold;">📍 Votre adresse</div>`,
      position: clientLocation
    }).open(mapInstance.current, clientMarker.current);

    // Mettre à jour la position du livreur si disponible
    if (driverLocation) {
      updateDriverMarker(driverLocation);
    }
  };

  const updateDriverMarker = (location: { lat: number; lng: number }) => {
    if (!mapInstance.current || !window.google) return;

    // Supprimer ancien marqueur
    if (driverMarker.current) {
      driverMarker.current.setMap(null);
    }
    if (polyline.current) {
      polyline.current.setMap(null);
    }

    // Créer nouveau marqueur livreur
    driverMarker.current = new window.google.maps.Marker({
      position: location,
      map: mapInstance.current,
      title: driverName,
      icon: {
        path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5S9.51 16.5 12 16.5s4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5z',
        scale: 2,
        fillColor: '#fbbf24',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    });

    // Ajouter info window livreur
    new window.google.maps.InfoWindow({
      content: `<div style="color: #000;">🚗 ${driverName}<br/><small>${status}</small></div>`,
      position: location
    }).open(mapInstance.current, driverMarker.current);

    // Tracer ligne entre livreur et client
    polyline.current = new window.google.maps.Polyline({
      path: [location, clientLocation],
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.7,
      strokeWeight: 3,
      map: mapInstance.current,
      icons: [
        {
          icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: '100%'
        }
      ]
    });

    // Ajuster zoom pour voir les deux points
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(location);
    bounds.extend(clientLocation);
    mapInstance.current.fitBounds(bounds);
  };

  useEffect(() => {
    if (driverLocation && mapInstance.current) {
      updateDriverMarker(driverLocation);
    }
  }, [driverLocation]);

  return (
    <div className="space-y-4">
      {/* Carte */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border border-gray-700 overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* Info statut */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Distance</p>
            <p className="text-white font-bold text-lg">{distance}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Statut</p>
            <p className="text-yellow-400 font-semibold">{status}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Arrivée estimée</p>
            <p className="text-white font-bold">
              {estimatedTime ? new Date(estimatedTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
