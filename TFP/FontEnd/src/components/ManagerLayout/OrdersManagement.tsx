import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  total: number;
  type: string; // 'dine-in', 'takeaway', 'delivery'
  table?: string;
  address?: string;
  phone?: string;
  status: string; // 'pending', 'preparing', 'ready', 'served', 'delivered', 'cancelled'
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Mapping des types API vers affichage
const typeMapping: Record<string, string> = {
  'dine-in': 'Sur place',
  'takeaway': 'À emporter',
  'delivery': 'Livraison'
};

const statusMapping: Record<string, string> = {
  'pending': 'En attente',
  'preparing': 'En préparation',
  'ready': 'Prête',
  'served': 'Servie',
  'delivered': 'Livrée',
  'cancelled': 'Annulée'
};

export const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});

  // Charger les commandes au montage
  useEffect(() => {
    loadOrders();
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      // Assurer que toutes les commandes ont un statut valide
      const validatedOrders = (data || []).map((order: Order) => ({
        ...order,
        status: order.status || 'pending'
      }));
      setOrders(validatedOrders);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    'pending': { 
      label: 'En attente', 
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      icon: '⏳'
    },
    'preparing': { 
      label: 'En préparation', 
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: '🍳'
    },
    'ready': { 
      label: 'Prête', 
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: '✅'
    },
    'served': { 
      label: 'Servie', 
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: '✔️'
    },
    'delivered': { 
      label: 'Livrée', 
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: '🚗'
    },
    'cancelled': { 
      label: 'Annulée', 
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: '❌'
    }
  };

  const typeIcons: Record<string, string> = {
    'dine-in': '🍽️',
    'delivery': '🚚',
    'takeaway': '📦'
  };

  const filterOrdersByStatus = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      setSelectedOrder(null);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de mettre à jour le statut');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation');
      }

      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      setSelectedOrder(null);
      toast.success('Commande annulée');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible d\'annuler la commande');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette commande ? Cette action est irréversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setOrders(orders.filter(order => order.id !== orderId));
      setSelectedOrder(null);
      toast.success('Commande supprimée avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible de supprimer la commande');
    }
  };

  const handleUpdateOrder = async (orderId: string, updatedData: Partial<Order>) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      setSelectedOrder(updatedOrder);
      toast.success('Commande mise à jour avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible de mettre à jour la commande');
    }
  };

  const tabs = [
    { value: 'all', label: 'Toutes', count: orders.length },
    { value: 'pending', label: 'En attente', count: filterOrdersByStatus('pending').length },
    { value: 'preparing', label: 'En préparation', count: filterOrdersByStatus('preparing').length },
    { value: 'ready', label: 'Prêtes', count: filterOrdersByStatus('ready').length },
    { value: 'served', label: 'Servies', count: filterOrdersByStatus('served').length },
    { value: 'delivered', label: 'Livrées', count: filterOrdersByStatus('delivered').length }
  ];

  const displayedOrders = filterOrdersByStatus(activeTab);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gestion des Commandes</h1>
        <p className="text-gray-400">Visualisez et gérez toutes les commandes en temps réel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total commandes</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">En préparation</p>
          <p className="text-2xl font-bold text-yellow-400">
            {orders.filter(o => o.status === 'preparing').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Prêtes</p>
          <p className="text-2xl font-bold text-blue-400">
            {orders.filter(o => o.status === 'ready').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">En livraison</p>
          <p className="text-2xl font-bold text-purple-400">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-emerald-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Revenus</p>
          <p className="text-2xl font-bold text-emerald-400">
            {(orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0) / 1000).toFixed(0)}K
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedOrders.map((order) => (
          <div
            key={order.id}
            className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden transition-all hover:shadow-xl cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{order.id}</span>
                    {statusConfig[order.status] ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusConfig[order.status].color}`}>
                        {statusConfig[order.status].icon} {statusConfig[order.status].label}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold border bg-gray-500/20 text-gray-400 border-gray-500/30">
                        ⚠️ Inconnu
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{typeIcons[order.type]}</span>
                    <span>{typeMapping[order.type]}</span>
                    {order.table && <span>• {order.table}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{order.total.toLocaleString()} F</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold text-white">{order.clientName}</p>
                {order.phone && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {order.phone}
                  </p>
                )}
                {order.address && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {order.address}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="bg-gray-900/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Articles commandés:</p>
                <div className="space-y-1">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-sm text-gray-300">• {item.name} x{item.quantity}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayedOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Aucune commande dans cette catégorie</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Commande {selectedOrder.id}</h2>
              <div className="flex gap-2">
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditFormData(selectedOrder);
                    }}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-all"
                    title="Modifier"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditing(false);
                    setEditFormData({});
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Notes</label>
                  <textarea
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Table</label>
                  <input
                    type="text"
                    value={editFormData.table || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, table: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Adresse</label>
                  <input
                    type="text"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleUpdateOrder(selectedOrder.id, editFormData);
                      setIsEditing(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditFormData({});
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Statut actuel</p>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-semibold border ${statusConfig[selectedOrder.status].color}`}>
                      {statusConfig[selectedOrder.status].icon} {statusConfig[selectedOrder.status].label}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-2">Changer le statut:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOrder.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                          className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg hover:from-yellow-600 hover:to-amber-600 transition-all text-sm font-semibold shadow-lg shadow-yellow-500/30"
                        >
                          🍳 Commencer
                        </button>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-semibold shadow-lg shadow-blue-500/30"
                        >
                          ✅ Prête
                        </button>
                      )}
                      {selectedOrder.status === 'ready' && selectedOrder.type === 'dine-in' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'served')}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/30"
                        >
                          ✔️ Servie
                        </button>
                      )}
                      {selectedOrder.status === 'ready' && selectedOrder.type === 'delivery' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                          className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all text-sm font-semibold shadow-lg shadow-purple-500/30"
                        >
                          🚗 Livrée
                        </button>
                      )}
                      {selectedOrder.status === 'ready' && selectedOrder.type === 'takeaway' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'served')}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/30"
                        >
                          ✔️ Récupérée
                        </button>
                      )}
                      {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'served' && selectedOrder.status !== 'delivered' && (
                        <button
                          onClick={() => handleCancelOrder(selectedOrder.id)}
                          className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all text-sm font-semibold shadow-lg shadow-red-500/30"
                        >
                          ❌ Annuler
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Informations de la commande:</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-white"><span className="text-gray-400">Client:</span> {selectedOrder.clientName}</p>
                      {selectedOrder.table && <p className="text-white"><span className="text-gray-400">Table:</span> {selectedOrder.table}</p>}
                      {selectedOrder.phone && <p className="text-white"><span className="text-gray-400">Téléphone:</span> {selectedOrder.phone}</p>}
                      {selectedOrder.address && <p className="text-white"><span className="text-gray-400">Adresse:</span> {selectedOrder.address}</p>}
                      {selectedOrder.notes && <p className="text-white"><span className="text-gray-400">Notes:</span> {selectedOrder.notes}</p>}
                      <p className="text-white"><span className="text-gray-400">Total:</span> {selectedOrder.total.toLocaleString()} F</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold"
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setIsEditing(false);
                      setEditFormData({});
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
