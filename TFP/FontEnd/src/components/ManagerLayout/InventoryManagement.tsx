import { useState } from 'react';

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
  category: string;
  supplier: string;
  supplierPhone?: string;
  supplierEmail?: string;
  lastRestocked?: string;
  price: number;
}

interface Delivery {
  id: number;
  supplier: string;
  date: string;
  items: string;
  status: 'Livrée' | 'En attente' | 'En transit';
  trackingNumber?: string;
}

export const InventoryManagement = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { 
      id: 1, 
      name: 'Tomates', 
      quantity: 5, 
      unit: 'kg', 
      threshold: 10, 
      category: 'Légumes', 
      supplier: 'Ferme Bio Dakar',
      supplierPhone: '77 123 45 67',
      supplierEmail: 'contact@fermebio.sn',
      lastRestocked: '2025-11-05',
      price: 500
    },
    { 
      id: 2, 
      name: 'Mozzarella', 
      quantity: 15, 
      unit: 'kg', 
      threshold: 5, 
      category: 'Produits laitiers', 
      supplier: 'Laiterie du Sahel',
      supplierPhone: '77 234 56 78',
      supplierEmail: 'commande@laiterie.sn',
      lastRestocked: '2025-11-08',
      price: 3500
    },
    { 
      id: 3, 
      name: 'Farine', 
      quantity: 50, 
      unit: 'kg', 
      threshold: 20, 
      category: 'Épicerie', 
      supplier: 'Moulins du Sénégal',
      supplierPhone: '77 345 67 89',
      supplierEmail: 'vente@moulins.sn',
      lastRestocked: '2025-11-07',
      price: 450
    },
    { 
      id: 4, 
      name: 'Poulet', 
      quantity: 3, 
      unit: 'kg', 
      threshold: 8, 
      category: 'Viandes', 
      supplier: 'Boucherie Centrale',
      supplierPhone: '77 456 78 90',
      supplierEmail: 'boucherie@central.sn',
      lastRestocked: '2025-11-09',
      price: 2500
    },
    { 
      id: 5, 
      name: 'Huile d\'olive', 
      quantity: 8, 
      unit: 'L', 
      threshold: 5, 
      category: 'Épicerie', 
      supplier: 'Huiles Premium',
      supplierPhone: '77 567 89 01',
      supplierEmail: 'info@huilespremium.sn',
      lastRestocked: '2025-11-06',
      price: 4500
    },
    { 
      id: 6, 
      name: 'Basilic', 
      quantity: 2, 
      unit: 'botte', 
      threshold: 5, 
      category: 'Herbes', 
      supplier: 'Ferme Bio Dakar',
      supplierPhone: '77 123 45 67',
      supplierEmail: 'contact@fermebio.sn',
      lastRestocked: '2025-11-04',
      price: 200
    },
    { 
      id: 7, 
      name: 'Riz Brisé', 
      quantity: 80, 
      unit: 'kg', 
      threshold: 30, 
      category: 'Épicerie', 
      supplier: 'Importation Générale',
      supplierPhone: '77 678 90 12',
      supplierEmail: 'commande@import.sn',
      lastRestocked: '2025-11-08',
      price: 350
    },
    { 
      id: 8, 
      name: 'Poisson frais', 
      quantity: 4, 
      unit: 'kg', 
      threshold: 10, 
      category: 'Poissons', 
      supplier: 'Marché aux Poissons',
      supplierPhone: '77 789 01 23',
      supplierEmail: 'poisson@marche.sn',
      lastRestocked: '2025-11-10',
      price: 3000
    }
  ]);

  const [deliveries, setDeliveries] = useState<Delivery[]>([
    { 
      id: 1, 
      supplier: 'Ferme Bio Dakar', 
      date: '2025-11-12', 
      items: 'Tomates (20kg), Basilic (10 bottes)', 
      status: 'En attente',
      trackingNumber: 'LIV2025-001'
    },
    { 
      id: 2, 
      supplier: 'Laiterie du Sahel', 
      date: '2025-11-11', 
      items: 'Mozzarella (30kg)', 
      status: 'En transit',
      trackingNumber: 'LIV2025-002'
    },
    { 
      id: 3, 
      supplier: 'Boucherie Centrale', 
      date: '2025-11-09', 
      items: 'Poulet (15kg)', 
      status: 'Livrée',
      trackingNumber: 'LIV2025-003'
    }
  ]);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = ['all', 'Légumes', 'Viandes', 'Poissons', 'Produits laitiers', 'Épicerie', 'Herbes'];
  const lowStockItems = inventory.filter(item => item.quantity <= item.threshold);

  const filteredInventory = filterCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.category === filterCategory);

  const handleAdjustStock = (id: number, newQuantity: number) => {
    setInventory(inventory.map(item => 
      item.id === id ? { ...item, quantity: newQuantity, lastRestocked: new Date().toISOString().split('T')[0] } : item
    ));
  };

  const handleRecordDelivery = (id: number) => {
    setDeliveries(deliveries.map(d => 
      d.id === id ? { ...d, status: 'Livrée' as const } : d
    ));
  };

  const handleSaveEdit = (updatedItem: InventoryItem) => {
    setInventory(inventory.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const handleAddNew = (newItem: Omit<InventoryItem, 'id'>) => {
    const id = Math.max(...inventory.map(i => i.id), 0) + 1;
    setInventory([...inventory, { ...newItem, id }]);
    setShowAddForm(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      setInventory(inventory.filter(item => item.id !== id));
    }
  };

  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion de l'Inventaire</h1>
          <p className="text-gray-400">Suivez vos stocks et gérez vos commandes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowOrderDialog(true)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bon de commande
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un article
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total articles</p>
          <p className="text-2xl font-bold text-white">{inventory.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Stock faible</p>
          <p className="text-2xl font-bold text-orange-400">{lowStockItems.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Livraisons en attente</p>
          <p className="text-2xl font-bold text-blue-400">
            {deliveries.filter(d => d.status !== 'Livrée').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-emerald-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Valeur totale</p>
          <p className="text-2xl font-bold text-emerald-400">{(totalValue / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-orange-400 font-semibold mb-2">
                ⚠️ {lowStockItems.length} article{lowStockItems.length > 1 ? 's' : ''} en stock faible
              </p>
              <div className="space-y-1">
                {lowStockItems.map(item => (
                  <p key={item.id} className="text-sm text-orange-300">
                    • {item.name}: {item.quantity} {item.unit} (seuil: {item.threshold} {item.unit})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filterCategory === cat
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'Toutes catégories' : cat}
            {cat !== 'all' && (
              <span className="ml-2 text-xs opacity-75">
                ({inventory.filter(i => i.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
            <h2 className="text-xl font-bold text-white mb-4">Inventaire actuel</h2>
            <div className="space-y-3">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-900/50 rounded-lg p-4 border ${
                    item.quantity <= item.threshold ? 'border-orange-500/50' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{item.name}</h3>
                        {item.quantity <= item.threshold && (
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded border border-orange-500/30">
                            📉 Stock faible
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{item.category} • {item.supplier}</p>
                      {item.lastRestocked && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dernier réapprovisionnement: {new Date(item.lastRestocked).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${item.quantity <= item.threshold ? 'text-orange-400' : 'text-white'}`}>
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-gray-500">Seuil: {item.threshold} {item.unit}</p>
                      <p className="text-xs text-emerald-400 mt-1">{item.price.toLocaleString()} FCFA/{item.unit}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const qty = prompt(`Ajuster la quantité de ${item.name} (actuel: ${item.quantity} ${item.unit}):`);
                        if (qty && !isNaN(Number(qty))) {
                          handleAdjustStock(item.id, Number(qty));
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all text-sm font-semibold shadow-lg shadow-purple-500/30"
                    >
                      📦 Ajuster stock
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-semibold shadow-lg shadow-blue-500/30"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all text-sm font-semibold shadow-lg shadow-red-500/30"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deliveries */}
        <div className="space-y-4">
          <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
            <h2 className="text-xl font-bold text-white mb-4">Livraisons</h2>
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{delivery.supplier}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      delivery.status === 'Livrée' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : delivery.status === 'En transit'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {delivery.status === 'Livrée' ? '✅' : delivery.status === 'En transit' ? '🚚' : '⏳'} {delivery.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    📅 {new Date(delivery.date).toLocaleDateString('fr-FR')}
                  </p>
                  {delivery.trackingNumber && (
                    <p className="text-xs text-gray-500">Suivi: {delivery.trackingNumber}</p>
                  )}
                  <p className="text-xs text-gray-400">{delivery.items}</p>
                  {delivery.status !== 'Livrée' && (
                    <button
                      onClick={() => handleRecordDelivery(delivery.id)}
                      className="w-full px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-semibold mt-2"
                    >
                      ✓ Enregistrer réception
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingItem ? 'Modifier l\'article' : 'Ajouter un article'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const itemData: Omit<InventoryItem, 'id'> = {
                  name: formData.get('name') as string,
                  quantity: Number(formData.get('quantity')),
                  unit: formData.get('unit') as string,
                  threshold: Number(formData.get('threshold')),
                  category: formData.get('category') as string,
                  supplier: formData.get('supplier') as string,
                  supplierPhone: formData.get('supplierPhone') as string,
                  supplierEmail: formData.get('supplierEmail') as string,
                  price: Number(formData.get('price')),
                  lastRestocked: new Date().toISOString().split('T')[0]
                };

                if (editingItem) {
                  handleSaveEdit({ ...itemData, id: editingItem.id, lastRestocked: editingItem.lastRestocked });
                } else {
                  handleAddNew(itemData);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nom de l'article *</label>
                  <input
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: Tomates"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Catégorie *</label>
                  <select
                    name="category"
                    defaultValue={editingItem?.category}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Légumes">Légumes</option>
                    <option value="Viandes">Viandes</option>
                    <option value="Poissons">Poissons</option>
                    <option value="Produits laitiers">Produits laitiers</option>
                    <option value="Épicerie">Épicerie</option>
                    <option value="Herbes">Herbes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Quantité *</label>
                  <input
                    name="quantity"
                    type="number"
                    defaultValue={editingItem?.quantity}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Unité *</label>
                  <input
                    name="unit"
                    defaultValue={editingItem?.unit}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="kg, L, unité..."
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Seuil d'alerte *</label>
                  <input
                    name="threshold"
                    type="number"
                    defaultValue={editingItem?.threshold}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Prix unitaire (FCFA) *</label>
                  <input
                    name="price"
                    type="number"
                    defaultValue={editingItem?.price}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="text-white font-semibold">Informations fournisseur</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Nom du fournisseur *</label>
                    <input
                      name="supplier"
                      defaultValue={editingItem?.supplier}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ferme Bio Dakar"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Téléphone</label>
                      <input
                        name="supplierPhone"
                        type="tel"
                        defaultValue={editingItem?.supplierPhone}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="77 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email</label>
                      <input
                        name="supplierEmail"
                        type="email"
                        defaultValue={editingItem?.supplierEmail}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="contact@fournisseur.sn"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                >
                  {editingItem ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddForm(false);
                  }}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Dialog */}
      {showOrderDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Générer un bon de commande</h2>
            
            {lowStockItems.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun article en stock faible</p>
            ) : (
              <>
                <p className="text-gray-400 mb-4">Articles à commander ({lowStockItems.length}):</p>
                <div className="space-y-3 mb-6">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-semibold">{item.name}</p>
                          <p className="text-sm text-gray-400">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-400 font-semibold">{item.quantity} {item.unit}</p>
                          <p className="text-xs text-gray-500">Seuil: {item.threshold} {item.unit}</p>
                        </div>
                      </div>
                      <div className="bg-gray-800 rounded p-3 mt-2">
                        <p className="text-sm text-gray-300 mb-1">📦 Fournisseur: {item.supplier}</p>
                        {item.supplierPhone && (
                          <p className="text-sm text-gray-400">📞 {item.supplierPhone}</p>
                        )}
                        {item.supplierEmail && (
                          <p className="text-sm text-gray-400">✉️ {item.supplierEmail}</p>
                        )}
                        <p className="text-sm text-emerald-400 mt-2">
                          💰 Prix: {item.price.toLocaleString()} FCFA/{item.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
                  <p className="text-emerald-400 text-sm">
                    💡 Un bon de commande sera généré et peut être envoyé par email aux fournisseurs
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      alert('Bon de commande généré avec succès ! Les fournisseurs seront contactés.');
                      setShowOrderDialog(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                  >
                    📄 Générer et envoyer
                  </button>
                  <button
                    onClick={() => setShowOrderDialog(false)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Annuler
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
