import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  type?: string;
  table?: string | null;
  address?: string | null;
  phone?: string | null;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface CashierProps {
  activeTab?: 'onsite' | 'validation';
}

export const Cashier = ({ activeTab = 'onsite' }: CashierProps) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [menu, setMenu] = useState<OrderItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuQuery, setMenuQuery] = useState('');
  const [itemDraft, setItemDraft] = useState<OrderItem>({ name: '', quantity: 1, price: 0 });
  const [customerName, setCustomerName] = useState('');
  const [table, setTable] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'pos' | 'online'>('pos');

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    if (activeTab === 'onsite') {
      setCurrentTab('pos');
    } else if (activeTab === 'validation') {
      setCurrentTab('online');
    }
  }, [activeTab]);

  const parsePrice = (priceString: string | number): number => {
    if (!priceString) return 0;
    if (typeof priceString === 'number') return priceString;
    const m = String(priceString).replace(/[^0-9]/g, '');
    return m ? parseInt(m, 10) : 0;
  };

  const loadMenu = async () => {
    try {
      setMenuLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/recipes?available=true`);
      if (!res.ok) throw new Error('Erreur chargement menu');
      const data = await res.json();
      const mapped = data.map((r: any) => ({
        name: r.name,
        quantity: 1,
        price: parsePrice(r.price),
        description: r.description || '',
        id: r.id,
        category: r.category || ''
      }));
      setMenu(mapped);
    } catch (err) {
      console.error('Erreur menu:', err);
    } finally {
      setMenuLoading(false);
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
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!itemDraft.name || itemDraft.quantity <= 0) {
      toast.error('Nom d\'article et quantité requis');
      return;
    }
    // Merge with existing item of same name (case-insensitive)
    setItems(prev => {
      const idx = prev.findIndex(it => it.name.trim().toLowerCase() === itemDraft.name.trim().toLowerCase());
      if (idx === -1) return [...prev, { ...itemDraft }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantity: (copy[idx].quantity || 0) + (itemDraft.quantity || 0) };
      return copy;
    });
    setItemDraft({ name: '', quantity: 1, price: 0 });
  };

  const addMenuItem = (menuItem: any) => {
    // Merge same menu items instead of repeating
    setItems(prev => {
      const name = String(menuItem.name).trim();
      const idx = prev.findIndex(it => it.name.trim().toLowerCase() === name.toLowerCase());
      if (idx === -1) return [...prev, { name, quantity: 1, price: menuItem.price }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantity: (copy[idx].quantity || 0) + 1 };
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);

  const generateShortName = (itemsList: OrderItem[], type: string, tableVal: string, custName: string) => {
    const aggMap: Record<string, number> = {};
    itemsList.forEach(i => {
      const name = String(i.name || '').trim();
      if (!name) return;
      aggMap[name] = (aggMap[name] || 0) + (i.quantity || 0);
    });
    const entries = Object.entries(aggMap);
    const parts = entries.slice(0, 2).map(([name, qty]) => (qty > 1 ? `${qty}× ${name}` : name));
    let base = parts.join(' + ');
    if (!base) base = custName ? String(custName).slice(0, 20) : (type === 'dine-in' ? `Sur place` : (type === 'delivery' ? 'Livraison' : 'À emporter'));
    if (type === 'dine-in' && tableVal) base = `${base} • T${tableVal}`;
    if (custName) {
      const first = String(custName).split(' ')[0];
      if (!base.includes(first)) base = `${base} • ${first}`;
    }
    return base.length > 40 ? base.slice(0, 37) + '...' : base;
  };

  const createOrder = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      if (items.length === 0) {
        toast.error('Ajoutez au moins un article');
        return;
      }

      const payload: any = {
        items,
        total,
        type: orderType,
        table: orderType === 'dine-in' ? (table || null) : null,
        shortName: generateShortName(items, orderType, table, customerName),
        customerName: customerName || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erreur création');
      const order = await res.json();
      toast.success('Commande créée !');
      
      setItems([]);
      setCustomerName('');
      setTable('');
      setPhone('');
      setNotes('');
      setOrders(prev => [order, ...prev]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    }
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
      
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      toast.success('Statut mis à jour');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    }
  };

  const onlineOrders = orders.filter(o => o.type === 'delivery' || o.type === 'takeaway');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Interface Caissier</h1>
        <p className="text-gray-400">Saisie & validation des commandes</p>
      </div>

      {currentTab === 'pos' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Articles</h2>

              <div className="mb-3">
                <input
                  placeholder="Rechercher dans le menu..."
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {menuLoading ? (
                    <div className="text-gray-400">Chargement du menu...</div>
                  ) : (
                    (menu.filter(m => m.name.toLowerCase().includes(menuQuery.toLowerCase()))).slice(0, 18).map((m, idx) => (
                      <div key={idx} className="p-2 bg-gray-900/30 rounded-lg flex flex-col">
                        <div className="flex-1">
                          <div className="text-white font-medium">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.category}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{(m as any).description}</div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-white font-semibold">{m.price.toLocaleString()} F</div>
                          <button onClick={() => addMenuItem(m)} className="px-2 py-1 bg-emerald-500 text-white rounded">Ajouter</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  placeholder="Nom article"
                  value={itemDraft.name}
                  onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="number"
                  placeholder="Quantité"
                  value={itemDraft.quantity}
                  onChange={(e) => setItemDraft({ ...itemDraft, quantity: parseInt(e.target.value) || 1 })}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="number"
                  placeholder="Prix (FCFA)"
                  value={itemDraft.price}
                  onChange={(e) => setItemDraft({ ...itemDraft, price: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <button onClick={addItem} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg">Ajouter article manuel</button>

              <div className="space-y-2 mt-4">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900/30 p-2 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{`${it.name} ×${it.quantity}`}</div>
                      <div className="text-xs text-gray-400">{it.price} F • {it.quantity} unité{it.quantity > 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold">{(it.price * it.quantity).toLocaleString()} F</div>
                      <button onClick={() => removeItem(i)} className="px-2 py-1 bg-red-500 text-white rounded">Suppr</button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && <p className="text-gray-400">Aucun article ajouté</p>}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-gray-400">Total</div>
                <div className="text-white font-bold">{total.toLocaleString()} F</div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Client et infos</h2>

              <div className="mb-3">
                <label className="block text-sm text-gray-400 mb-2">Type de commande</label>
                <select 
                  value={orderType} 
                  onChange={(e) => setOrderType(e.target.value as 'dine-in' | 'takeaway' | 'delivery')}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="dine-in">Sur place</option>
                  <option value="takeaway">À emporter</option>
                  <option value="delivery">À livrer</option>
                </select>
              </div>

              <input placeholder="Nom client (optionnel)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2" />
              {orderType === 'dine-in' && <input placeholder="Table (optionnel)" value={table} onChange={(e) => setTable(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2" />}
              <input placeholder="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2" />
              <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white mb-2" rows={3} />

              <button onClick={createOrder} className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg">Créer commande</button>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Saisie rapide & aperçu</h2>
              <div className="text-sm text-gray-400">Mise à jour automatique</div>
            </div>

            {loading ? (
              <div className="text-gray-400">Chargement...</div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 6).map((o) => (
                  <div key={o.id} className="bg-gray-900/30 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{o.userName || 'Client'} • {o.table || o.type || ''}</div>
                      <div className="text-xs text-gray-400">{o.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-bold">{o.total?.toLocaleString()} F</div>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && <p className="text-gray-400">Aucune commande</p>}
              </div>
            )}
          </div>
        </>
      )}

      {currentTab === 'online' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Commandes en ligne à valider</h2>
            <div className="text-sm text-gray-400">Mise à jour automatique</div>
          </div>

          {loading ? (
            <div className="text-gray-400">Chargement...</div>
          ) : (
            <div className="space-y-3">
              {onlineOrders.map((o) => (
                <div key={o.id} className="bg-gray-900/30 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{o.userName || 'Client'} • {o.type}</div>
                    <div className="text-xs text-gray-400">{o.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-bold">{o.total?.toLocaleString()} F</div>
                    <div className="flex gap-1">
                      {o.status === 'pending' && <button onClick={() => updateStatus(o.id, 'preparing')} className="px-2 py-1 bg-yellow-500 rounded">Accepter</button>}
                      {o.status === 'preparing' && <button onClick={() => updateStatus(o.id, 'ready')} className="px-2 py-1 bg-blue-500 rounded">Prête</button>}
                      {o.status === 'ready' && <button onClick={() => updateStatus(o.id, 'delivered')} className="px-2 py-1 bg-purple-500 rounded">Livrée</button>}
                      {o.status !== 'cancelled' && <button onClick={() => updateStatus(o.id, 'cancelled')} className="px-2 py-1 bg-red-500 rounded">Annuler</button>}
                    </div>
                  </div>
                </div>
              ))}

              {onlineOrders.length === 0 && <p className="text-gray-400">Aucune commande en ligne</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
