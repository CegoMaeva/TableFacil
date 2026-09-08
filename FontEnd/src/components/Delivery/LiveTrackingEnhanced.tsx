import { useState, useEffect } from 'react';
import { DeliveryMap } from './DeliveryMap';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Props {
  orderId: string;
  token: string;
  onClose?: () => void;
}

export const LiveTrackingEnhanced = ({ orderId, token, onClose }: Props) => {
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Charger les données de suivi initiales
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
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du suivi');
      console.error('Erreur suivi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialiser WebSocket pour mises à jour temps réel
  const connectWebSocket = () => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//127.0.0.1:5000/api/orders/${orderId}/tracking/ws`;
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connecté pour suivi');
        websocket.send(JSON.stringify({ type: 'subscribe', orderId }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'location-update') {
            setTracking((prev: any) => ({
              ...prev,
              currentLocation: data.location,
              updatedAt: new Date().toISOString()
            }));

            // Notification sonore si status change
            if (data.status) {
              playNotificationSound();
            }
          }
        } catch (e) {
          console.error('Erreur parsing WebSocket:', e);
        }
      };

      websocket.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        // Fallback à polling si WebSocket échoue
        setupPolling();
      };

      websocket.onclose = () => {
        console.log('WebSocket fermé');
        // Reconnecter après 5 secondes
        setTimeout(connectWebSocket, 5000);
      };

      setWs(websocket);
    } catch (error) {
      console.error('Erreur connexion WebSocket:', error);
      setupPolling();
    }
  };

  // Fallback: polling toutes les 5 secondes
  const setupPolling = () => {
    const interval = setInterval(() => {
      loadTracking();
    }, 5000);

    return () => clearInterval(interval);
  };

  // Notification sonore
  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
    audio.play().catch(() => {});
  };

  // Calculer distance Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  useEffect(() => {
    loadTracking();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
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

  const distance = tracking.destinationLocation?.latitude && tracking.destinationLocation?.longitude
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
    'confirmed': '✅ Confirmée',
    'delivered': '✔️ Livrée'
  };

  return (
    <div className="space-y-4">
      {/* Carte interactive */}
      {tracking.currentLocation && (
        <DeliveryMap
          driverLocation={{
            lat: tracking.currentLocation.latitude,
            lng: tracking.currentLocation.longitude
          }}
          clientLocation={{
            lat: tracking.destinationLocation?.latitude || 0,
            lng: tracking.destinationLocation?.longitude || 0
          }}
          driverName={tracking.driver?.name || 'Livreur'}
          status={statusLabels[tracking.status] || tracking.status}
          distance={`${distance} km`}
          estimatedTime={tracking.estimatedDeliveryTime}
        />
      )}

      {/* Infos livreur */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              🚗 {tracking.driver?.name || 'Livreur inconnu'}
            </h3>
            <div className="space-y-2">
              {tracking.driver?.vehicle && (
                <p className="text-gray-300 text-sm">Véhicule: {tracking.driver.vehicle}</p>
              )}
              {tracking.driver?.phone && (
                <Button
                  onClick={() => window.location.href = `tel:${tracking.driver.phone}`}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                >
                  📞 Appeler
                </Button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">Mise à jour</p>
            <p className="text-white text-xs">
              {new Date(tracking.updatedAt).toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
      </Card>

      {/* Adresses */}
      <Card className="bg-gray-800 border-gray-700 p-4 space-y-3">
        <div className="flex gap-3">
          <span className="text-green-400 text-xl">📍</span>
          <div>
            <p className="text-gray-400 text-sm">Départ</p>
            <p className="text-white text-sm">{tracking.originLocation?.name || 'Restaurant'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-orange-400 text-xl">🧭</span>
          <div>
            <p className="text-gray-400 text-sm">Destination</p>
            <p className="text-white text-sm">{tracking.destinationLocation?.address || 'Votre adresse'}</p>
          </div>
        </div>
      </Card>

      {onClose && (
        <Button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100"
        >
          Fermer
        </Button>
      )}
    </div>
  );
};
