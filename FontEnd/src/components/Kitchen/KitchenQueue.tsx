/**
 * Kitchen Queue Interface
 * Affiche le file d'attente de cuisine avec statuts en temps réel
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Card, Button, Badge, Input } from '../../components/UI';

interface KitchenOrder {
  order_id: string;
  numero: string;
  status: 'paid' | 'preparing' | 'ready_for_delivery';
  items: any[];
  created_at: string;
  time_in_prep: string;
  special_notes: string;
}

export const KitchenQueue: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filter, setFilter] = useState<'paid' | 'preparing' | 'ready'>('paid');
  const [loading, setLoading] = useState(true);

  // Charger les commandes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/workflow/kitchen/orders');
        setOrders(response.data);
      } catch (error) {
        console.error('Erreur chargement commandes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Refresh toutes les 10s
    return () => clearInterval(interval);
  }, []);

  const handleStartPreparation = async (orderId: string) => {
    try {
      await api.post(`/workflow/kitchen/orders/${orderId}/start`);
      // Actualiser la liste
      const response = await api.get('/workflow/kitchen/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      await api.post(`/workflow/kitchen/orders/${orderId}/ready`);
      // Actualiser la liste
      const response = await api.get('/workflow/kitchen/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Grouper par statut
  const groupedOrders = {
    paid: orders.filter(o => o.status === 'paid'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready_for_delivery'),
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">🍳 File d'attente Cuisine</h1>

      {/* En attente */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-brand-400 mb-4">
          📋 En attente ({groupedOrders.paid.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedOrders.paid.map(order => (
            <Card key={order.order_id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-lg font-bold text-white">{order.numero}</p>
                  <p className="text-sm text-gray-400">{order.created_at}</p>
                </div>
                <Badge variant="warning">{order.status}</Badge>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-300 mb-2">Plats:</p>
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-400">
                    • {item.name} x {item.quantity}
                  </p>
                ))}
              </div>

              {order.special_notes && (
                <div className="mb-4 p-2 bg-red-900 rounded">
                  <p className="text-sm text-red-200">⚠️ {order.special_notes}</p>
                </div>
              )}

              <Button
                onClick={() => handleStartPreparation(order.order_id)}
                className="w-full"
                variant="primary"
              >
                Commencer la préparation
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* En préparation */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-brand-300 mb-4">
          👨‍🍳 En préparation ({groupedOrders.preparing.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedOrders.preparing.map(order => (
            <Card key={order.order_id} className="p-4 border-l-4 border-brand-400">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-lg font-bold text-white">{order.numero}</p>
                  <p className="text-sm text-brand-300">Depuis: {order.time_in_prep}</p>
                </div>
                <Badge variant="info">{order.status}</Badge>
              </div>

              <div className="mb-4">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-400">
                    ✓ {item.name} x {item.quantity}
                  </p>
                ))}
              </div>

              <Button
                onClick={() => handleMarkReady(order.order_id)}
                className="w-full"
                variant="success"
              >
                Prête à livrer
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Prêtes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-brand-500 mb-4">
          ✅ Prêtes pour livraison ({groupedOrders.ready.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedOrders.ready.map(order => (
            <Card key={order.order_id} className="p-4 border-2 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold text-white">{order.numero}</p>
                  <Badge variant="success" className="mt-2">Prête</Badge>
                </div>
                <p className="text-xs text-gray-400">{order.time_in_prep}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KitchenQueue;
