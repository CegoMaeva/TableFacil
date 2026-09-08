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
import { SupportTickets } from './SupportTickets';
import { LiveTracking } from '../Delivery/LiveTracking';
import { ChatbotClient } from './ChatbotClient';
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
  'in-progress': { label: 'En cours de livraison', color: 'blue' },
  'out-for-delivery': { label: 'Près de vous', color: 'orange' },
  'delivered': { label: 'Livrée', color: 'emerald' },
  'cancelled': { label: 'Annulée', color: 'red' },
  'confirmed': { label: 'Confirmée', color: 'green' }
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
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  // Orders tab state
  const [selectedOrdersTab, setSelectedOrdersTab] = useState<'all' | 'active' | 'history'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  // Ratings state: map recipeId -> { avg, count }
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [selectedRatingValue, setSelectedRatingValue] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | null>(null);
  
  // Loyalty points redemption state
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

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

  // Scroll automatique vers un plat spécifique après chargement
  useEffect(() => {
    const scrollToRecipeId = (location.state as any)?.scrollToRecipe;
    if (scrollToRecipeId && recipes.length > 0) {
      // Attendre que le DOM soit rendu
      setTimeout(() => {
        const element = document.getElementById(`recipe-${scrollToRecipeId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight temporaire
          element.style.transition = 'all 0.3s';
          element.style.transform = 'scale(1.05)';
          element.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.5)';
          setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
          }, 1000);
        }
      }, 300);
    }
  }, [recipes, location.state]);

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
    
    // Vérifier la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5MB)');
      return;
    }
    
    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou WEBP');
      return;
    }
    
    try {
      toast.loading('Téléchargement en cours...', { id: 'upload-photo' });
      const url = await uploadProfilePhoto(file);
      setProfilePhotoUrl(url);
      toast.success('Photo mise à jour avec succès!', { id: 'upload-photo' });
    } catch (err: any) {
      console.error('Erreur upload avatar', err);
      toast.error(err.message || 'Impossible de téléverser la photo', { id: 'upload-photo' });
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
    // Trigger a short cart bump animation instead of a toast
    setCartBump(true);
    setTimeout(() => setCartBump(false), 320);
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
    const removedItem = cart.find(item => item.recipe.id === recipeId);
    setCart(prevCart => prevCart.filter(item => item.recipe.id !== recipeId));
    if (removedItem) {
      toast.success(`× ${removedItem.recipe.name} retiré`, {
        duration: 2000,
        style: {
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
        }
      });
    }
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

  const getDeliveryFees = (): number => {
    const subtotal = getCartTotal();
    return subtotal < 5000 ? 1500 : 0;
  };

  const getTaxRate = (): number => {
    return 0.18; // 18% VAT
  };

  const getTaxAmount = (): number => {
    const subtotal = getCartTotal();
    return Math.round(subtotal * getTaxRate());
  };

  const getTotalWithFeesAndTaxes = (): number => {
    return getCartTotal() + getDeliveryFees() + getTaxAmount();
  };
  
  // Calculate loyalty discount (10 FCFA per point)
  const getLoyaltyDiscount = (): number => {
    if (!usePoints || pointsToUse === 0) return 0;
    return pointsToUse * 10; // 10 FCFA per point
  };
  
  // Final total after loyalty discount
  const getFinalTotal = (): number => {
    const total = getTotalWithFeesAndTaxes();
    const discount = getLoyaltyDiscount();
    return Math.max(0, total - discount);
  };

  const getCartItemCount = (): number => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }
    
    // Load loyalty points
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/loyalty/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLoyaltyPoints(data.points || 0);
      }
    } catch (error) {
      console.log('Loyalty points not available');
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

      // Collecter la position GPS du client
      let latitude: number | undefined;
      let longitude: number | undefined;
      let address: string | undefined;

      try {
        // Tenter d'obtenir la position GPS
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Géolocalisation non supportée'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true
          });
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        toast.success(' Position GPS collectée', { duration: 2000 });
      } catch (geoError) {
        console.warn('Impossible de collecter la position GPS:', geoError);
        // Demander l'adresse manuellement
        address = prompt(' Veuillez entrer votre adresse de livraison complète:') || undefined;
        if (!address || address.trim() === '') {
          toast.error('Adresse de livraison requise pour la commande');
          return;
        }
        toast.info('✓ Adresse enregistrée', { duration: 2000 });
      }

      const orderData: any = {
        items: orderItems,
        total: getFinalTotal(), // Use final total with discount
        originalTotal: getTotalWithFeesAndTaxes(), // Keep original for reference
        type: 'delivery',
        paymentMethod: paymentMethod === 'paypal' ? 'paypal' : 'card',
        paymentId: paymentData.id || paymentData.transactionId,
        notes: `Paiement via ${paymentMethod === 'paypal' ? 'PayPal' : 'Carte bancaire'}`,
        loyaltyPointsUsed: usePoints ? pointsToUse : 0,
        loyaltyDiscount: getLoyaltyDiscount()
      };

      // Ajouter position GPS ou adresse
      if (latitude && longitude) {
        orderData.latitude = latitude;
        orderData.longitude = longitude;
        orderData.address = address || `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      } else if (address) {
        orderData.address = address;
      }

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
      
      // Deduct loyalty points if used
      if (usePoints && pointsToUse > 0) {
        try {
          await fetch('http://localhost:5000/api/loyalty/redeem', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              points: pointsToUse,
              rewardName: `Réduction de ${getLoyaltyDiscount()} FCFA sur commande`
            })
          });
          toast.success(`${pointsToUse} points utilisés avec succès !`);
        } catch (err) {
          console.error('Erreur déduction points:', err);
        }
      }
      
      toast.success('Commande créée avec succès !');
      
      // Reset states
      setUsePoints(false);
      setPointsToUse(0);
      setLoyaltyPoints(0);
      
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

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'annulation');
      }

      const result = await response.json();
      
      // Mettre à jour la liste des commandes
      setOrders(orders.map(order => 
        order.id === orderId ? result.order : order
      ));
      
      // Mettre à jour la commande sélectionnée si elle est affichée
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(result.order);
      }
      
      setShowOrderDetails(false);
      toast.success('Commande annulée avec succès');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible d\'annuler la commande');
    }
  };

  // Render a recipe card
  const renderRecipeCard = (item: Recipe) => (
    <div
      key={item.id}
      id={`recipe-${item.id}`}
      className="bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl shadow-xl flex flex-col flex-shrink-0 w-[280px] sm:w-[320px] cursor-pointer"
      onClick={() => handleRecipeClick(item)}
    >
      <div className="relative h-[280px] sm:h-[300px] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
      </div>
      
      <div className="p-5 -mt-16 relative z-10">
        <span className="text-orange-500 text-xs uppercase font-bold tracking-wider mb-2 block">{item.category}</span>
        
        {/* Rating display */}
        {(() => {
          const r = ratingsMap[item.id];
          const avg = r ? r.avg : 0;
          const count = r ? r.count : 0;
          return (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="text-white font-semibold">{avg > 0 ? avg.toFixed(1) : '4.9'}</span>
              <span className="text-gray-400 text-sm">({count > 0 ? count : 203})</span>
            </div>
          );
        })()}
        
        <h3 className="text-2xl font-bold text-white mb-3 font-serif">{item.name}</h3>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>
        
        {item.allergens && (
          <p className="text-gray-500 text-xs mb-4">
            <span className="font-semibold">Contient:</span> {item.allergens}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-white text-xl font-bold">{item.price}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              addToCart(item, 1);
            }}
            className="w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <span className="text-2xl font-light">+</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'accueil':
        return <PublicHome />;

      case 'reservations':
        return <ReservationsClient />;

      case 'support':
        return <SupportTickets />;

      case 'profil':
        return (
          <div className="min-h-screen bg-gray-900 py-8 md:py-16 px-4">
            <div className="max-w-3xl mx-auto px-4 sm:px-0">
              <div className="bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl p-4 md:p-6 mb-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6 border border-gray-700">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold flex-shrink-0">
                  {(authUser?.name || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                </div>

                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-white">{authUser?.name || 'Utilisateur'}</h2>
                  <p className="text-sm md:text-base text-gray-300">{authUser?.email || 'Email non renseigné'}</p>
                  {(authUser as any)?.phone && <p className="text-sm md:text-base text-gray-300">{(authUser as any).phone}</p>}
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs md:text-sm text-gray-400">Points fidélité</p>
                  <p className="text-lg md:text-xl text-emerald-300 font-bold">{(authUser as any)?.loyalty_points ?? 0}</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Modifier mes informations</h3>
                <p className="text-gray-400 mb-4">Les champs vides peuvent être complétés. Les modifications sont appliquées immédiatement.</p>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
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
          <div className="min-h-screen bg-gray-900 py-8 sm:py-12 md:py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-2">Avis sur le restaurant</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex text-yellow-400 text-2xl sm:text-3xl">
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

              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Laisser un avis</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3">
                  <div className="flex text-yellow-400 text-xl sm:text-2xl">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setNewRestaurantRating(i)} className={`${i <= (newRestaurantRating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                    ))}
                  </div>
                  <div className="text-sm text-gray-300">{newRestaurantRating ? `${newRestaurantRating} étoiles` : 'Sélectionnez une note'}</div>
                </div>
                <textarea value={newRestaurantComment} onChange={(e) => setNewRestaurantComment(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 sm:px-4 py-2 mb-3 min-h-[80px] sm:min-h-[100px]" placeholder="Partagez votre expérience..." />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button onClick={submitRestaurantReview} className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg text-sm sm:text-base">Publier l'avis</button>
                  <button onClick={() => { setNewRestaurantRating(null); setNewRestaurantComment(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm sm:text-base">Annuler</button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Tous les avis</h3>
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

      case 'assistant':
        return <AssistantClient />;

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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Titre centralisé */}
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                  <span className="bg-gradient-to-r from-red-900 to-red-700 bg-clip-text text-transparent">
                    Notre Menu
                  </span>
                </h1>
                <p className="text-gray-400 text-base sm:text-lg">
                  Découvrez nos délicieux plats préparés avec passion
                </p>
              </div>

              {/* Menu de la semaine */}
              {getRecipesBySection('specials').length > 0 && (
                <div className="mb-12 sm:mb-16">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Menu de la semaine</h2>
                    <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap">
                      SPÉCIAL
                    </span>
                  </div>
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
                    {getRecipesBySection('specials').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Entrées */}
              {getRecipesBySection('entrees').length > 0 && (
                <div className="mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Entrées</h2>
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
                    {getRecipesBySection('entrees').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Plats de résistance */}
              {getRecipesBySection('plats').length > 0 && (
                <div className="mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Plats de résistance</h2>
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
                    {getRecipesBySection('plats').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}





              {/* Boissons */}
              {getRecipesBySection('boissons').length > 0 && (
                <div className="mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Boissons</h2>
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
                    {getRecipesBySection('boissons').map((item) => renderRecipeCard(item))}
                  </div>
                </div>
              )}

              {/* Desserts */}
              {getRecipesBySection('desserts').length > 0 && (
                <div className="mb-12 sm:mb-16">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Desserts</h2>
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-0 -mx-4 sm:mx-0">
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
          <div className="min-h-screen bg-gray-900 py-6 sm:py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Commandes</h1>
                <p className="text-sm sm:text-base text-gray-400 mt-1">Suivez l'état de vos commandes</p>
              </div>

              {/* Onglets */}
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => setSelectedOrdersTab('all')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
                    selectedOrdersTab === 'all'
                      ? 'bg-[#D88C2B] text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  Total ({orders.length})
                </button>
                <button
                  onClick={() => setSelectedOrdersTab('active')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
                    selectedOrdersTab === 'active'
                      ? 'bg-[#D88C2B] text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  En cours ({activeOrders.length})
                </button>
                <button
                  onClick={() => setSelectedOrdersTab('history')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
                    selectedOrdersTab === 'history'
                      ? 'bg-[#D88C2B] text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  Terminées ({historyOrders.length})
                </button>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                </div>
              ) : (
                <>
                  {/* Commandes - contenu basé sur l'onglet */}
                  {(selectedOrdersTab === 'all' || selectedOrdersTab === 'active') && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">{selectedOrdersTab === 'all' ? 'Toutes les Commandes' : 'Commandes en cours'}</h2>
                    <div className="grid gap-4">
                      {(selectedOrdersTab === 'all' ? orders : activeOrders).length > 0 ? (
                        (selectedOrdersTab === 'all' ? orders : activeOrders).map((order) => {
                          const statusInfo = statusMapping[order.status] || statusMapping.pending;
                          return (
                            <Card key={order.id} className="bg-gray-800 border border-gray-700 p-4 sm:p-6 rounded-xl shadow-lg">
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                <div>
                                  <p className="text-white font-semibold text-lg">Commande #{order.id.slice(0, 8)}</p>
                                  <p className="text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white bg-${statusInfo.color}-500`}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {statusInfo.label}
                                </span>
                              </div>

                              <div className="mt-5 space-y-2">
                                <h4 className="text-gray-200 font-semibold">Articles</h4>
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-gray-100">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
                                      </svg>
                                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                                      <span className="text-sm text-gray-300">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {order.notes && (
                                <div className="mt-4 p-3 bg-gray-700/70 rounded-lg">
                                  <p className="text-gray-300 text-sm">{order.notes}</p>
                                </div>
                              )}

                              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <p className="text-lg sm:text-xl font-bold text-white">Total: {order.total.toLocaleString()} FCFA</p>
                                <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                                  <Button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowOrderDetails(true);
                                    }}
                                    className="bg-white text-gray-900 hover:bg-gray-100 text-sm px-3 py-2"
                                  >
                                    Voir détails
                                  </Button>
                                  {!['cancelled', 'delivered', 'completed'].includes((order as any).status) && (
                                    <Button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="bg-black text-white hover:bg-gray-900 text-sm px-3 py-2"
                                    >
                                      Annuler
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <Card className="bg-gray-800 border-gray-700 p-8 text-center">
                          <p className="text-gray-400">{selectedOrdersTab === 'all' ? 'Aucune commande' : 'Aucune commande en cours'}</p>
                        </Card>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Historique - affiché seulement si onglet 'history' */}
                  {(selectedOrdersTab === 'all' || selectedOrdersTab === 'history') && (
                    <div>
                    <h2 className="text-2xl font-bold text-white mb-4">{selectedOrdersTab === 'all' ? '' : 'Commandes Terminées'}</h2>
                    <div className="grid gap-4">
                      {(selectedOrdersTab === 'all' ? historyOrders : historyOrders).length > 0 ? (
                        (selectedOrdersTab === 'all' ? historyOrders : historyOrders).map((order) => {
                          const statusInfo = statusMapping[order.status] || statusMapping.pending;
                          return (
                            <Card key={order.id} className="bg-gray-800 border border-gray-700 p-4 sm:p-6 rounded-xl shadow-lg opacity-75">
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                <div>
                                  <p className="text-white font-semibold text-base sm:text-lg">Commande #{order.id.slice(0, 8)}</p>
                                  <p className="text-gray-400 text-xs sm:text-sm">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white bg-${statusInfo.color}-500`}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {statusInfo.label}
                                </span>
                              </div>

                              <div className="mt-5 space-y-2">
                                <h4 className="text-gray-200 font-semibold">Articles</h4>
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-gray-100">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
                                      </svg>
                                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                                      <span className="text-sm text-gray-300">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {order.notes && (
                                <div className="mt-4 p-3 bg-gray-700/70 rounded-lg">
                                  <p className="text-gray-300 text-sm">{order.notes}</p>
                                </div>
                              )}

                              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <p className="text-lg sm:text-xl font-bold text-white">Total: {order.total.toLocaleString()} FCFA</p>
                                <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                                  <Button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShowOrderDetails(true);
                                    }}
                                    className="bg-white text-gray-900 hover:bg-gray-100 text-sm px-3 py-2"
                                  >
                                    Voir détails
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
                  )}
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
                  <span className="bg-gradient-to-r from-red-900 to-red-700 bg-clip-text text-transparent">
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
                <button className="px-6 py-3 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-lg hover:from-red-800 hover:to-red-700 transition-all">
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
                  <span className="bg-gradient-to-r from-red-900 to-red-700 bg-clip-text text-transparent">
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
        cartBump={cartBump}
        onCartClick={() => setShowCart(true)}
      />
      {renderContent()}

      {/* Recipe Details Modal */}
      {showRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                <div className="flex-1">
                  <span className="text-orange-400 text-sm font-semibold">{selectedRecipe.category}</span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-2">{selectedRecipe.name}</h2>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-orange-400 whitespace-nowrap">{selectedRecipe.price}</span>
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
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Laisser un avis</h3>
                <div className="flex items-center gap-1 sm:gap-2 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedRatingValue(s)}
                      className={`text-2xl sm:text-3xl ${selectedRatingValue && s <= selectedRatingValue ? 'text-yellow-400' : 'text-gray-600'} hover:scale-110 transition-transform`}
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none mb-3 text-sm sm:text-base"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => submitReview(selectedRecipe.id)}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-900 to-red-800 text-white rounded-lg hover:from-red-800 hover:to-red-700 transition-all font-semibold text-sm sm:text-base"
                  >
                    Publier l'avis
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRatingValue(null);
                      setReviewComment('');
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all text-sm sm:text-base"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => addToCart(selectedRecipe, 1)}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
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
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all font-semibold text-sm sm:text-base"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Mon Panier</h2>
                  <p className="text-gray-600 mt-1">{cart.length} article(s) dans votre panier</p>
                </div>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg">Votre panier est vide</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                  {/* Items list - Left side */}
                  <div className="lg:col-span-2">
                    <div className="space-y-3 sm:space-y-4">
                      {cart.map((item) => (
                        <div key={item.recipe.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
                          <img
                            src={item.recipe.image}
                            alt={item.recipe.name}
                            className="w-full sm:w-24 h-40 sm:h-24 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{item.recipe.name}</h3>
                            <p className="text-red-600 font-bold mt-1">{item.recipe.price}</p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg border border-gray-300 self-start">
                            <button
                              onClick={() => updateCartQuantity(item.recipe.id, item.quantity - 1)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-900"
                            >
                              −
                            </button>
                            <span className="px-4 py-2 font-semibold text-gray-900 min-w-[3rem] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.recipe.id, item.quantity + 1)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-900"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.recipe.id)}
                            className="p-2 text-red-500 hover:text-red-700 ml-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary - Right side */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-900 rounded-lg p-4 sm:p-6 lg:sticky lg:top-8">
                      <div className="flex items-center gap-3 mb-6">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-white text-lg font-bold">Résumé de la commande</h3>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Sous-total</span>
                          <span className="text-white font-semibold">{getCartTotal().toLocaleString()} FCFA</span>
                        </div>
                        {getTaxAmount() > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Taxes (18%)</span>
                            <span className="text-white font-semibold">{getTaxAmount().toLocaleString()} FCFA</span>
                          </div>
                        )}
                        {getDeliveryFees() > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Frais de livraison</span>
                            <span className="text-white font-semibold">{getDeliveryFees().toLocaleString()} FCFA</span>
                          </div>
                        )}
                        {getDeliveryFees() === 0 && getCartTotal() >= 5000 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Frais de livraison</span>
                            <span className="text-green-400 font-semibold">Offerts</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-700 pt-4 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold text-lg">Total</span>
                          <span className="text-red-600 font-bold text-2xl">{getTotalWithFeesAndTaxes().toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      <button
                        onClick={handleCheckout}
                        className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all font-bold text-lg"
                      >
                        Payer maintenant
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Paiement</h2>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setPaymentMethod(null);
                    setUsePoints(false);
                    setPointsToUse(0);
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
                      <div className="border-t border-gray-700 pt-2 mt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Sous-total</span>
                          <span className="text-white">{getCartTotal().toLocaleString()} FCFA</span>
                        </div>
                        {getTaxAmount() > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Taxes (18%)</span>
                            <span className="text-white">{getTaxAmount().toLocaleString()} FCFA</span>
                          </div>
                        )}
                        {getDeliveryFees() > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Frais de livraison</span>
                            <span className="text-white">{getDeliveryFees().toLocaleString()} FCFA</span>
                          </div>
                        )}
                        {getDeliveryFees() === 0 && getCartTotal() >= 5000 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Frais de livraison</span>
                            <span className="text-emerald-400">Offerts</span>
                          </div>
                        )}
                        
                        {/* Loyalty Points Section */}
                        {loyaltyPoints > 0 && (
                          <div className="border-t border-gray-700 pt-2 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={usePoints}
                                  onChange={(e) => {
                                    setUsePoints(e.target.checked);
                                    if (!e.target.checked) setPointsToUse(0);
                                  }}
                                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-300">Utiliser mes points fidélité</span>
                              </label>
                              <span className="text-xs text-emerald-400">{loyaltyPoints} pts disponibles</span>
                            </div>
                            
                            {usePoints && (
                              <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Points à utiliser:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={Math.min(loyaltyPoints, Math.floor(getTotalWithFeesAndTaxes() / 10))}
                                    value={pointsToUse}
                                    onChange={(e) => setPointsToUse(Math.min(parseInt(e.target.value) || 0, loyaltyPoints, Math.floor(getTotalWithFeesAndTaxes() / 10)))}
                                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                                  />
                                </div>
                                <div className="text-xs text-gray-400">
                                  1 point = 10 FCFA • Max: {Math.min(loyaltyPoints, Math.floor(getTotalWithFeesAndTaxes() / 10))} points
                                </div>
                                {getLoyaltyDiscount() > 0 && (
                                  <div className="flex items-center justify-between pt-2 border-t border-emerald-600/20">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                                      </svg>
                                      <span className="text-sm font-medium text-emerald-400">Bon de réduction</span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-400">-{getLoyaltyDiscount().toLocaleString()} FCFA</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between font-semibold border-t border-gray-700 pt-2">
                          <span className="text-white">Total à payer</span>
                          <div className="text-right">
                            {getLoyaltyDiscount() > 0 && (
                              <div className="text-xs text-gray-500 line-through">{getTotalWithFeesAndTaxes().toLocaleString()} FCFA</div>
                            )}
                            <span className="text-emerald-400">{getFinalTotal().toLocaleString()} FCFA</span>
                          </div>
                        </div>
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
                      amount={getTotalWithFeesAndTaxes()}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}

                  {paymentMethod === 'card' && (
                    <CardPayment
                      amount={getTotalWithFeesAndTaxes()}
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

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Détails de la commande</h2>
                  <p className="text-red-100 mt-1">#{selectedOrder.id.slice(0, 12)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowOrderDetails(false);
                    setSelectedOrder(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* 📝 Informations essentielles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                    <h3 className="text-white font-semibold">Date & Heure</h3>
                  </div>
                  <p className="text-gray-300">{new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                  <p className="text-gray-400 text-sm mt-1">{new Date(selectedOrder.createdAt).toLocaleTimeString('fr-FR')}</p>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    <h3 className="text-white font-semibold">Statut</h3>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-${statusMapping[selectedOrder.status]?.color || 'gray'}-500`}>
                    {statusMapping[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* 🍽️ Détails du contenu */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                  </svg>
                  <h3 className="text-white font-bold text-lg">Articles commandés</h3>
                </div>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-400">Quantité: <span className="text-white font-semibold">×{item.quantity}</span></span>
                          <span className="text-gray-400">Prix unitaire: <span className="text-red-400 font-semibold">{item.price.toLocaleString()} FCFA</span></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{(item.price * item.quantity).toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 💰 Informations financières */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="text-white font-bold text-lg">Récapitulatif financier</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-300">
                    <span>Sous-total</span>
                    <span className="font-semibold">{selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} FCFA</span>
                  </div>
                  {(selectedOrder as any).loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-red-400 bg-red-500/10 -mx-2 px-2 py-1 rounded">
                      <span>🎁 Réduction fidélité ({(selectedOrder as any).loyaltyPointsUsed} points)</span>
                      <span className="font-semibold">-{(selectedOrder as any).loyaltyDiscount.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                    <span className="text-white font-bold text-xl">Total</span>
                    <span className="text-red-400 font-bold text-2xl">{selectedOrder.total.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-400">Paiement: <span className="text-white font-semibold">{(selectedOrder as any).paymentMethod || 'Non spécifié'}</span></span>
                    <span className="ml-auto px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">✓ Payé</span>
                  </div>
                </div>
              </div>

              {/* 🚚 Livraison / Adresse */}
              {(selectedOrder.address || selectedOrder.table) && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    <h3 className="text-white font-bold text-lg">{selectedOrder.type === 'dine-in' ? 'Table' : 'Livraison'}</h3>
                  </div>
                  {selectedOrder.table && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Table n°</span>
                      <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold text-lg">{selectedOrder.table}</span>
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div>
                      <p className="text-gray-300">{selectedOrder.address}</p>
                      {selectedOrder.phone && (
                        <p className="text-gray-400 text-sm mt-2">📞 {selectedOrder.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <p className="text-amber-300 font-semibold">Remarques</p>
                      <p className="text-gray-300 mt-1">{selectedOrder.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-700 p-6 bg-gray-800/30 rounded-b-2xl flex justify-between items-center flex-wrap gap-3">
              <button
                onClick={() => {
                  setShowOrderDetails(false);
                  setSelectedOrder(null);
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Fermer
              </button>
              <div className="flex gap-3 flex-wrap">
                {['in-progress', 'out-for-delivery'].includes((selectedOrder as any).status) && (
                  <button
                    onClick={() => setShowTracking(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    📍 Suivre la livraison
                  </button>
                )}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      handleCancelOrder(selectedOrder.id);
                      setShowOrderDetails(false);
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Annuler la commande
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suivi en temps réel */}
      {showTracking && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-700 bg-gray-900">
              <h2 className="text-2xl font-bold text-white">Suivi de livraison</h2>
              <button
                onClick={() => setShowTracking(false)}
                className="text-gray-400 hover:text-white transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <LiveTracking
                orderId={selectedOrder.id}
                token={TokenManager.getToken() || ''}
                onClose={() => setShowTracking(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Assistant */}
      <ChatbotClient />

    </div>
  );
};
