import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
        toast.success('Commande en préparation');
      } else if (updated.status === 'ready') {
        toast.success('Commande prête !');
      } else {
        toast.success('Statut mis à jour');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-gray-400 text-xl">Chargement des commandes...</p>
      </div>
    );
  }

  const visibleOrders = orders.filter(o => filterTab === 'all' ? true : ((o as any).createdBy && (o as any).createdBy.role === 'caissier'));

  return (
    <div className="min-h-screen bg-neutral-950 p-4">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-display font-bold text-neutral-100 mb-2">Cuisine</h1>
            <p className="text-neutral-400 text-lg">Commandes en attente</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-sm text-neutral-300">{user?.name || 'Cuisinier'}</div>
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
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="inline-flex rounded-lg bg-neutral-900/40 p-1">
            <button onClick={() => setView('orders')} className={`px-4 py-2 rounded-lg ${view === 'orders' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400'}`}>
              Commandes
            </button>
            <button onClick={() => setView('inventory')} className={`px-4 py-2 rounded-lg ${view === 'inventory' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400'}`}>
              Inventaire
            </button>
          </div>
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500 rounded-lg">
            <p className="text-emerald-400 font-semibold">{orders.filter(o => o.type === 'dine-in').length} sur place</p>
          </div>
          <div className="px-4 py-2 bg-blue-500/20 border border-blue-500 rounded-lg">
            <p className="text-blue-400 font-semibold">{orders.filter(o => o.type !== 'dine-in').length} livraisons</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-flex rounded-lg bg-neutral-900/50 p-1">
          <button onClick={() => setFilterTab('all')} className={`px-4 py-2 rounded-lg ${filterTab === 'all' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400'}`}>
            Toutes
          </button>
          <button onClick={() => setFilterTab('cashier')} className={`px-4 py-2 rounded-lg ${filterTab === 'cashier' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'text-neutral-400'}`}>
            Caissier
          </button>
        </div>
      </div>

      {view === 'orders' ? (
        visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <svg className="w-24 h-24 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 text-xl">Aucune commande en attente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-6 pb-4">
              {visibleOrders.map((order) => (
                <div key={order.id} style={{ minWidth: 380 }} className={`rounded-2xl p-6 border-2 shadow-2xl transition-all transform hover:scale-[1.02] ${
                  order.type === 'dine-in'
                    ? 'bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-500 shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-blue-950 to-blue-900 border-blue-500 shadow-blue-500/20'
                }`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {order.type === 'dine-in' ? (
                      <>
                        <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                        <span className="text-emerald-400 font-bold text-lg">SUR PLACE</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z" />
                        </svg>
                        <span className="text-blue-400 font-bold text-lg">{order.type === 'delivery' ? 'LIVRAISON' : 'À EMPORTER'}</span>
                      </>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">{order.userName || 'Client'}</p>
                  {order.table && <p className="text-sm text-gray-300">Table {order.table}</p>}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  order.status === 'pending' 
                    ? 'bg-red-500/30 text-red-300' 
                    : 'bg-yellow-500/30 text-yellow-300'
                }`}>
                  {order.status === 'pending' ? 'NOUVEAU' : 'EN COURS'}
                </span>
              </div>

              {/* Items */}
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                <h3 className="text-white font-semibold mb-3">Articles</h3>
                <div className="space-y-2">
                  {(() => {
                    // Aggregate repeated items by name
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
                      <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-semibold text-lg">{`${item.name} ×${item.quantity}`}</p>
                          {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 font-semibold text-sm">Notes spéciales :</p>
                  <p className="text-yellow-200 text-sm">{order.notes}</p>
                </div>
              )}

              {/* Time */}
              <div className="text-xs text-gray-400 mb-4">
                Commandé il y a {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)} min
              </div>

              {/* Action Button */}
              <div className="mt-4">
                {order.status === 'pending' && (
                  <button onClick={() => updateStatus(order.id, 'preparing')} className="w-full py-3 rounded-xl font-bold text-lg bg-yellow-500 text-black">COMMENCER</button>
                )}
                {order.status === 'preparing' && (
                  <button onClick={() => updateStatus(order.id, 'ready')} className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white">MARQUER PRÊTE</button>
                )}
              </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Inventaire - Propositions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input value={proposalName} onChange={(e)=>setProposalName(e.target.value)} placeholder="Nom de l'article" className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white" />
            <input type="number" value={proposalQty} onChange={(e)=>setProposalQty(parseInt(e.target.value)||1)} className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white" />
            <input value={proposalUnit} onChange={(e)=>setProposalUnit(e.target.value)} placeholder="Unité (ex: kg, pcs)" className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white" />
          </div>
          <textarea value={proposalNotes} onChange={(e)=>setProposalNotes(e.target.value)} placeholder="Notes (optionnel)" className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white mb-4" rows={3} />
          <div className="flex gap-2 mb-6">
            <button onClick={submitProposal} className="px-4 py-2 bg-emerald-500 text-white rounded-lg">Soumettre proposition</button>
            <button onClick={loadProposals} className="px-4 py-2 bg-neutral-700 text-white rounded-lg">Rafraîchir</button>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Mes propositions</h3>
            <div className="space-y-3">
              {proposals.length === 0 && <p className="text-gray-400">Aucune proposition</p>}
              {proposals.map(p => (
                <div key={p.id} className="bg-neutral-900/30 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{p.name} ×{p.quantity} <span className="text-xs text-neutral-400">{p.unit}</span></div>
                    <div className="text-xs text-neutral-400">Statut: {p.status}</div>
                    {p.notes && <div className="text-xs text-gray-500">{p.notes}</div>}
                  </div>
                  <div className="text-sm text-neutral-300">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
