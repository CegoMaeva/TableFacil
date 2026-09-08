import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Location {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

interface TrackingData {
  orderId: string;
  status: string;
  currentLocation: Location;
  originLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  destinationLocation: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  driver: {
    id: string | null;
    name: string;
    phone: string | null;
    vehicle: string | null;
  };
  estimatedDeliveryTime: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  orderId: string;
  token: string;
  onClose?: () => void;
}

export const LiveTracking = ({ orderId, token, onClose }: Props) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState('');

  // Fonction pour générer l'URL Google Maps
  const generateMapUrl = (current: Location) => {
    if (!current.latitude || !current.longitude) return '';
    
    // Créer une URL avec le point actuel et la destination
    return `https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d3862.2366289313846!2d${current.longitude}!3d${current.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sroute!5e0!3m2!1sfr!2sfr!4v${Date.now()}`;
  };

  // Charger les données de suivi
  const loadTracking = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}/tracking`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du suivi');
      }

      const data = await response.json();
      setTracking(data);
      setError(null);

      // Générer l'URL Google Maps
      const url = generateMapUrl(data.currentLocation);
      setMapUrl(url);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du suivi');
      console.error('Erreur suivi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage et mettre à jour toutes les 10 secondes
  useEffect(() => {
    loadTracking();
    
    const interval = setInterval(() => {
      loadTracking();
    }, 10000); // Mise à jour toutes les 10 secondes

    return () => clearInterval(interval);
  }, [orderId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de la position...</p>
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-6">
        <p className="text-red-400">{error || 'Impossible de charger le suivi'}</p>
        <Button
          onClick={loadTracking}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white"
        >
          Réessayer
        </Button>
      </Card>
    );
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const distance = tracking.destinationLocation.latitude && tracking.destinationLocation.longitude
    ? calculateDistance(
        tracking.currentLocation.latitude,
        tracking.currentLocation.longitude,
        tracking.destinationLocation.latitude,
        tracking.destinationLocation.longitude
      )
    : 'N/A';

  const statusLabels: { [key: string]: string } = {
    'in-progress': '🚗 En cours',
    'out-for-delivery': '📍 Près de vous',
    'pending': '⏳ En attente',
    'confirmed': '✅ Confirmée'
  };

  return (
    <div className="space-y-4">
      {/* Carte */}
      <Card className="bg-gray-800 border-gray-700 p-0 overflow-hidden">
        <iframe
          width="100%"
          height="400"
          frameBorder="0"
          src={mapUrl}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </Card>

      {/* Informations du livreur */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {tracking.driver.name}
            </h3>
            <div className="space-y-2">
              {tracking.driver.vehicle && (
                <p className="text-gray-300 text-sm flex items-center gap-2">
                  🚗 {tracking.driver.vehicle}
                </p>
              )}
              {tracking.driver.phone && (
                <Button
                  onClick={() => window.location.href = `tel:${tracking.driver.phone}`}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 flex items-center gap-2 w-fit"
                >
                  📞 Appeler le livreur
                </Button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-red-400 text-2xl font-bold">{distance} km</p>
            <p className="text-gray-400 text-sm">Distance</p>
          </div>
        </div>
      </Card>

      {/* Statut et temps estimé */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Statut actuel</span>
            <span className="text-red-400 font-semibold">
              {statusLabels[tracking.status] || tracking.status}
            </span>
          </div>
          
          {tracking.estimatedDeliveryTime && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-300">
                🕐
                <span>Livraison estimée</span>
              </div>
              <span className="text-white font-semibold">
                {new Date(tracking.estimatedDeliveryTime).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-700">
            <p className="text-gray-400 text-xs">
              Mise à jour: {new Date(tracking.updatedAt).toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
      </Card>

      {/* Positions */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="text-green-400 flex-shrink-0 text-xl">📍</span>
            <div className="flex-1">
              <p className="text-gray-400 text-sm">Point de départ</p>
              <p className="text-white font-semibold">{tracking.originLocation.name}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-red-400 flex-shrink-0 text-xl">🧭</span>
            <div className="flex-1">
              <p className="text-gray-400 text-sm">Position actuelle</p>
              <p className="text-white font-semibold text-sm">
                {tracking.currentLocation.latitude.toFixed(4)}, {tracking.currentLocation.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-orange-400 flex-shrink-0 text-xl">📍</span>
            <div className="flex-1">
              <p className="text-gray-400 text-sm">Destination</p>
              <p className="text-white font-semibold">
                {tracking.destinationLocation.address || 'Adresse non spécifiée'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Bouton de fermeture */}
      {onClose && (
        <Button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100"
        >
          Fermer le suivi
        </Button>
      )}
    </div>
  );
};
