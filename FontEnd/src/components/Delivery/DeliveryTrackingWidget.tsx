import React, { useEffect, useState } from 'react';
import { DeliveryMap } from './DeliveryMap';

interface DeliveryTrackingWidgetProps {
  orderId: string;
  driverLocation?: { lat: number; lng: number };
  status?: string;
  onClose?: () => void;
}

export const DeliveryTrackingWidget: React.FC<DeliveryTrackingWidgetProps> = ({
  orderId,
  driverLocation,
  status,
  onClose,
}) => {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingData();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTrackingData, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadTrackingData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}/tracking`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error('Erreur chargement suivi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
        Chargement de la carte...
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
        Pas de données de suivi disponibles
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-900/50 border-b border-gray-700">
        <h3 className="text-white font-bold">📍 Suivi en temps réel</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      <div className="h-96">
        <DeliveryMap
          driverLocation={driverLocation || trackingData.driverLocation || { lat: 14.7167, lng: -17.4677 }}
          clientLocation={trackingData.clientLocation || { lat: 14.7167, lng: -17.4677 }}
          driverName={trackingData.driverName || 'Livreur'}
          status={status || trackingData.status || 'out-for-delivery'}
          distance={trackingData.distance || 0}
          estimatedTime={trackingData.estimatedTime || 0}
        />
      </div>

      {trackingData && (
        <div className="p-4 bg-gray-900/50 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-400 text-xs">Distance</p>
            <p className="text-white font-bold text-lg">
              {typeof trackingData.distance === 'number'
                ? (trackingData.distance / 1000).toFixed(1)
                : '?'}
              {' km'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">ETA</p>
            <p className="text-white font-bold text-lg">
              {typeof trackingData.estimatedTime === 'number'
                ? Math.round(trackingData.estimatedTime / 60)
                : '?'}
              {' min'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Statut</p>
            <p className="text-white font-bold text-lg">
              {trackingData.status === 'out-for-delivery' ? '🚗 En route' : '✅ Livré'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
