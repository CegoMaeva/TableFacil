import { useState, useEffect } from 'react';

interface Recipe {
  id: string;
  name: string;
  price: string;
  category: string;
  description: string;
  allergens: string;
  image: string;
  section: 'specials' | 'entrees' | 'plats' | 'boissons' | 'desserts';
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE_URL = 'http://127.0.0.1:5000';

export const RecipeManagement = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    allergens: 'Sans allergènes',
    image: '',
    section: 'plats' as Recipe['section'],
    available: true
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/recipes`);
      
      if (!response.ok) {
        throw new Error('Error loading recipes');
      }
      
      const data = await response.json();
      setRecipes(data);
      // Charger les avis et calculer les moyennes par recette
      try {
        const resp = await fetch(`${API_BASE_URL}/api/reviews`);
        if (resp.ok) {
          const reviews = await resp.json();
          const map: Record<string, { total: number; count: number }> = {};
          reviews.forEach((r: any) => {
            const rid = r.recipeId;
            if (!rid) return;
            if (!map[rid]) map[rid] = { total: 0, count: 0 };
            map[rid].total += Number(r.rating || 0);
            map[rid].count += 1;
          });
          const computed: Record<string, { avg: number; count: number }> = {};
          Object.keys(map).forEach(k => {
            const entry = map[k];
            computed[k] = { avg: Math.round((entry.total / entry.count) * 10) / 10, count: entry.count };
          });
          setRatingsMap(computed);
        }
          } catch (err) {
        console.warn('Unable to load reviews:', err);
      }
    } catch (err: any) {
      console.error('Error loading:', err);
      setError(err.message || 'Error loading recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Vous devez être connecté');
      return;
    }

    try {
      const url = editingRecipe 
        ? `${API_BASE_URL}/api/recipes/${editingRecipe.id}`
        : `${API_BASE_URL}/api/recipes`;
      
      const method = editingRecipe ? 'PUT' : 'POST';
      
      console.log(`${method} ${url}`, formData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur réponse:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      console.log('Succès:', result);
      
      await loadRecipes();
      handleCloseForm();
      setSuccess(editingRecipe ? 'Recipe updated successfully!' : 'Recipe added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Vous devez être connecté');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      await loadRecipes();
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (recipe: Recipe) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Vous devez être connecté');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes/${recipe.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      await loadRecipes();
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      price: recipe.price,
      category: recipe.category,
      description: recipe.description,
      allergens: recipe.allergens,
      image: recipe.image,
      section: recipe.section,
      available: recipe.available
    });
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingRecipe(null);
    setFormData({
      name: '',
      price: '',
      category: '',
      description: '',
      allergens: 'Sans allergènes',
      image: '',
      section: 'plats',
      available: true
    });
  };

  const handleAddNew = () => {
    setEditingRecipe(null);
    setFormData({
      name: '',
      price: '',
      category: '',
      description: '',
      allergens: 'Sans allergènes',
      image: '',
      section: 'plats',
      available: true
    });
    setShowAddForm(true);
  };

  const sectionLabels: Record<string, string> = {
    specials: 'Menu de la semaine',
    entrees: 'Entrées',
    plats: 'Plats de résistance',
    boissons: 'Boissons',
    desserts: 'Desserts'
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSection = filterSection === 'all' || recipe.section === filterSection;
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion du Menu</h1>
          <p className="text-gray-400">Gérez les recettes et plats de votre restaurant</p>
        </div>
        <button
          onClick={handleAddNew}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une recette
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Toutes les sections</option>
          {Object.entries(sectionLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total recettes</div>
          <div className="text-2xl font-bold text-white">{recipes.length}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Disponibles</div>
          <div className="text-2xl font-bold text-emerald-500">
            {recipes.filter(r => r.available).length}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Indisponibles</div>
          <div className="text-2xl font-bold text-red-500">
            {recipes.filter(r => !r.available).length}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Résultats filtrés</div>
          <div className="text-2xl font-bold text-white">{filteredRecipes.length}</div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecipes.map(recipe => (
          <div
            key={recipe.id}
            className={`bg-gray-800 border rounded-lg overflow-hidden transition-all ${
              recipe.available 
                ? 'border-gray-700 hover:border-emerald-500' 
                : 'border-red-500/30 opacity-60'
            }`}
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              {recipe.image ? (
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded">
                {recipe.price}
              </div>
              <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/90 text-white text-xs font-semibold rounded">
                {sectionLabels[recipe.section]}
              </div>
              {!recipe.available && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">INDISPONIBLE</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="text-emerald-400 text-xs font-semibold mb-1">{recipe.category}</div>
              <h3 className="text-white font-bold text-lg mb-2">{recipe.name}</h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{recipe.description}</p>
              <p className="text-gray-500 text-xs mb-3">{recipe.allergens}</p>
              {/* Rating display */}
              {(() => {
                const r = ratingsMap[recipe.id];
                const avg = r ? r.avg : 0;
                const count = r ? r.count : 0;
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={`text-sm ${i <= Math.round(avg) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-300">{avg > 0 ? `${avg} (${count})` : 'Pas encore noté'}</span>
                  </div>
                );
              })()}
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(recipe)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleToggleAvailability(recipe)}
                  className={`flex-1 px-3 py-2 text-white text-sm rounded transition-colors ${
                    recipe.available 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {recipe.available ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">Aucune recette trouvée</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 z-10 px-6 pt-6 pb-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {editingRecipe ? 'Modifier la recette' : 'Ajouter une recette'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom du plat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prix *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2500 FCFA"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Catégorie *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Viande, Poisson..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Section du menu *
                  </label>
                  <select
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value as Recipe['section'] })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    {Object.entries(sectionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Allergènes
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gluten, Œufs, Produits laitiers"
                  value={formData.allergens}
                  onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL de l'image
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
                {formData.image && (
                  <div className="mt-2">
                    <img src={formData.image} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-300">
                  Disponible au menu
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                >
                  {editingRecipe ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
