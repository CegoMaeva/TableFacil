import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LiveTrackingEnhanced } from '../../components/Delivery/LiveTrackingEnhanced';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const OrderTrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !token) {
      navigate('/');
      return;
    }

    loadOrder();
  }, [orderId, token]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:5000/api/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Commande non trouvée');
      }

      const data = await response.json();
      setOrder(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur chargement commande:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 p-8 max-w-md w-full text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Impossible de charger la commande'}</p>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  const statusLabels: { [key: string]: string } = {
    'pending': '⏳ En attente',
    'preparing': '👨‍🍳 En préparation',
    'ready': '✅ Prête à être livrée',
    'out-for-delivery': '🚗 En route',
    'in-progress': '📍 En cours',
    'delivered': '✔️ Livrée',
    'cancelled': '❌ Annulée'
  };

  const isDelivery = order.type === 'delivery' || order.type === 'home_delivery';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            className="mb-4 bg-gray-700 hover:bg-gray-600 text-gray-100"
          >
            ← Retour
          </Button>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <h1 className="text-3xl font-bold text-white mb-4">
              Suivi de commande
            </h1>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-gray-400 text-sm">Numéro de commande</p>
                <p className="text-white font-semibold text-lg">{orderId?.substring(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Statut</p>
                <p className="text-white font-semibold">{statusLabels[order.status] || order.status}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Type</p>
                <p className="text-white font-semibold">
                  {isDelivery ? '🚚 Livraison' : '🏪 Sur place'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-red-400 font-bold text-lg">{order.total || '...'} FCFA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Suivi de livraison si applicable */}
        {isDelivery && (order.status === 'out-for-delivery' || order.status === 'delivered') && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">📍 Suivi en temps réel</h2>
            <LiveTrackingEnhanced
              orderId={orderId!}
              token={token}
              onClose={() => console.log('Tracking fermé')}
            />
          </div>
        )}

        {/* Détails de la commande */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📦 Détails de commande</h2>
          
          {/* Articles */}
          <div className="mb-6">
            <h3 className="text-gray-300 font-semibold mb-3">Articles</h3>
            <div className="space-y-2">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <div key={`item-${idx}-${item.name}`} className="flex justify-between text-gray-300 text-sm border-b border-gray-700/30 pb-2">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="text-white font-semibold">{item.price || '...'} FCFA</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Aucun article</p>
              )}
            </div>
          </div>

          {/* Adresse de livraison */}
          {isDelivery && (
            <div className="mb-6">
              <h3 className="text-gray-300 font-semibold mb-2">📍 Adresse de livraison</h3>
              <p className="text-white">{order.address || 'Adresse non spécifiée'}</p>
              {order.phone && (
                <p className="text-gray-400 text-sm mt-1">📞 {order.phone}</p>
              )}
            </div>
          )}

          {/* Notes spéciales */}
          {order.notes && (
            <div className="mb-6">
              <h3 className="text-gray-300 font-semibold mb-2">📝 Notes</h3>
              <p className="text-gray-300 bg-gray-900/50 p-3 rounded border border-gray-700/30">
                {order.notes}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-gray-700/30 pt-6">
            <h3 className="text-gray-300 font-semibold mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="text-green-400 text-xl">✓</div>
                <div>
                  <p className="text-white font-semibold">Commande créée</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(order.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {order.status !== 'pending' && (
                <div className="flex gap-3">
                  <div className="text-blue-400 text-xl">👨‍🍳</div>
                  <div>
                    <p className="text-white font-semibold">En préparation</p>
                    <p className="text-gray-400 text-sm">Votre commande est en cours de préparation</p>
                  </div>
                </div>
              )}

              {isDelivery && (order.status === 'out-for-delivery' || order.status === 'delivered') && (
                <div className="flex gap-3">
                  <div className={order.status === 'delivered' ? 'text-green-400 text-xl' : 'text-yellow-400 text-xl'}>
                    {order.status === 'delivered' ? '✓' : '🚗'}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {order.status === 'delivered' ? 'Livrée' : 'En route vers vous'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {order.status === 'delivered' 
                        ? 'Merci de votre commande!' 
                        : 'Votre livreur est en chemin'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bouton d'aide */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => alert('Contacter le support')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-100"
          >
            💬 Besoin d'aide ?
          </Button>
        </div>
      </div>
    </div>
  );
};
