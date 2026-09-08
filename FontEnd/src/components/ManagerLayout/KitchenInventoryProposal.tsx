import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity?: number;
  price: number;
  supplier: string;
  code?: string;
}

export const KitchenInventoryProposal = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryItems, setCategoryItems] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    itemId: '',
    itemName: '',
    productCode: '',
    category: '',
    quantity: 1,
    unit: '',
    currentStock: 0,
    minThreshold: 5,
    type: 'inventory_entry',
    notes: ''
  });
  
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadCategories();
    loadRequests();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryItems(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadCategoryItems = async (category: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/inventory/by-category/${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategoryItems(data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (stock: number, threshold: number) => {
    if (stock <= 0) return 'Rupture';
    if (stock <= threshold) return 'Stock faible';
    return 'Stock OK';
  };

  const handleSelectItem = (item: InventoryItem) => {
    setFormData({
      ...formData,
      itemId: item.id,
      itemName: item.name,
      productCode: item.code || formData.productCode,
      category: item.category,
      unit: item.unit,
      currentStock: item.quantity,
      minThreshold: item.minQuantity ?? formData.minThreshold,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(String(formData.quantity)) || 0;
    const hasItem = Boolean(formData.itemId || formData.itemName.trim());
    if (!hasItem || quantity <= 0) {
      toast.error('Renseignez un article (sélection ou nom) et une quantité valide');
      return;
    }

    // Calcul du stock résultant selon le type de mouvement
    const delta = formData.type === 'inventory_entry' ? quantity : formData.type === 'inventory_exit' ? -quantity : 0;
    const resultingStock = (formData.currentStock || 0) + delta;
    if (resultingStock < 0) {
      toast.error('Le stock ne peut pas devenir négatif');
      return;
    }

    const status = getStatus(resultingStock, formData.minThreshold || 0);
    const movementDate = new Date().toISOString();
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    })();
    const responsible = user?.name || user?.email || 'Cuisinier';

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/inventory-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          movementDate,
          resultingStock,
          status,
          responsible,
        })
      });

      if (response.ok) {
        toast.success('Demande envoyée au gérant pour validation');
        setHistory(prev => ([
          {
            id: crypto.randomUUID(),
            itemName: formData.itemName,
            itemId: formData.itemId,
            type: formData.type,
            quantity,
            unit: formData.unit,
            resultingStock,
            status,
            movementDate,
            responsible,
          },
          ...prev,
        ]));
        setFormData({
          itemId: '',
          itemName: '',
          productCode: '',
          category: '',
          quantity: 1,
          unit: '',
          currentStock: 0,
          minThreshold: 5,
          type: 'inventory_entry',
          notes: ''
        });
        setView('list');
        loadRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const filteredItems = categoryItems.filter(item =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
            </svg>
            Demandes d'Inventaire
          </h2>
          <p className="text-gray-400 mt-1">Proposer des entrées ou achats d'articles</p>
        </div>
        <button
          onClick={() => setView(view === 'list' ? 'create' : 'list')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          {view === 'list' ? '+ Nouvelle demande' : '← Retour'}
        </button>
      </div>

      {view === 'create' ? (
        // Formulaire de création + historique local
        <>
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-gray-300 font-medium mb-3">Catégorie *</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Sélectionner une catégorie --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {selectedCategory && (
            <>
              {/* Filtre de recherche */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">Rechercher un article</label>
                <input
                  type="text"
                  placeholder="Tapez pour filtrer..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Liste des articles */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`p-4 rounded-lg border cursor-pointer transition ${
                        formData.itemId === item.id
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-gray-900/40 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-sm text-gray-400">
                            Stock actuel: {item.quantity} {item.unit}
                            {item.quantity < item.minQuantity && (
                              <span className="ml-2 text-red-400">⚠️ Stock bas</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-300">{item.price.toLocaleString()} FCFA/{item.unit}</p>
                          <p className="text-xs text-gray-500">{item.supplier}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">Aucun article trouvé</p>
                )}
              </div>

              {/* Article sélectionné */}
              {formData.itemId && (
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
                  <p className="text-green-400">✓ Article sélectionné: <strong>{formData.itemName}</strong></p>
                </div>
              )}
            </>
          )}

          {/* Identification du produit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Code / Référence</label>
              <input
                type="text"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="Ex: PRD-POULET-001"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Unité de mesure</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, L, pièces..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Stock et seuil */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Stock actuel</label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Seuil minimum (alerte)</label>
              <input
                type="number"
                min="0"
                value={formData.minThreshold}
                onChange={(e) => setFormData({ ...formData, minThreshold: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Statut automatique</label>
              <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                {getStatus(formData.currentStock, formData.minThreshold)}
              </div>
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Quantité demandée *</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setFormData({ ...formData, quantity: Math.max(1, val) });
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Nom d'article (saisie libre si aucun article sélectionné) */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Nom de l'article (si non listé)</label>
            <input
              type="text"
              placeholder="Ex: Tomates cerises"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type de demande */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Type de demande</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="inventory_entry"
                  checked={formData.type === 'inventory_entry'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">Entrée d'inventaire (réception marchandise)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="inventory_exit"
                  checked={formData.type === 'inventory_exit'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">Sortie (utilisation en cuisine)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="purchase_request"
                  checked={formData.type === 'purchase_request'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">Demande de commande (article à acheter)</span>
              </label>
            </div>
          </div>

          {/* Prévisualisation du stock après mouvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Stock après mouvement</label>
              <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white">
                {(() => {
                  const qty = parseInt(String(formData.quantity)) || 0;
                  const delta = formData.type === 'inventory_entry' ? qty : formData.type === 'inventory_exit' ? -qty : 0;
                  const result = (formData.currentStock || 0) + delta;
                  return `${Math.max(0, result)} ${formData.unit || ''}`.trim();
                })()}
              </div>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Statut projeté</label>
              <div className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white">
                {(() => {
                  const qty = parseInt(String(formData.quantity)) || 0;
                  const delta = formData.type === 'inventory_entry' ? qty : formData.type === 'inventory_exit' ? -qty : 0;
                  const result = (formData.currentStock || 0) + delta;
                  return getStatus(Math.max(0, result), formData.minThreshold || 0);
                })()}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Stock critique pour le service du midi..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 h-20 resize-none"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={(!formData.itemId && !formData.itemName.trim()) || !formData.quantity || parseInt(String(formData.quantity)) <= 0}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              Envoyer la demande
            </button>
            <button
              onClick={() => {
                setView('list');
                setFormData({
                  itemId: '',
                  itemName: '',
                  productCode: '',
                  category: '',
                  quantity: 1,
                  unit: '',
                  currentStock: 0,
                  minThreshold: 5,
                  type: 'inventory_entry',
                  notes: '',
                });
                setSelectedCategory('');
                setSearchFilter('');
              }}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
            >
              Annuler
            </button>
          </div>
        </div>

        {/* Historique local des mouvements (session) */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Historique récent</h3>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex justify-between items-start"
                >
                  <div>
                    <p className="text-white font-medium">{h.itemName || 'Article'}</p>
                    <p className="text-sm text-gray-400">
                      {h.type === 'inventory_entry'
                        ? '+ Entrée'
                        : h.type === 'inventory_exit'
                        ? '- Sortie'
                        : 'Demande'}
                      {' '}•{' '}
                      {h.quantity} {h.unit || ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(h.movementDate).toLocaleString('fr-FR')} • {h.responsible}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Stock: {h.resultingStock}</span>
                    <div className="text-xs text-gray-400 mt-1">{h.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      ) : (
        // Liste des demandes
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : requests.length > 0 ? (
            requests.map((req) => (
              <div key={req.id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">{req.itemName}</p>
                    <p className="text-sm text-gray-400">
                      {req.quantity} {req.unit} • {req.category}
                    </p>
                    {req.notes && <p className="text-sm text-gray-500 mt-1">Note: {req.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">{req.type === 'inventory_entry' ? '📦 Entrée' : '🛒 Commande'}</p>
                    <span className="px-3 py-1 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs rounded font-medium">
                      En attente
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">Aucune demande en attente</p>
          )}
        </div>
      )}
    </div>
  );
};
