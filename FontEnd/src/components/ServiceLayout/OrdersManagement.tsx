import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Order {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  customerEmail?: string;
  clientEmail?: string;
  phone?: string;
  userPhone?: string;
  items: any[];
  total: number;
  status: string;
  type: string;
  tableNumber?: number;
  deliveryAddress?: string;
  timestamp?: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'preparing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'ready': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'served': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'delivered': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30'
};

const STATUS_LABELS: Record<string, string> = {
  'pending': 'En attente',
  'preparing': 'En préparation',
  'ready': 'Prête',
  'served': 'Servie',
  'delivered': 'Livrée',
  'cancelled': 'Annulée'
};

// Workflow des statuts - ordre de progression
const STATUS_WORKFLOW = ['pending', 'preparing', 'ready', 'served', 'delivered'];

// Déterminer les statuts autorisés pour le statut actuel
const getAllowedNextStatuses = (currentStatus: string): string[] => {
  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
  
  if (currentIndex === -1) {
    return STATUS_WORKFLOW; // Si statut inconnu, tous autorisés
  }
  
  // Autoriser le statut actuel et les suivants
  const allowed = STATUS_WORKFLOW.slice(currentIndex);
  
  // Ajouter 'cancelled' si ce n'est pas le dernier statut
  if (currentStatus !== 'delivered' && currentStatus !== 'cancelled') {
    allowed.push('cancelled');
  }
  
  return allowed;
};

export const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const normalize = (value: string | undefined | null) =>
    (value || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      await fetchOrders();
      toast.success('Statut mis à jour avec succès', { duration: 2000 });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de mettre à jour le statut', { duration: 3000 });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

    const search = normalize(searchTerm.trim());
    if (!search) return matchesStatus;

    const email = normalize(order.userEmail || order.customerEmail || order.clientEmail);
    const name = normalize(order.userName);
    const id = normalize(order.id);
    const phone = normalize((order as any).phone || order.userPhone); // certains payloads portent phone côté backend

    const matchesSearch = id.includes(search)
      || name.includes(search)
      || email.includes(search)
      || phone.includes(search);

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Gestion des Commandes</h1>
        <p className="text-neutral-400 text-lg">Affiche toutes les commandes de tous les clients</p>
      </div>

      {/* Filters */}
      <div className="card-elevated mb-6 bg-gradient-to-r from-neutral-800 to-neutral-900 border-2 border-brand-500/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-brand-300 mb-2 block">Rechercher</label>
            <input
              type="text"
              placeholder="Tapez l'ID ou le nom du client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-brand-400/50 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 text-base"
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-brand-300 mb-2 block">Filtrer par statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-brand-400/50 text-white rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 text-base font-medium"
            >
              <option value="all" className="bg-neutral-900 text-white">Tous les statuts</option>
              <option value="pending" className="bg-neutral-900 text-white">En attente</option>
              <option value="preparing" className="bg-neutral-900 text-white">En préparation</option>
              <option value="ready" className="bg-neutral-900 text-white">Prête</option>
              <option value="served" className="bg-neutral-900 text-white">Servie</option>
              <option value="delivered" className="bg-neutral-900 text-white">Livrée</option>
              <option value="cancelled" className="bg-neutral-900 text-white">Annulée</option>
            </select>
          </div>

        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="card-elevated text-center py-12">
            <p className="text-neutral-400 text-lg">Aucune commande trouvée</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const allowedStatuses = getAllowedNextStatuses(order.status);
            
            return (
              <div key={order.id} className="card-elevated hover:border-brand-500/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="mb-3">
                      <h2 className="text-lg font-bold text-brand-300 mb-1">
                        👤 {order.userName}
                      </h2>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-neutral-100">{order.id}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-neutral-400">
                      {order.timestamp && (
                        <span>🕒 {new Date(order.timestamp).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-400">{order.total.toLocaleString()} FCFA</p>
                    <p className="text-sm text-neutral-500">{order.items?.length || 0} article(s)</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-neutral-900/50 rounded-xl p-4 mb-4">
                  <div className="space-y-2">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-neutral-300">
                          {item.quantity}x {item.name || item.recipeName}
                        </span>
                        <span className="text-neutral-400">
                          {((item.price || 0) * (item.quantity || 1)).toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Update Dropdown */}
                <div className="flex items-center gap-4 bg-neutral-900/50 p-3 rounded-lg border border-brand-400/30">
                  <label className="text-sm font-semibold text-brand-300 whitespace-nowrap">Changer le statut:</label>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="flex-1 px-4 py-2 bg-neutral-800 border-2 border-brand-400/50 text-white rounded-lg focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 font-medium cursor-pointer hover:border-brand-400"
                  >
                    {allowedStatuses.map(status => (
                      <option key={status} value={status} className="bg-neutral-900 text-white">
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
