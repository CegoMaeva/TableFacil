import { useState } from 'react';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  allergens: string;
  image: string;
  available: boolean;
}

export const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: 1,
      name: 'Poulet Rôti aux Herbes',
      category: 'Plats de résistance',
      price: 2500,
      description: 'Poulet fermier mariné aux herbes de Provence, accompagné de légumes grillés',
      allergens: 'Gluten',
      image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
      available: true
    },
    {
      id: 2,
      name: 'Salade César Fraîcheur',
      category: 'Entrées',
      price: 1800,
      description: 'Laitue croquante, croûtons maison, parmesan et sauce César',
      allergens: 'Œufs, Produits laitiers',
      image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
      available: true
    },
    {
      id: 3,
      name: 'Steak de Bœuf Grillé',
      category: 'Plats de résistance',
      price: 3500,
      description: 'Steak de bœuf 250g, frites maison et sauce au poivre',
      allergens: 'Produits laitiers',
      image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800',
      available: true
    },
    {
      id: 4,
      name: 'Tiramisu Maison',
      category: 'Desserts',
      price: 1500,
      description: 'Dessert italien traditionnel au café et mascarpone',
      allergens: 'Œufs, Gluten, Produits laitiers',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
      available: true
    },
    {
      id: 5,
      name: 'Saumon Grillé',
      category: 'Plats de résistance',
      price: 4000,
      description: 'Filet de saumon, légumes vapeur et sauce citron',
      allergens: 'Poisson',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      available: false
    },
    {
      id: 6,
      name: 'Jus d\'Orange Pressé',
      category: 'Boissons',
      price: 800,
      description: 'Jus d\'orange frais pressé à la minute',
      allergens: 'Aucun',
      image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800',
      available: true
    }
  ]);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = ['all', 'Entrées', 'Plats de résistance', 'Desserts', 'Boissons', 'Snacks'];
  const filteredItems = filterCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === filterCategory);

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) {
      setMenuItems(menuItems.filter(item => item.id !== id));
    }
  };

  const handleToggleAvailability = (id: number) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  const handleSaveEdit = (updatedItem: MenuItem) => {
    setMenuItems(menuItems.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  };

  const handleAddNew = (newItem: Omit<MenuItem, 'id'>) => {
    const id = Math.max(...menuItems.map(i => i.id), 0) + 1;
    setMenuItems([...menuItems, { ...newItem, id }]);
    setShowAddForm(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Menu & Plats</h1>
          <p className="text-gray-400">Gérez les plats de votre restaurant</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un plat
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total plats</p>
          <p className="text-2xl font-bold text-white">{menuItems.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-400">{menuItems.filter(i => i.available).length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Indisponibles</p>
          <p className="text-2xl font-bold text-red-400">{menuItems.filter(i => !i.available).length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Prix moyen</p>
          <p className="text-2xl font-bold text-white">
            {(menuItems.reduce((acc, item) => acc + item.price, 0) / menuItems.length).toFixed(0)} FCFA
          </p>
        </div>
      </div>

      {/* Filters */}
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
            {cat === 'all' ? 'Tous' : cat}
            {cat !== 'all' && (
              <span className="ml-2 text-xs opacity-75">
                ({menuItems.filter(i => i.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingItem) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingItem ? 'Modifier le plat' : 'Ajouter un nouveau plat'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const itemData = {
                  name: formData.get('name') as string,
                  category: formData.get('category') as string,
                  price: Number(formData.get('price')),
                  description: formData.get('description') as string,
                  allergens: formData.get('allergens') as string,
                  image: formData.get('image') as string,
                  available: formData.get('available') === 'on'
                };
                
                if (editingItem) {
                  handleSaveEdit({ ...itemData, id: editingItem.id });
                } else {
                  handleAddNew(itemData);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nom du plat *</label>
                  <input
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
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
                    <option value="Entrées">Entrées</option>
                    <option value="Plats de résistance">Plats de résistance</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Snacks">Snacks</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description *</label>
                <textarea
                  name="description"
                  defaultValue={editingItem?.description}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Prix (FCFA) *</label>
                  <input
                    name="price"
                    type="number"
                    defaultValue={editingItem?.price}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Allergènes</label>
                  <input
                    name="allergens"
                    defaultValue={editingItem?.allergens}
                    placeholder="Gluten, Œufs..."
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">URL de l'image</label>
                <input
                  name="image"
                  type="url"
                  defaultValue={editingItem?.image}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="available"
                  id="available"
                  defaultChecked={editingItem?.available ?? true}
                  className="w-5 h-5 text-emerald-500 bg-gray-900 border-gray-700 rounded focus:ring-emerald-500"
                />
                <label htmlFor="available" className="text-gray-300">
                  Plat disponible à la vente
                </label>
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

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-gray-800/50 backdrop-blur-lg border rounded-xl overflow-hidden transition-all hover:shadow-xl ${
              item.available ? 'border-gray-700' : 'border-red-500/30 opacity-75'
            }`}
          >
            <div className="relative h-48">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
              <span className="absolute top-3 left-3 px-3 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold rounded-lg">
                {item.price} FCFA
              </span>
              {!item.available && (
                <span className="absolute top-3 right-3 px-3 py-1 bg-red-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-lg">
                  Indisponible
                </span>
              )}
            </div>
            
            <div className="p-4">
              <span className="text-emerald-400 text-xs font-semibold mb-1 block">
                {item.category}
              </span>
              <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
              <p className="text-gray-500 text-xs mb-4">
                Allergènes: {item.allergens || 'Aucun'}
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={() => handleToggleAvailability(item.id)}
                  className={`px-3 py-2 rounded-lg transition-all text-sm font-semibold shadow-lg ${
                    item.available
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/30'
                  }`}
                  title={item.available ? 'Marquer indisponible' : 'Marquer disponible'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all text-sm font-semibold shadow-lg shadow-red-500/30"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Aucun plat dans cette catégorie</p>
        </div>
      )}
    </div>
  );
};
