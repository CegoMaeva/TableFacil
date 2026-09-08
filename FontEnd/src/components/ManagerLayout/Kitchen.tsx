import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../Common/NotificationCenter';
import { KitchenInventoryProposal } from './KitchenInventoryProposal';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  id?: string;
  description?: string;
  category?: string;
}

interface Order {
  id: string;
  userId?: string | null;
  userName?: string;
  items: OrderItem[];
  total: number;
  type?: string; // 'dine-in', 'delivery', 'takeaway'
  table?: string | null;
  address?: string | null;
  phone?: string | null;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  createdBy?: string;
}

export const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'cashier'>('all');
  const [view, setView] = useState<'orders' | 'inventory'>('orders');
  const [proposalName, setProposalName] = useState('');
  const [proposalQty, setProposalQty] = useState<number>(1);
  const [proposalUnit, setProposalUnit] = useState('pcs');
  const [proposalNotes, setProposalNotes] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 4000); // Refresh every 4 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === 'inventory') loadProposals();
  }, [view]);

  const loadProposals = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/inventory/proposals`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur chargement propositions');
      const data = await res.json();
      setProposals(data);
    } catch (e) {
      console.error(e);
    }
  };

  const submitProposal = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');
      if (!proposalName || proposalQty <= 0) return toast.error('Nom et quantité requis');
      const res = await fetch(`${API_BASE_URL}/api/inventory/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: proposalName, quantity: proposalQty, unit: proposalUnit, notes: proposalNotes, type: 'add' })
      });
      if (!res.ok) throw new Error('Erreur création proposition');
      await res.json();
      toast.success('Proposition envoyée');
      setProposalName(''); setProposalQty(1); setProposalNotes('');
      loadProposals();
    } catch (e:any) {
      console.error(e);
      toast.error(e.message || 'Erreur');
    }
  };

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur chargement commandes');
      const data = await res.json();
      
      // Filter only pending and preparing orders, sort by priority
      const activeOrders = data.filter((o: Order) => o.status === 'pending' || o.status === 'preparing');
      const sorted = sortByPriority(activeOrders);
      setOrders(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortByPriority = (ordersList: Order[]): Order[] => {
    return ordersList.sort((a, b) => {
      // Priority: dine-in > delivery/takeaway
      const priorityA = a.type === 'dine-in' ? 0 : 1;
      const priorityB = b.type === 'dine-in' ? 0 : 1;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by creation time (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Erreur mise à jour');
      const updated = await res.json();

      // Update local list and remove if ready
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o).filter(o => o.status === 'pending' || o.status === 'preparing'));
      if (updated.status === 'preparing') {
        toast.success('Commande en préparation', { duration: 2000 });
      } else if (updated.status === 'ready') {
        toast.success('✅ Commande prête !', { duration: 3000 });
        
        // Si c'est une livraison, notifier le système
        if (updated.type === 'delivery' || updated.type === 'livraison') {
          toast.info('🚚 Livraison prête - Livreur notifié', { duration: 4000 });
        }
      } else {
        toast.success('Statut mis à jour', { duration: 2000 });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xl">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  const visibleOrders = orders.filter(o => filterTab === 'all' ? true : ((o as any).createdBy && (o as any).createdBy.role === 'caissier'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/80 border-b border-emerald-500/20 shadow-2xl">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="TableFacil"
                className="h-12 w-auto rounded-lg bg-white/5 p-2 shadow-lg shadow-emerald-500/30"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">TableFacil</h1>
                <p className="text-xs text-gray-400">Gestion Cuisine</p>
              </div>
            </div>

            {/* Center Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm text-emerald-300 font-semibold">{orders.filter(o => o.type === 'dine-in').length} sur place</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-sm text-blue-300 font-semibold">{orders.filter(o => o.type !== 'dine-in').length} livraisons</span>
              </div>
            </div>

            {/* User & Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{user?.name || 'Cuisinier'}</p>
                <p className="text-xs text-gray-500">Chef de cuisine</p>
              </div>
              
              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.error(e);
                  }
                  navigate('/');
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Commandes en attente</h2>
              <p className="text-gray-400">Gérez vos commandes en temps réel</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-emerald-300 font-semibold">{visibleOrders.length} commandes actives</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="inline-flex rounded-lg bg-neutral-800/50 backdrop-blur-sm p-1 border border-neutral-700/50">
              <button 
                onClick={() => setView('orders')} 
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${view === 'orders' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'text-neutral-400 hover:text-neutral-300'}`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-1-2-2-2zM1 2v6h6V2H1zm0 8v6h6v-6H1zm8-8v6h6V2H9zm8 0v6h6V2h-6zM9 9v6h6v-6H9zm8 0v6h6v-6h-6zM17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
                Commandes
              </button>
              <button 
                onClick={() => setView('inventory')} 
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${view === 'inventory' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'text-neutral-400 hover:text-neutral-300'}`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                </svg>
                Inventaire
              </button>
            </div>

            {view === 'orders' && (
              <div className="inline-flex rounded-lg bg-neutral-800/50 backdrop-blur-sm p-1 border border-neutral-700/50 ml-auto">
                <button 
                  onClick={() => setFilterTab('all')} 
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${filterTab === 'all' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400 hover:text-neutral-300'}`}
                >
                  Toutes
                </button>
                <button 
                  onClick={() => setFilterTab('cashier')} 
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${filterTab === 'cashier' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400 hover:text-neutral-300'}`}
                >
                  Caissier
                </button>
              </div>
            )}
          </div>
        </div>

      {view === 'orders' ? (
        visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] backdrop-blur-sm">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-xl"></div>
              <svg className="w-24 h-24 text-emerald-500/30 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-xl font-semibold">Aucune commande en attente</p>
            <p className="text-gray-600 text-sm mt-2">Les nouvelles commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
              {visibleOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={`group rounded-2xl overflow-hidden shadow-2xl transition-all transform hover:scale-[1.02] hover:shadow-3xl border-2 backdrop-blur-sm ${
                    order.type === 'dine-in'
                      ? 'bg-gradient-to-br from-emerald-950/80 to-emerald-900/80 border-emerald-500/50 hover:border-emerald-400'
                      : 'bg-gradient-to-br from-blue-950/80 to-blue-900/80 border-blue-500/50 hover:border-blue-400'
                  }`}
                >
                  {/* Status Bar */}
                  <div className={`h-1 bg-gradient-to-r ${order.type === 'dine-in' ? 'from-emerald-500 to-teal-500' : 'from-blue-500 to-cyan-500'}`}></div>

                  {/* Card Content */}
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {order.type === 'dine-in' ? (
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50">
                              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/50">
                              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-gray-400">
                              {order.type === 'dine-in' ? 'SUR PLACE' : (order.type === 'delivery' ? 'LIVRAISON' : 'À EMPORTER')}
                            </p>
                            <p className="text-lg font-bold text-white">{order.userName || 'Client'}</p>
                          </div>
                        </div>
                        {order.table && <p className="text-sm text-gray-400 ml-11">Table <span className="font-bold text-gray-200">{order.table}</span></p>}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                        order.status === 'pending' 
                          ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
                          : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      }`}>
                        {order.status === 'pending' ? '🔴 NOUVEAU' : '⏳ EN COURS'}
                      </span>
                    </div>

                    {/* Time Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 p-2 bg-white/5 rounded-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                      </svg>
                      Commandé il y a {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)} min
                    </div>

                    {/* Items */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-1-2-2-2zM1 2v6h6V2H1zm0 8v6h6v-6H1zm8-8v6h6V2H9zm8 0v6h6V2h-6zM9 9v6h6v-6H9zm8 0v6h6v-6h-6zM17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                        Articles ({order.items?.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          const aggregated: { name: string; quantity: number; description?: string }[] = [];
                          (order.items || []).forEach((item) => {
                            const name = String(item.name).trim();
                            const found = aggregated.find(a => a.name.toLowerCase() === name.toLowerCase());
                            if (found) {
                              found.quantity += item.quantity || 0;
                            } else {
                              aggregated.push({ name, quantity: item.quantity || 0, description: item.description });
                            }
                          });
                          return aggregated.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between bg-gradient-to-r from-white/5 to-white/0 p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                              <div className="flex-1">
                                <p className="text-white font-semibold">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                              </div>
                              <span className="ml-2 px-2 py-1 bg-emerald-500/30 text-emerald-300 text-sm font-bold rounded-lg whitespace-nowrap border border-emerald-500/50">×{item.quantity}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex gap-3">
                        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                        </svg>
                        <div>
                          <p className="text-amber-300 font-semibold text-sm">Notes spéciales</p>
                          <p className="text-amber-200 text-sm">{order.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-6">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'preparing')} 
                          className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                          </svg>
                          COMMENCER LA PRÉPARATION
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'ready')} 
                          className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          MARQUER COMME PRÊTE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <KitchenInventoryProposal />
      )}
      </div>
    </div>
  );
};
