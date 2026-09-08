import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Order {
  id: string;
  items: any[];
  total: number;
  status: string;
  timestamp: string;
  tableNumber?: string;
  deliveryType?: string;
}

interface Reservation {
  id: string;
  status: string;
  date: string;
}

interface DishStats {
  name: string;
  quantity: number;
  revenue: number;
}

interface DashboardStats {
  ordersToday: number;
  reservationsToday: number;
  revenueToday: number;
  activeClients: number;
  ordersTrend: number;
  reservationsTrend: number;
  revenueTrend: number;
  clientsTrend: number;
  averageBasket: number;
  recentOrders: Order[];
  pendingReservations: number;
  topDishes: DishStats[];
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Charger les commandes
      const ordersRes = await fetch('http://localhost:5000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Charger les réservations
      const reservationsRes = await fetch('http://localhost:5000/api/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Charger les utilisateurs
      const usersRes = await fetch('http://localhost:5000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (ordersRes.ok && reservationsRes.ok) {
        const orders = await ordersRes.json();
        const reservations = await reservationsRes.json();
        let users = [];
        
        if (usersRes.ok) {
          users = await usersRes.json();
        }

        // Calculer les statistiques
        const today = new Date().toISOString().split('T')[0];
        
        const ordersToday = orders.filter((o: Order) => 
          (o.timestamp || o.createdAt)?.startsWith(today)
        );
        
        const reservationsToday = reservations.filter((r: Reservation) => 
          r.date === today || r.date?.startsWith(today)
        );
        
        const revenueToday = ordersToday.reduce((sum: number, o: Order) => 
          sum + (o.total || 0), 0
        );
        
        const averageBasket = ordersToday.length > 0 
          ? Math.round(revenueToday / ordersToday.length)
          : 0;
        
        const pendingReservations = reservations.filter((r: Reservation) => 
          r.status === 'En attente' || r.status === 'pending'
        ).length;
        
        // Tendances (simulées pour l'instant - à améliorer avec historique)
        const ordersTrend = ordersToday.length > 0 ? Math.round(Math.random() * 20 - 5) : 0;
        const reservationsTrend = reservationsToday.length > 0 ? Math.round(Math.random() * 20 - 5) : 0;
        const revenueTrend = revenueToday > 0 ? Math.round(Math.random() * 20) : 0;
        const clientsTrend = users.length > 0 ? Math.round(Math.random() * 10 - 5) : 0;
        
        // Commandes récentes (5 dernières)
        const recentOrders = orders
          .sort((a: Order, b: Order) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          )
          .slice(0, 5);

        // Calculer les meilleurs plats
        const dishMap = new Map<string, { quantity: number; revenue: number }>();
        ordersToday.forEach((order: Order) => {
          (order.items || []).forEach((item: any) => {
            const dishName = item.name || 'Plat inconnu';
            const dishPrice = item.price || 0;
            const current = dishMap.get(dishName) || { quantity: 0, revenue: 0 };
            dishMap.set(dishName, {
              quantity: current.quantity + (item.quantity || 1),
              revenue: current.revenue + (dishPrice * (item.quantity || 1))
            });
          });
        });

        const topDishes: DishStats[] = Array.from(dishMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 3);

        setStats({
          ordersToday: ordersToday.length,
          reservationsToday: reservationsToday.length,
          revenueToday,
          activeClients: users.filter((u: any) => u.user_type === 'client').length,
          ordersTrend,
          reservationsTrend,
          revenueTrend,
          clientsTrend,
          averageBasket,
          recentOrders,
          pendingReservations,
          topDishes
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'pending': { label: 'En attente', color: 'warning' },
      'preparing': { label: 'En préparation', color: 'info' },
      'ready': { label: 'Prête', color: 'accent' },
      'served': { label: 'Servie', color: 'success' },
      'delivered': { label: 'Livrée', color: 'success' },
      'cancelled': { label: 'Annulée', color: 'danger' }
    };
    return statusMap[status] || { label: status, color: 'neutral' };
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center text-neutral-400">
          Impossible de charger les données
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Tableau de Bord</h1>
        <p className="text-neutral-400 text-lg">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Commandes aujourd'hui */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6 group hover:border-gray-600/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gray-700/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${
              stats.ordersTrend >= 0 
                ? 'text-gray-300 bg-gray-700/30' 
                : 'text-gray-400 bg-gray-700/20'
            }`}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={stats.ordersTrend >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
              {stats.ordersTrend >= 0 ? '+' : ''}{stats.ordersTrend}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1 font-medium">Commandes aujourd'hui</p>
          <p className="text-4xl font-bold text-gray-100">{stats.ordersToday}</p>
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">Objectif: 50 commandes/jour</p>
            <div className="mt-2 w-full bg-gray-700/40 rounded-full h-1.5">
              <div className="bg-gray-600 h-1.5 rounded-full" 
                style={{ width: `${Math.min((stats.ordersToday / 50) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Réservations */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6 group hover:border-gray-600/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gray-700/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${
              stats.reservationsTrend >= 0 
                ? 'text-gray-300 bg-gray-700/30' 
                : 'text-gray-400 bg-gray-700/20'
            }`}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={stats.reservationsTrend >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
              {stats.reservationsTrend >= 0 ? '+' : ''}{stats.reservationsTrend}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1 font-medium">Réservations</p>
          <p className="text-4xl font-bold text-gray-100">{stats.reservationsToday}</p>
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">{stats.pendingReservations} en attente de confirmation</p>
          </div>
        </div>

        {/* Revenus du jour */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6 group hover:border-gray-600/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gray-700/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${
              stats.revenueTrend >= 0 
                ? 'text-gray-300 bg-gray-700/30' 
                : 'text-gray-400 bg-gray-700/20'
            }`}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={stats.revenueTrend >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
              {stats.revenueTrend >= 0 ? '+' : ''}{stats.revenueTrend}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1 font-medium">Revenus du jour</p>
          <p className="text-4xl font-bold text-gray-100">
            {stats.revenueToday ? (stats.revenueToday >= 1000 ? (stats.revenueToday / 1000).toFixed(1) + 'K' : stats.revenueToday) : '0'}K
          </p>
          <p className="text-xs text-gray-500 mt-1">{formatPrice(stats.revenueToday)}</p>
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">Panier moyen: {formatPrice(stats.averageBasket)}</p>
          </div>
        </div>

        {/* Clients actifs */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6 group hover:border-gray-600/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gray-700/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${
              stats.clientsTrend >= 0 
                ? 'text-gray-300 bg-gray-700/30' 
                : 'text-gray-400 bg-gray-700/20'
            }`}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={stats.clientsTrend >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
              {stats.clientsTrend >= 0 ? '+' : ''}{stats.clientsTrend}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1 font-medium">Clients actifs</p>
          <p className="text-4xl font-bold text-gray-100">{stats.activeClients}</p>
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">Total enregistrés</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commandes récentes */}
        <div className="lg:col-span-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-100">Commandes récentes</h2>
            <span className="text-sm text-gray-500">Aujourd'hui</span>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order, index) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900/70 transition-all duration-300 border border-gray-800/50 hover:border-gray-700/50 group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-gray-300 font-bold">{order.items?.length || 0}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-gray-100 font-semibold">#{order.id}</p>
                          <span className="bg-gray-700/40 text-gray-300 text-xs px-2 py-1 rounded-full">
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {order.tableNumber ? `Table ${order.tableNumber}` : order.deliveryType || 'Sur place'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-100 font-bold text-lg">{formatPrice(order.total)}</p>
                      <p className="text-gray-500 text-sm">{formatTime(order.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                Aucune commande récente
              </div>
            )}
          </div>
        </div>

        {/* Alertes et statistiques rapides */}
        <div className="space-y-6">
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-gray-100 mb-4">🍽️ Top 3 meilleurs plats</h3>
            <div className="space-y-3">
              {stats.topDishes && stats.topDishes.length > 0 ? (
                stats.topDishes.map((dish, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-all border border-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700/40 rounded-full flex items-center justify-center">
                        <span className="text-gray-300 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-gray-100 font-semibold text-sm">{dish.name}</p>
                        <p className="text-gray-500 text-xs">{dish.quantity} vendus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 font-bold text-sm">{formatPrice(dish.revenue)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-gray-100 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <button className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-all font-medium">
                Nouvelle commande
              </button>
              <button className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-all font-medium">
                Nouvelle réservation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
