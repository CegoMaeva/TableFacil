/**
 * Driver Delivery Interface
 * Affiche les commandes disponibles et le suivi en temps réel
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Card, Button, Badge, Modal } from '../../components/UI';
import { DeliveryMap } from './DeliveryMap';
import { useLocation } from 'react-router-dom';

interface AvailableOrder {
  order_id: string;
  numero: string;
  client_name: string;
  delivery_address: string;
  items_count: number;
  total: number;
  ready_at: string;
  time_ready: string;
}

interface AssignedOrder {
  order_id: string;
  numero: string;
  status: 'assigned_to_driver' | 'pickup' | 'in_transit' | 'delivered';
  client_name: string;
  delivery_address: string;
  items_count: number;
  total: number;
  eta_minutes: number;
  client_location: { lat: number; lng: number };
  driver_location: { lat: number; lng: number };
}

export const DriverDeliveryInterface: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const [tab, setTab] = useState<'available' | 'assigned'>('available');
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [assignedOrder, setAssignedOrder] = useState<AssignedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Charger les commandes disponibles
  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const response = await api.get('/workflow/delivery/available-orders');
        setAvailableOrders(response.data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailable();
    const interval = setInterval(fetchAvailable, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // Activer GPS
  useEffect(() => {
    if (gpsEnabled && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setDriverLocation(newLocation);

          // Envoyer position au serveur si commande assignée
          if (assignedOrder && assignedOrder.status === 'in_transit') {
            updatePosition(assignedOrder.order_id, newLocation);
          }
        },
        (error) => console.error('GPS Error:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [gpsEnabled, assignedOrder]);

  const handleAcceptOrder = async (order: AvailableOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const confirmAcceptOrder = async () => {
    if (!selectedOrder) return;

    try {
      const response = await api.post(
        `/workflow/delivery/orders/${selectedOrder.order_id}/accept`
      );
      
      // Convertir en assignedOrder
      setAssignedOrder({
        ...selectedOrder,
        status: 'assigned_to_driver',
        eta_minutes: response.data.eta_minutes,
        client_location: { lat: 45.5017, lng: -73.5673 }, // À récupérer du serveur
        driver_location: driverLocation || { lat: 45.5017, lng: -73.5673 },
      });

      setTab('assigned');
      setShowModal(false);
      // Rafraîchir les commandes disponibles
      const response2 = await api.get('/workflow/delivery/available-orders');
      setAvailableOrders(response2.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handlePickup = async () => {
    if (!assignedOrder) return;

    try {
      await api.post(`/workflow/delivery/orders/${assignedOrder.order_id}/pickup`);
      setAssignedOrder({ ...assignedOrder, status: 'pickup' });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleStartTransit = async () => {
    if (!assignedOrder) return;

    try {
      setGpsEnabled(true); // Activer GPS
      await api.post(`/workflow/delivery/orders/${assignedOrder.order_id}/in-transit`);
      setAssignedOrder({ ...assignedOrder, status: 'in_transit' });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelivered = async () => {
    if (!assignedOrder) return;

    try {
      await api.post(`/workflow/delivery/orders/${assignedOrder.order_id}/delivered`, {
        proof_type: 'confirmation',
      });
      setAssignedOrder({ ...assignedOrder, status: 'delivered' });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const updatePosition = async (orderId: string, location: { lat: number; lng: number }) => {
    try {
      await api.post(`/api/orders/${orderId}/tracking/update`, location);
    } catch (error) {
      console.error('Erreur GPS:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🚗 Mes Livraisons</h1>
          <p className="text-gray-400">Bonjour, {user?.nom_complet}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('available')}
            className={`px-4 py-2 rounded font-semibold transition ${
              tab === 'available'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📋 Commandes disponibles ({availableOrders.length})
          </button>
          <button
            onClick={() => setTab('assigned')}
            className={`px-4 py-2 rounded font-semibold transition ${
              tab === 'assigned'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🚚 Ma livraison en cours
          </button>
        </div>

        {/* Commandes Disponibles */}
        {tab === 'available' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-gray-400">Chargement...</p>
            ) : availableOrders.length === 0 ? (
              <Card className="p-6 col-span-full">
                <p className="text-gray-400 text-center">Aucune commande disponible</p>
              </Card>
            ) : (
              availableOrders.map(order => (
                <Card key={order.order_id} className="p-4">
                  <div className="mb-3">
                    <p className="text-lg font-bold text-white">{order.numero}</p>
                    <p className="text-sm text-gray-400">📍 {order.delivery_address}</p>
                  </div>

                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-300">
                      👤 {order.client_name}
                    </p>
                    <p className="text-sm text-gray-300">
                      📦 {order.items_count} article(s)
                    </p>
                    <p className="text-sm text-brand-400 font-semibold">
                      💰 {order.total}€
                    </p>
                    <p className="text-xs text-gray-500">
                      Prête depuis {order.time_ready}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleAcceptOrder(order)}
                    className="w-full"
                    variant="success"
                  >
                    Accepter la livraison
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Livraison en cours */}
        {tab === 'assigned' && assignedOrder && (
          <div className="space-y-6">
            {/* Map */}
            <Card className="p-4">
              <DeliveryMap
                driverLocation={assignedOrder.driver_location || driverLocation}
                clientLocation={assignedOrder.client_location}
                driverName={user?.nom_complet || 'Driver'}
                status={assignedOrder.status}
                distance={2.5}
                estimatedTime={assignedOrder.eta_minutes}
              />
            </Card>

            {/* Détails */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">📋 Détails</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Commande</p>
                    <p className="text-white font-semibold">{assignedOrder.numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Client</p>
                    <p className="text-white font-semibold">{assignedOrder.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Adresse</p>
                    <p className="text-white">{assignedOrder.delivery_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="text-brand-400 font-semibold text-lg">
                      {assignedOrder.total}€
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">🚗 Statut</h3>
                <div className="mb-6">
                  <Badge
                    variant={
                      assignedOrder.status === 'assigned_to_driver'
                        ? 'info'
                        : assignedOrder.status === 'pickup'
                        ? 'warning'
                        : assignedOrder.status === 'in_transit'
                        ? 'success'
                        : 'success'
                    }
                    className="text-lg py-2 px-4"
                  >
                    {assignedOrder.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {assignedOrder.status === 'assigned_to_driver' && (
                    <Button
                      onClick={handlePickup}
                      className="w-full"
                      variant="primary"
                    >
                      J'ai récupéré la commande
                    </Button>
                  )}

                  {assignedOrder.status === 'pickup' && (
                    <Button
                      onClick={handleStartTransit}
                      className="w-full"
                      variant="primary"
                    >
                      Je pars livrer
                    </Button>
                  )}

                  {assignedOrder.status === 'in_transit' && (
                    <>
                      <p className="text-sm text-gray-400">
                        ⏱️ ETA: {assignedOrder.eta_minutes} minutes
                      </p>
                      <Button
                        onClick={handleDelivered}
                        className="w-full"
                        variant="success"
                      >
                        Livraison effectuée
                      </Button>
                    </>
                  )}

                  {assignedOrder.status === 'delivered' && (
                    <div className="p-3 bg-green-900 rounded">
                      <p className="text-green-200">✅ Livraison confirmée!</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'assigned' && !assignedOrder && (
          <Card className="p-8 text-center">
            <p className="text-gray-400 text-lg mb-4">Aucune livraison en cours</p>
            <Button
              onClick={() => setTab('available')}
              variant="primary"
            >
              Voir les commandes disponibles
            </Button>
          </Card>
        )}
      </div>

      {/* Modal de confirmation */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Confirmer l'acceptation
          </h2>
          {selectedOrder && (
            <div className="mb-6 space-y-3">
              <p className="text-gray-300">
                Commande: <span className="font-semibold">{selectedOrder.numero}</span>
              </p>
              <p className="text-gray-300">
                Client: <span className="font-semibold">{selectedOrder.client_name}</span>
              </p>
              <p className="text-gray-300">
                Adresse: <span className="font-semibold">{selectedOrder.delivery_address}</span>
              </p>
              <p className="text-gray-300">
                Montant: <span className="font-bold text-brand-400">{selectedOrder.total}€</span>
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmAcceptOrder}
              variant="success"
              className="flex-1"
            >
              Accepter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DriverDeliveryInterface;
