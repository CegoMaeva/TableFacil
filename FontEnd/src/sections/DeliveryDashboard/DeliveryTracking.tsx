import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DeliveryMap } from '../../components/Delivery/DeliveryMap';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface DeliveryOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  address: string;
  total: number;
  items: any[];
  status: string;
  createdAt: string;
  clientLocation?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  estimatedTime?: number;
  distance?: number;
}

export const DeliveryTracking = () => {
  const { token, user } = useAuth();
  const [activeDelivery, setActiveDelivery] = useState<DeliveryOrder | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Charger les livraisons actives
  useEffect(() => {
    loadActiveDeliveries();
    
    // Récupérer la position du livreur
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Erreur géolocalisation:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, [token]);

  const loadActiveDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:5000/api/orders/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveries(Array.isArray(data) ? data : data.orders || []);
        
        // Automatiquement sélectionner la première livraison active
        if (Array.isArray(data) && data.length > 0) {
          setActiveDelivery(data[0]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement livraisons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    try {
      setUpdating(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}/tracking/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverLocation,
            driverName: user?.name || 'Livreur'
          })
        }
      );

      if (response.ok) {
        await loadActiveDeliveries();
        alert('Livraison démarrée');
      }
    } catch (error) {
      console.error('Erreur démarrage livraison:', error);
      alert('Erreur lors du démarrage de la livraison');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateLocation = async (orderId: string) => {
    if (!driverLocation) {
      alert('Position non disponible');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}/tracking/update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverLocation,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        console.log('Position mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour position:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      setUpdating(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}/tracking/status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'delivered',
            completedAt: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        await loadActiveDeliveries();
        setActiveDelivery(null);
        alert('Livraison marquée comme complétée');
      }
    } catch (error) {
      console.error('Erreur complétion livraison:', error);
      alert('Erreur lors de la complétion de la livraison');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des livraisons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Livraison active avec carte */}
      {activeDelivery && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            📍 Livraison en cours
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <DeliveryMap
                  driverLocation={driverLocation || { lat: 14.7167, lng: -17.4677 }}
                  clientLocation={activeDelivery.clientLocation || { lat: 14.7167, lng: -17.4677 }}
                  driverName={user?.name || 'Vous'}
                  status={activeDelivery.status}
                  distance={activeDelivery.distance || 0}
                  estimatedTime={activeDelivery.estimatedTime || 0}
                />
              </Card>
            </div>

            {/* Détails et actions */}
            <div className="space-y-4">
              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  {activeDelivery.clientName}
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-400">📞 Téléphone</p>
                    <p className="text-white font-semibold">{activeDelivery.clientPhone}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">📍 Adresse</p>
                    <p className="text-white">{activeDelivery.address}</p>
                  </div>

                  <div>
                    <p className="text-gray-400">💰 Total</p>
                    <p className="text-red-400 font-bold text-lg">{activeDelivery.total} FCFA</p>
                  </div>

                  <div>
                    <p className="text-gray-400">📦 Articles</p>
                    <div className="mt-1 space-y-1">
                      {activeDelivery.items && activeDelivery.items.map((item: any, idx: number) => (
                        <p key={`item-${idx}-${item.name}`} className="text-gray-300 text-xs">
                          • {item.name} (x{item.quantity})
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400">📊 Statut</p>
                    <p className="text-white font-semibold capitalize">
                      {activeDelivery.status === 'out-for-delivery' ? '🚗 En route' : activeDelivery.status}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700 mt-4 pt-4 space-y-2">
                  <Button
                    onClick={() => handleUpdateLocation(activeDelivery.id)}
                    disabled={updating || !driverLocation}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updating ? '⏳ Mise à jour...' : '📡 Mettre à jour position'}
                  </Button>

                  <Button
                    onClick={() => handleCompleteDelivery(activeDelivery.id)}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updating ? '⏳ Traitement...' : '✅ Livraison complétée'}
                  </Button>

                  <Button
                    onClick={() => alert(`Appeler ${activeDelivery.clientName}`)}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100"
                  >
                    ☎️ Appeler le client
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Liste des livraisons en attente */}
      {deliveries.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            📋 Livraisons à effectuer
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveries.map((delivery) => (
              <Card
                key={delivery.id}
                className={`bg-gray-800 border-gray-700 p-6 cursor-pointer transition ${
                  activeDelivery?.id === delivery.id
                    ? 'border-red-500 bg-gray-700'
                    : 'hover:border-gray-600'
                }`}
                onClick={() => setActiveDelivery(delivery)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-white font-bold">{delivery.clientName}</h3>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                    {delivery.status === 'pending' ? 'En attente' : 'En cours'}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-2">📍 {delivery.address}</p>
                <p className="text-gray-400 text-sm mb-4">📞 {delivery.clientPhone}</p>

                <div className="flex justify-between items-center">
                  <span className="text-red-400 font-bold">{delivery.total} FCFA</span>
                  {delivery.status === 'pending' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDelivery(delivery.id);
                      }}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-3"
                    >
                      Démarrer
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {deliveries.length === 0 && !activeDelivery && (
        <Card className="bg-gray-800 border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-lg">✅ Aucune livraison à effectuer</p>
          <Button
            onClick={loadActiveDeliveries}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            🔄 Rafraîchir
          </Button>
        </Card>
      )}
    </div>
  );
};
