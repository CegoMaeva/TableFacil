import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface DashboardStats {
  ordersToday: number;
  ordersVariation: number;
  reservationsToday: number;
  reservationsPending: number;
  revenueToday: number;
  averageBasket: number;
  activeClients: number;
}

interface PopularItem {
  name: string;
  orders: number;
  revenue: number;
}

interface CustomerStats {
  newClients: number;
  loyalClients: number;
  inactiveClients: number;
  satisfaction: number;
}

export const Analytics = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [ordersAnalytics, setOrdersAnalytics] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      // Charger les stats du dashboard
      const dashboardRes = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardStats(data);
      } else {
        const error = await dashboardRes.json();
        console.error('Erreur dashboard:', error);
      }

      // Charger les plats populaires
      const itemsRes = await fetch(`${API_BASE_URL}/api/analytics/popular-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setPopularItems(data);
      } else {
        const error = await itemsRes.json();
        console.error('Erreur popular items:', error);
      }

      // Charger les analytics des commandes
      const ordersRes = await fetch(`${API_BASE_URL}/api/analytics/orders?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrdersAnalytics(data);
      } else {
        const error = await ordersRes.json();
        console.error('Erreur orders analytics:', error);
      }

      // Statistiques clients
      const customersRes = await fetch(`${API_BASE_URL}/api/analytics/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomerStats(data);
      } else {
        const error = await customersRes.json();
        console.error('Erreur customer stats:', error);
      }

      // Employés performants
      const staffRes = await fetch(`${API_BASE_URL}/api/analytics/top-staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (staffRes.ok) {
        const data = await staffRes.json();
        setTopStaff(data);
      } else {
        const error = await staffRes.json();
        console.error('Erreur top staff:', error);
      }

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Chargement des statistiques...</div>
      </div>
    );
  }

  // Calculer les KPIs
  const totalRevenue = dashboardStats?.revenueToday || 0;
  const totalOrders = dashboardStats?.ordersToday || 0;
  const clients = dashboardStats?.activeClients || 0;
  const avgBasket = dashboardStats?.averageBasket || 0;

  // Données de ventes hebdomadaires - Transformer le dictionnaire en tableau
  const salesData = Object.entries(ordersAnalytics?.dailyRevenue || {}).map(([date, revenue]: [string, any]) => ({
    day: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
    ventes: revenue,
    commandes: 0  // À calculer si nécessaire
  }));

  // Plats populaires pour le graphique circulaire
  const dishesData = popularItems.slice(0, 5).map((item, index) => ({
    name: item.name,
    value: item.orders,
    color: ['bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'][index],
    sales: item.revenue
  }));

  // Heures de pointe (données mock - pas encore dans l'API)
  const peakHours = [
    { heure: '11h', commandes: 5 },
    { heure: '12h', commandes: 25 },
    { heure: '13h', commandes: 32 },
    { heure: '14h', commandes: 18 },
    { heure: '19h', commandes: 35 },
    { heure: '20h', commandes: 42 },
    { heure: '21h', commandes: 28 },
    { heure: '22h', commandes: 12 },
  ];

  const currentCustomerStats: CustomerStats = customerStats ?? {
    newClients: 0,
    loyalClients: 0,
    inactiveClients: 0,
    satisfaction: 0,
  };

  const maxSales = salesData.length > 0 ? Math.max(...salesData.map(d => d.ventes)) : 0;
  const maxOrders = Math.max(...peakHours.map(d => d.commandes));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analyses & Statistiques</h1>
          <p className="text-gray-400">Vue d'ensemble des performances du restaurant</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-emerald-400 flex items-center gap-1 font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +{dashboardStats?.ordersVariation || 0}%
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Revenus totaux</p>
          <p className="text-2xl font-bold text-white">{(totalRevenue / 1000).toFixed(0)}K FCFA</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm text-emerald-400 flex items-center gap-1 font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +{dashboardStats?.ordersVariation || 0}%
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Commandes</p>
          <p className="text-2xl font-bold text-white">{totalOrders}</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm text-emerald-400 flex items-center gap-1 font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +8%
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Clients</p>
          <p className="text-2xl font-bold text-white">{clients}</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">Moyenne</span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Panier moyen</p>
          <p className="text-2xl font-bold text-white">{Math.round(avgBasket)} FCFA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes hebdomadaires avec graphique à barres interactif */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">📊 Ventes hebdomadaires (Graphique)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="ventes" fill="#10b981" name="Ventes (FCFA)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heures de pointe avec graphique linéaire */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">⏰ Heures de pointe (Graphique)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="heure" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="commandes" stroke="#f97316" strokeWidth={2} name="Commandes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plats populaires avec graphique circulaire */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">🍽️ Plats populaires (Graphique)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dishesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dishesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '#').replace('-500', '')} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique de commandes par jour */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">📦 Commandes par jour (Graphique)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="commandes" stroke="#3b82f6" strokeWidth={2} name="Commandes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ventes hebdomadaires - Version simple */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">📊 Ventes hebdomadaires (Simple)</h2>
          <div className="space-y-3">
            {salesData.map((day) => (
              <div key={day.day}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300">{day.day}</span>
                  <span className="text-white font-semibold">{(day.ventes / 1000).toFixed(0)}K FCFA</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all"
                    style={{ width: `${(day.ventes / maxSales) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{day.commandes} commandes</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plats populaires - Version simple */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">🍽️ Plats les plus commandés (Simple)</h2>
          <div className="space-y-4">
            {dishesData.slice(0, 3).map((dish, index) => (
              <div key={dish.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                    <div>
                      <p className="text-white font-semibold">{dish.name}</p>
                      <p className="text-xs text-gray-500">{dish.sales.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <span className="text-white font-bold">{dish.value}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`${dish.color} h-2 rounded-full`}
                    style={{ width: `${dish.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heures de pointe - Version simple */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">⏰ Heures de pointe (Simple)</h2>
          <div className="flex items-end justify-between h-64 gap-2">
            {peakHours.map((hour) => (
              <div key={hour.heure} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-white font-semibold mb-1">{hour.commandes}</div>
                <div
                  className="w-full bg-gradient-to-t from-orange-500 to-yellow-500 rounded-t-lg"
                  style={{ height: `${(hour.commandes / maxOrders) * 100}%` }}
                />
                <div className="text-xs text-gray-400 mt-2">{hour.heure}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats clients */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">👥 Statistiques clients</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm mb-1">Nouveaux clients</p>
              <p className="text-3xl font-bold text-white">{currentCustomerStats.newClients}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm mb-1">Clients fidèles</p>
              <p className="text-3xl font-bold text-white">{currentCustomerStats.loyalClients}</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-1">Satisfaction</p>
              <p className="text-3xl font-bold text-white">{currentCustomerStats.satisfaction.toFixed(1)}⭐</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm mb-1">Inactifs (30j)</p>
              <p className="text-3xl font-bold text-white">{currentCustomerStats.inactiveClients}</p>
            </div>
          </div>
        </div>

        {/* Top Staff */}
        
      </div>
    </div>
  );
};
