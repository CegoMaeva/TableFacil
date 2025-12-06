import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { MainContent } from '../../sections/MainContent';
import { ContactForm } from '../../sections/ReservationSection/components/ContactForm';
import { toast } from 'sonner';
import { getReviews, postReview, TokenManager, updateProfile, uploadProfilePhoto } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PayPalPayment } from '../Payment/PayPalPayment';
import { CardPayment } from '../Payment/CardPayment';
import { ReservationsClient } from './ReservationsClient';
import { LoyaltyClient } from './LoyaltyClient';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MenuSection } from '../../sections/MenuSection';
import { FeaturesSection } from '../../sections/FeaturesSection';
import { StatsSection } from '../../sections/StatsSection';
import { Footer } from '../../sections/Footer';
import { PublicHome } from '../../sections/PublicHome';

interface Recipe {
  id: string;
  name: string;
  price: string;
  category: string;
  description: string;
  allergens: string;
  image: string;
  section: string;
  available: boolean;
}

interface CartItem {
  recipe: Recipe;
  quantity: number;
}

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
  type: string;
  table?: string;
  address?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface ClientLayoutProps {
  user: User;
  onLogout: () => void;
}

const API_BASE_URL = 'http://127.0.0.1:5000';

const statusMapping: Record<string, { label: string; color: string }> = {
  'pending': { label: 'En attente', color: 'yellow' },
  'preparing': { label: 'En préparation', color: 'yellow' },
  'ready': { label: 'Prête', color: 'blue' },
  'served': { label: 'Servie', color: 'emerald' },
  'delivered': { label: 'Livrée', color: 'emerald' },
  'cancelled': { label: 'Annulée', color: 'red' }
};

export const ClientLayout = ({ user, onLogout }: ClientLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extraire la page actuelle depuis l'URL (/client/menu -> 'menu')
  const getCurrentPage = () => {
    const path = location.pathname.split('/').pop() || 'menu';
    return path;
  };
  const currentPage = getCurrentPage();
  
  const [showNewReservationForm, setShowNewReservationForm] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  // Ratings state: map recipeId -> { avg, count }
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [selectedRatingValue, setSelectedRatingValue] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | null>(null);

  // Profile edit state (syncs with AuthContext)
  const { user: authUser, login: authLogin } = useAuth();
  const [profileName, setProfileName] = useState<string>(authUser?.name || '');
  // split name into first/last if available
  const initialFirst = (authUser as any)?.first_name || (authUser?.name ? authUser.name.split(' ')[0] : '');
  const initialLast = (authUser as any)?.last_name || (authUser?.name ? authUser.name.split(' ').slice(1).join(' ') : '');
  const [profileFirstName, setProfileFirstName] = useState<string>(initialFirst);
  const [profileLastName, setProfileLastName] = useState<string>(initialLast);
  const [profileEmail, setProfileEmail] = useState<string>(authUser?.email || '');
  const [profilePhone, setProfilePhone] = useState<string>((authUser as any)?.phone || '');
  const [profileAddress, setProfileAddress] = useState<string>((authUser as any)?.address || '');
  const [profileOther, setProfileOther] = useState<string>((authUser as any)?.other_details || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>((authUser as any)?.profile_photo || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Load recipes when component mounts or when switching to menu page
  useEffect(() => {
    if (currentPage === 'menu') {
      loadRecipes();
    }
    if (currentPage === 'commandes') {
      loadOrders();
      // Rafraîchir toutes les 10 secondes
      const interval = setInterval(loadOrders, 10000);
      return () => clearInterval(interval);
    }
    if (currentPage === 'avis') {
      loadRestaurantReviews();
    }
  }, [location.pathname]);

  // Restaurant reviews state
  const [restaurantReviews, setRestaurantReviews] = useState<any[]>([]);
  const [restaurantStats, setRestaurantStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [newRestaurantRating, setNewRestaurantRating] = useState<number | null>(null);
  const [newRestaurantComment, setNewRestaurantComment] = useState<string>('');

  const loadRestaurantReviews = async () => {
    try {
      const reviews = await getReviews();
      // Filter reviews that are not tied to a recipe (restaurant-level)
      const rest = reviews.filter(r => !r.recipeId);
      setRestaurantReviews(rest);
      if (rest.length === 0) {
        setRestaurantStats({ avg: 0, count: 0 });
      } else {
        const total = rest.reduce((s, r) => s + Number(r.rating || 0), 0);
        const avg = Math.round((total / rest.length) * 10) / 10;
        setRestaurantStats({ avg, count: rest.length });
      }
    } catch (err) {
      console.error('Impossible de charger les avis du restaurant', err);
    }
  };

  const submitRestaurantReview = async () => {
    try {
      if (!newRestaurantRating || newRestaurantRating < 1) {
        toast.error('Veuillez sélectionner une note');
        return;
      }
      const payload = {
        rating: newRestaurantRating,
        comment: newRestaurantComment || ''
      };
      const created = await postReview(payload);
      toast.success('Merci pour votre avis');
      // Update local list
      setRestaurantReviews(prev => [created, ...prev]);
      const total = restaurantReviews.reduce((s, r) => s + Number(r.rating || 0), 0) + created.rating;
      const count = restaurantReviews.length + 1;
      setRestaurantStats({ avg: Math.round((total / count) * 10) / 10, count });
      // reset
      setNewRestaurantRating(null);
      setNewRestaurantComment('');
    } catch (err: any) {
      console.error('Erreur publication avis restaurant', err);
      toast.error(err.message || 'Impossible de publier l\'avis');
    }
  };

  // Sync profile inputs when auth user changes
  useEffect(() => {
    setProfileName(authUser?.name || '');
    setProfileFirstName((authUser as any)?.first_name || (authUser?.name ? authUser.name.split(' ')[0] : ''));
    setProfileLastName((authUser as any)?.last_name || (authUser?.name ? authUser.name.split(' ').slice(1).join(' ') : ''));
    setProfileEmail(authUser?.email || '');
    setProfilePhone((authUser as any)?.phone || '');
    setProfileAddress((authUser as any)?.address || '');
    setProfileOther((authUser as any)?.other_details || '');
    setProfilePhotoUrl((authUser as any)?.profile_photo || '');
  }, [authUser]);

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const payload: Record<string, any> = {
        name: `${profileFirstName} ${profileLastName}`.trim(),
        first_name: profileFirstName,
        last_name: profileLastName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress,
        other_details: profileOther
      };
      if (profilePhotoUrl) payload.profile_photo = profilePhotoUrl;

      const updated = await updateProfile(payload);
      // Update context and local storage
      authLogin(updated);
      TokenManager.setUser(updated);
      toast.success('Profil mis à jour');
    } catch (err: any) {
      console.error('Erreur mise à jour profil', err);
      toast.error(err.message || 'Impossible de mettre à jour le profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (file?: File) => {
    if (!file) return;
    try {
      const url = await uploadProfilePhoto(file);
      setProfilePhotoUrl(url);
      toast.success('Photo téléchargée');
    } catch (err: any) {
      console.error('Erreur upload avatar', err);
      toast.error(err.message || 'Impossible de téléverser la photo');
    }
  };

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/recipes?available=true`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du menu');
      }
      
      const data = await response.json();
      setRecipes(data);
      // Charger aussi les avis et calculer les moyennes
      try {
        const reviews = await getReviews();
        const map: Record<string, { total: number; count: number }> = {};
        reviews.forEach(r => {
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
      } catch (err) {
        console.warn('Impossible de charger les avis:', err);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group recipes by section
  const getRecipesBySection = (section: string) => {
    return recipes.filter(recipe => recipe.section === section && recipe.available);
  };

  // Extract price number from string like "3500 FCFA"
  const getPriceNumber = (priceString: string): number => {
    const match = priceString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Cart functions
  const addToCart = (recipe: Recipe, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.recipe.id === recipe.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.recipe.id === recipe.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { recipe, quantity }];
    });
    toast.success(`${recipe.name} ajouté au panier`);
    setShowRecipeModal(false);
  };

  // Submit a review for a recipe
  const submitReview = async (recipeId: string) => {
    try {
      if (!selectedRatingValue || selectedRatingValue < 1) {
        toast.error('Veuillez sélectionner une note entre 1 et 5');
        return;
      }

      const token = TokenManager.getToken();
      if (!token) {
        toast.error('Vous devez être connecté pour laisser un avis');
        return;
      }

      const payload = {
        rating: selectedRatingValue,
        comment: reviewComment || '',
        recipeId
      };

      const result = await postReview(payload);
      toast.success('Merci pour votre avis !');

      // Mettre à jour localement les moyennes
      setRatingsMap(prev => {
        const prevEntry = prev[recipeId];
        const prevTotal = prevEntry ? prevEntry.avg * prevEntry.count : 0;
        const newCount = (prevEntry ? prevEntry.count : 0) + 1;
        const newAvg = Math.round(((prevTotal + selectedRatingValue) / newCount) * 10) / 10;
        return { ...prev, [recipeId]: { avg: newAvg, count: newCount } };
      });

      // Reset form
      setSelectedRatingValue(null);
      setReviewComment('');
      setShowRecipeModal(false);
      setSelectedRecipe(null);
    } catch (err: any) {
      console.error('Erreur lors de la soumission de l\'avis:', err);
      toast.error(err.message || 'Impossible de publier l\'avis');
    }
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prevCart => prevCart.filter(item => item.recipe.id !== recipeId));
    toast.success('Article retiré du panier');
  };

  const updateCartQuantity = (recipeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(recipeId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.recipe.id === recipeId ? { ...item, quantity } : item
      )
    );
  };

  const getCartTotal = (): number => {
    return cart.reduce((total, item) => {
      return total + (getPriceNumber(item.recipe.price) * item.quantity);
    }, 0);
  };

  const getCartItemCount = (): number => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      // Créer la commande
      const orderItems = cart.map(item => ({
        name: item.recipe.name,
        quantity: item.quantity,
        price: getPriceNumber(item.recipe.price)
      }));

      const orderData = {
        items: orderItems,
        total: getCartTotal(),
        type: 'delivery', // ou 'dine-in', 'takeaway' selon le choix
        paymentMethod: paymentMethod === 'paypal' ? 'paypal' : 'card',
        paymentId: paymentData.id || paymentData.transactionId,
        notes: `Paiement via ${paymentMethod === 'paypal' ? 'PayPal' : 'Carte bancaire'}`
      };

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la commande');
      }

      await response.json();
      toast.success('Commande créée avec succès !');
      
      // Vider le panier
      setCart([]);
      setShowCheckout(false);
      setPaymentMethod(null);
      
      // Recharger les commandes
      if (currentPage === 'commandes') {
        loadOrders();
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création de la commande');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Erreur de paiement:', error);
    toast.error('Erreur lors du paiement. Veuillez réessayer.');
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
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
      setOrders(data);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
      toast.error('Impossible de charger les commandes');
    } finally {
      setOrdersLoading(false);
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
      setIsEditing(false);
      toast.success('Commande mise à jour avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible de mettre à jour la commande');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.')) {
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

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PUT',
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

  // Render a recipe card
  const renderRecipeCard = (item: Recipe) => (
    <div
      key={item.id}
      className="bg-gray-800/90 backdrop-blur-lg border border-gray-700/30 hover:border-emerald-400/60 rounded-2xl overflow-hidden transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/25 shadow-xl h-[450px] flex flex-col flex-shrink-0 w-[320px] cursor-pointer"
      onClick={() => handleRecipeClick(item)}
    >
      <div className="relative h-[250px] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        <span className="absolute top-4 left-4 px-3 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold rounded-lg">
          {item.price}
        </span>
      </div>
        <div className="p-6 flex-1 flex flex-col">
        <span className="text-emerald-400 text-sm font-semibold mb-2">{item.category}</span>
        <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
          {/* Rating display */}
          {(() => {
            const r = ratingsMap[item.id];
            const avg = r ? r.avg : 0;
            const count = r ? r.count : 0;
            return (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className={`text-xl ${i <= Math.round(avg) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm text-gray-300">{avg > 0 ? `${avg} (${count})` : 'Pas encore noté'}</span>
              </div>
            );
          })()}
        <p className="text-gray-400 text-sm mb-3 flex-1 line-clamp-2">{item.description}</p>
        <p className="text-xs text-gray-500 mb-4">{item.allergens}</p>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            addToCart(item, 1);
          }}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Ajouter au panier
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'accueil':
        return <PublicHome />;

      case 'reservations':
        return <ReservationsClient />;

      case 'profil':
        return (
          <div className="min-h-screen bg-gray-900 py-16 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl p-6 mb-6 flex items-center gap-6 border border-gray-700">
                <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                  {(authUser?.name || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">{authUser?.name || 'Utilisateur'}</h2>
                  <p className="text-gray-300">{authUser?.email || 'Email non renseigné'}</p>
                  {(authUser as any)?.phone && <p className="text-gray-300">{(authUser as any).phone}</p>}
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-gray-400">Points fidélité</p>
                  <p className="text-emerald-300 font-bold">{(authUser as any)?.loyalty_points ?? 0}</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Modifier mes informations</h3>
                <p className="text-gray-400 mb-4">Les champs vides peuvent être complétés. Les modifications sont appliquées immédiatement.</p>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                      {profilePhotoUrl ? (
                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                        <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-white text-2xl font-bold">{(authUser?.name || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-gray-300">Photo de profil</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          if (f) handleAvatarChange(f);
                        }}
                        className="mt-1 block w-full text-sm text-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">Types acceptés: jpg, png. Taille max recommandée 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-300">Prénom</label>
                      <input
                        value={profileFirstName}
                        onChange={(e) => setProfileFirstName(e.target.value)}
                        className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2"
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-300">Nom</label>
                      <input
                        value={profileLastName}
                        onChange={(e) => setProfileLastName(e.target.value)}
                        className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2"
                        placeholder="Nom"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Email</label>
                    <input
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2"
                      placeholder="Votre email"
                    />
                    {!profileEmail && <p className="text-xs text-yellow-300 mt-1">Veuillez renseigner votre email pour recevoir des confirmations.</p>}
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Téléphone</label>
                    <input
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2"
                      placeholder="Téléphone"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Adresse</label>
                    <input
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2"
                      placeholder="Adresse"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Autres détails</label>
                    <textarea
                      value={profileOther}
                      onChange={(e) => setProfileOther(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-gray-900 border border-gray-700 text-white px-4 py-2 h-24"
                      placeholder="Informations supplémentaires (ex: préférence, allergies, etc.)"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold"
                    >
                      {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => {
                        // Reset to current auth values
                        setProfileFirstName((authUser as any)?.first_name || (authUser?.name ? authUser.name.split(' ')[0] : ''));
                        setProfileLastName((authUser as any)?.last_name || (authUser?.name ? authUser.name.split(' ').slice(1).join(' ') : ''));
                        setProfileEmail(authUser?.email || '');
                        setProfilePhone((authUser as any)?.phone || '');
                        setProfileAddress((authUser as any)?.address || '');
                        setProfileOther((authUser as any)?.other_details || '');
                        setProfilePhotoUrl((authUser as any)?.profile_photo || '');
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'avis':
        return (
          <div className="min-h-screen bg-gray-900 py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Avis sur le restaurant</h2>
                <div className="flex items-center gap-4">
                  <div className="flex text-yellow-400 text-3xl">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`mr-1 ${i <= Math.round(restaurantStats.avg) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                    ))}
                  </div>
                  <div>
                    <div className="text-white font-bold text-xl">{restaurantStats.avg > 0 ? restaurantStats.avg : 'Pas encore noté'}</div>
                    <div className="text-gray-400 text-sm">{restaurantStats.count} avis</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Laisser un avis</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex text-yellow-400 text-2xl">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setNewRestaurantRating(i)} className={`${i <= (newRestaurantRating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                    ))}
                  </div>
                  <div className="text-sm text-gray-300">{newRestaurantRating ? `${newRestaurantRating} étoiles` : 'Sélectionnez une note'}</div>
                </div>
                <textarea value={newRestaurantComment} onChange={(e) => setNewRestaurantComment(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 mb-3" placeholder="Partagez votre expérience..." />
                <div className="flex gap-3">
                  <button onClick={submitRestaurantReview} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">Publier l'avis</button>
                  <button onClick={() => { setNewRestaurantRating(null); setNewRestaurantComment(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Annuler</button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Tous les avis</h3>
                {restaurantReviews.length === 0 ? (
                  <p className="text-gray-400">Aucun avis pour le moment. Soyez le premier !</p>
                ) : (
                  <div className="space-y-4">
                    {restaurantReviews.map(r => (
                      <div key={r.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-semibold">{r.clientName || (authUser && r.clientId === authUser.id ? authUser.name : 'Utilisateur')}</div>
                            <div className="text-gray-400 text-sm">{new Date(r.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-yellow-400">
                              {[1,2,3,4,5].map(i => (
                                <span key={i} className={`${i <= Math.round(r.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                              ))}
                            </div>
                            <div className="text-gray-300 font-bold">{r.rating}</div>
                          </div>
                        </div>
                        <p className="text-gray-300 mt-2">{r.comment}</p>
                        {r.response && (
                          <div className="mt-3 p-3 bg-gray-800 rounded">
                            <div className="text-sm text-emerald-300">Réponse du gérant</div>
                            <div className="text-gray-300 text-sm">{r.response.text}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'menu':
        if (loading) {
          return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          );
        }

        return (
          <div className="min-h-screen bg-gray-900 py-16 px-4">
            <div className="max-w-7xl mx-auto">
              {/* Titre centralisé */}
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                    Notre Menu
                  </span>
                </h1>
                <p className="text-gray-400 text-lg">
                  Découvrez nos délicieux plats préparés avec passion
                </p>
              </div>

              {/* Menu de la semaine */}
              {getRecipesBySection('specials').length > 0 && (
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-bold text-white">Menu de la semaine</h2>
                    <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-full">
                      SPÉCIAL
                    </span>
                  </div>
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                    {getRecipesBySection('specials').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Entrées */}
              {getRecipesBySection('entrees').length > 0 && (
                <div className="mb-16">
                  <h2 className="text-3xl font-bold text-white mb-6">Entrées</h2>
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                    {getRecipesBySection('entrees').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Plats de résistance */}
              {getRecipesBySection('plats').length > 0 && (
                <div className="mb-16">
                  <h2 className="text-3xl font-bold text-white mb-6">Plats de résistance</h2>
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                    {getRecipesBySection('plats').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}





              {/* Boissons */}
              {getRecipesBySection('boissons').length > 0 && (
                <div className="mb-16">
                  <h2 className="text-3xl font-bold text-white mb-6">Boissons</h2>
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                    {getRecipesBySection('boissons').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Desserts */}
              {getRecipesBySection('desserts').length > 0 && (
                <div className="mb-16">
                  <h2 className="text-3xl font-bold text-white mb-6">Desserts</h2>
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                    {getRecipesBySection('desserts').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}


            </div>
          </div>
        );

      case 'commandes':
        const activeOrders = orders.filter(o => !['served', 'delivered', 'cancelled'].includes(o.status));
        const historyOrders = orders.filter(o => ['served', 'delivered', 'cancelled'].includes(o.status));

        return (
          <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold text-white">Mes Commandes</h1>
                <p className="text-gray-400 mt-1">Suivez l'état de vos commandes</p>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 p-6">
                  <div className="text-white">
                    <p className="text-sm opacity-90">Total</p>
                    <p className="text-3xl font-bold mt-1">{orders.length}</p>
                  </div>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-600 to-yellow-700 border-0 p-6">
                  <div className="text-white">
                    <p className="text-sm opacity-90">En cours</p>
                    <p className="text-3xl font-bold mt-1">{activeOrders.length}</p>
                  </div>
                </Card>
                <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 p-6">
                  <div className="text-white">
                    <p className="text-sm opacity-90">Terminées</p>
                    <p className="text-3xl font-bold mt-1">{historyOrders.length}</p>
                  </div>
                </Card>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                </div>
              ) : (
                <>
                  {/* Commandes en cours */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Commandes en cours</h2>
                    <div className="grid gap-4">
                      {activeOrders.length > 0 ? (
                        activeOrders.map((order) => {
                          const statusInfo = statusMapping[order.status] || statusMapping.pending;
                          return (
                            <Card key={order.id} className="bg-gray-800 border-gray-700 p-6">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-${statusInfo.color}-500`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-brand-500 font-bold text-xl">{order.total.toLocaleString()} FCFA</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Commande:</span>
                                    <p className="text-white font-medium">#{order.id.slice(0, 8)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Date:</span>
                                    <p className="text-white font-medium">
                                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Type:</span>
                                    <p className="text-white font-medium">{order.type === 'delivery' ? 'Livraison' : 'Sur place'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Articles:</span>
                                    <p className="text-white font-medium">{order.items.length}</p>
                                  </div>
                                </div>

                                <div className="p-3 bg-gray-700 rounded">
                                  <span className="text-gray-400 text-sm">Détails:</span>
                                  <p className="text-white text-sm mt-1">
                                    {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                                  </p>
                                </div>

                                {order.notes && (
                                  <div className="p-3 bg-gray-700 rounded">
                                    <span className="text-gray-400 text-sm">Notes:</span>
                                    <p className="text-white text-sm mt-1">{order.notes}</p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsEditing(true);
                                      setEditFormData(order);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Modifier
                                  </Button>
                                  {order.status !== 'cancelled' && (
                                    <Button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Annuler
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="bg-gray-700 hover:bg-gray-600"
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <Card className="bg-gray-800 border-gray-700 p-8 text-center">
                          <p className="text-gray-400">Aucune commande en cours</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Historique */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Historique</h2>
                    <div className="grid gap-4">
                      {historyOrders.length > 0 ? (
                        historyOrders.map((order) => {
                          const statusInfo = statusMapping[order.status] || statusMapping.pending;
                          return (
                            <Card key={order.id} className="bg-gray-800 border-gray-700 p-6 opacity-75">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-${statusInfo.color}-500`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-brand-500 font-bold text-xl">{order.total.toLocaleString()} FCFA</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Commande:</span>
                                    <p className="text-white font-medium">#{order.id.slice(0, 8)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Date:</span>
                                    <p className="text-white font-medium">
                                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Type:</span>
                                    <p className="text-white font-medium">{order.type === 'delivery' ? 'Livraison' : 'Sur place'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Articles:</span>
                                    <p className="text-white font-medium">{order.items.length}</p>
                                  </div>
                                </div>

                                <div className="p-3 bg-gray-700 rounded">
                                  <span className="text-gray-400 text-sm">Détails:</span>
                                  <p className="text-white text-sm mt-1">
                                    {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                                  </p>
                                </div>

                                {order.notes && (
                                  <div className="p-3 bg-gray-700 rounded">
                                    <span className="text-gray-400 text-sm">Notes:</span>
                                    <p className="text-white text-sm mt-1">{order.notes}</p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setIsEditing(true);
                                      setEditFormData(order);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Voir détails
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="bg-gray-700 hover:bg-gray-600"
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <Card className="bg-gray-800 border-gray-700 p-8 text-center">
                          <p className="text-gray-400">Aucune commande dans l'historique</p>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Modal de modification */}
              {selectedOrder && isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white">Modifier la commande {selectedOrder.id}</h2>
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

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Notes</label>
                        <textarea
                          value={editFormData.notes || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                          rows={3}
                        />
                      </div>
                      {selectedOrder.type === 'dine-in' && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Table</label>
                          <input
                            type="text"
                            value={editFormData.table || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, table: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                      {(selectedOrder.type === 'delivery' || selectedOrder.type === 'takeaway') && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Téléphone</label>
                            <input
                              type="text"
                              value={editFormData.phone || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          {selectedOrder.type === 'delivery' && (
                            <div>
                              <label className="block text-sm text-gray-400 mb-2">Adresse</label>
                              <input
                                type="text"
                                value={editFormData.address || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleUpdateOrder(selectedOrder.id, editFormData);
                          }}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(null);
                            setIsEditing(false);
                            setEditFormData({});
                          }}
                          className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'fidelite':
        return <LoyaltyClient />;

      case 'avis':
        return (
          <div className="min-h-screen bg-gray-900 py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-12 text-center">
                <h1 className="text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                    Mes Avis
                  </span>
                </h1>
                <p className="text-gray-400">Partagez votre expérience et lisez les avis des autres clients</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Laisser un avis</h2>
                <div className="mb-4">
                  <label className="block text-gray-400 mb-2">Note</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} className="text-3xl text-yellow-400 hover:scale-110 transition-transform">
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 mb-2">Votre commentaire</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                    rows={4}
                    placeholder="Partagez votre expérience..."
                  ></textarea>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all">
                  Publier l'avis
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Tous les avis</h2>
                <div className="space-y-4">
                  {restaurantReviews.length === 0 ? (
                    <p className="text-gray-400">Aucun avis pour le moment. Soyez le premier !</p>
                  ) : (
                    restaurantReviews.map((review) => (
                      <div key={review.id} className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{review.clientName || 'Utilisateur'}</h3>
                            <p className="text-gray-400 text-sm">{new Date(review.createdAt || '').toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-xl ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-300">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'profil':
        return (
          <div className="min-h-screen bg-gray-900 py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-12 text-center">
                <h1 className="text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                    Mon Profil
                  </span>
                </h1>
                <p className="text-gray-400">Gérez vos informations personnelles</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Informations Personnelles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-2">Prénom</label>
                        <input
                          type="text"
                          value="Jean"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-2">Nom</label>
                        <input
                          type="text"
                          value="Dupont"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-2">Email</label>
                        <input
                          type="email"
                          value="jean.dupont@example.com"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-2">Téléphone</label>
                        <input
                          type="tel"
                          value="+33 6 12 34 56 78"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <button className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all">
                      Enregistrer les modifications
                    </button>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Adresses</h2>
                    <div className="space-y-4">
                      {[
                        { type: 'Domicile', address: '123 Rue de la Paix, 75000 Paris', default: true },
                        { type: 'Bureau', address: '456 Avenue des Champs, 75008 Paris', default: false }
                      ].map((addr, index) => (
                        <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold">{addr.type}</h3>
                              {addr.default && (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">Par défaut</span>
                              )}
                            </div>
                            <p className="text-gray-400">{addr.address}</p>
                          </div>
                          <button className="text-emerald-400 hover:text-emerald-300">Modifier</button>
                        </div>
                      ))}
                    </div>
                    <button className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all">
                      + Ajouter une adresse
                    </button>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Préférences</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-semibold">Notifications par email</h3>
                          <p className="text-gray-400 text-sm">Recevoir les offres et actualités</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-semibold">Notifications push</h3>
                          <p className="text-gray-400 text-sm">Alertes pour vos commandes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6 text-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                      JD
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Jean Dupont</h3>
                    <p className="text-gray-400 mb-4">Membre depuis Nov 2024</p>
                    <button className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all">
                      Changer la photo
                    </button>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Statistiques</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Commandes totales</span>
                        <span className="text-white font-bold">24</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Points fidélité</span>
                        <span className="text-emerald-400 font-bold">2,450</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avis laissés</span>
                        <span className="text-white font-bold">8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <MainContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar 
        user={user} 
        currentPage={currentPage} 
        onNavigate={(page) => navigate(`/client/${page}`)}
        onLogout={onLogout}
        cartItemCount={getCartItemCount()}
        onCartClick={() => setShowCart(true)}
      />
      {renderContent()}

      {/* Recipe Details Modal */}
      {showRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover rounded-t-xl"
              />
              <button
                onClick={() => {
                  setShowRecipeModal(false);
                  setSelectedRecipe(null);
                }}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 rounded-full text-white hover:bg-gray-900 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-emerald-400 text-sm font-semibold">{selectedRecipe.category}</span>
                  <h2 className="text-3xl font-bold text-white mt-2">{selectedRecipe.name}</h2>
                </div>
                <span className="text-2xl font-bold text-emerald-400">{selectedRecipe.price}</span>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300">{selectedRecipe.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Allergènes</h3>
                <p className="text-gray-300">{selectedRecipe.allergens}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Laisser un avis</h3>
                <div className="flex items-center gap-2 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedRatingValue(s)}
                      className={`text-3xl ${selectedRatingValue && s <= selectedRatingValue ? 'text-yellow-400' : 'text-gray-600'} hover:scale-110 transition-transform`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitReview(selectedRecipe.id)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                  >
                    Publier l'avis
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRatingValue(null);
                      setReviewComment('');
                    }}
                    className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => addToCart(selectedRecipe, 1)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Ajouter au panier
                </button>
                <button
                  onClick={() => {
                    setShowRecipeModal(false);
                    setSelectedRecipe(null);
                  }}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Mon Panier</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 text-gray-400 hover:text-white transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400 text-lg">Votre panier est vide</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.recipe.id} className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-4">
                        <img
                          src={item.recipe.image}
                          alt={item.recipe.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-white font-semibold">{item.recipe.name}</h3>
                          <p className="text-gray-400 text-sm">{item.recipe.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateCartQuantity(item.recipe.id, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="text-white font-semibold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.recipe.id, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white hover:bg-gray-600"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.recipe.id)}
                            className="ml-4 p-2 text-red-400 hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-700 pt-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-emerald-400">{getCartTotal().toLocaleString()} FCFA</span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                    >
                      Passer la commande
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Paiement</h2>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setPaymentMethod(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!paymentMethod ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Choisissez votre méthode de paiement</h3>
                  
                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-emerald-500 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.174 1.305 1.26 2.962.243 4.72-.99 1.712-2.62 2.578-4.577 2.578h-2.638c-.673 0-1.22.55-1.287 1.22l-.02.19c-.09.89.64 1.64 1.53 1.64h1.09c.78 0 1.41.63 1.41 1.41v.19c0 .78-.63 1.41-1.41 1.41h-6.19c-.67 0-1.22.55-1.29 1.22l-.01.19c-.09.89.64 1.64 1.53 1.64h4.28c.78 0 1.41.63 1.41 1.41v.19c0 .78-.63 1.41-1.41 1.41H8.303c-.67 0-1.22.55-1.29 1.22l-.01.19c-.09.89.64 1.64 1.53 1.64h5.62c.78 0 1.41.63 1.41 1.41v.19c0 .78-.63 1.41-1.41 1.41h-6.19c-.67 0-1.22.55-1.29 1.22l-.01.19c-.09.89.64 1.64 1.53 1.64h4.28c.78 0 1.41.63 1.41 1.41v.19c0 .78-.63 1.41-1.41 1.41H7.076c-.67 0-1.22.55-1.29 1.22l-.01.19c-.09.89.64 1.64 1.53 1.64z"/>
                      </svg>
                      <span className="text-white font-semibold">PayPal</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className="w-full p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-emerald-500 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-white font-semibold">Carte bancaire</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Récapitulatif de la commande</p>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.recipe.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.recipe.name} x{item.quantity}</span>
                          <span className="text-white">{(getPriceNumber(item.recipe.price) * item.quantity).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                        <span className="text-white font-semibold">Total</span>
                        <span className="text-emerald-400 font-bold">{getCartTotal().toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setPaymentMethod(null)}
                    className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </button>

                  {paymentMethod === 'paypal' && (
                    <PayPalPayment
                      amount={getCartTotal()}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}

                  {paymentMethod === 'card' && (
                    <CardPayment
                      amount={getCartTotal()}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
