import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Delivery {
  id: string;
  userName?: string;
  address?: string;
  phone?: string;
  status: string;
  driverName?: string;
  driverId?: string;
  createdAt: string;
  items?: any[];
  total?: number;
  estimatedTime?: number;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

interface DriverStats {
  id: string;
  name: string;
  activeDeliveries: number;
  completedToday: number;
  averageTime: number;
  rating: number;
  status: 'available' | 'busy' | 'offline';
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface GlobalStats {
  totalDeliveriesToday: number;
  completedToday: number;
  inProgress: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  topZones: { zone: string; count: number }[];
}

export const DeliverySupervision = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Real-time refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Load deliveries
      const deliveriesRes = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load drivers
      const driversRes = await fetch(`${API_BASE_URL}/api/employees?type=livreur`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load stats
      const statsRes = await fetch(`${API_BASE_URL}/api/deliveries/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        const activeDeliveries = data.filter((d: any) =>
          (d.type === 'delivery' || d.type === 'livraison') &&
          ['pending', 'preparing', 'ready', 'en_route'].includes(d.status)
        );
        setDeliveries(activeDeliveries);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        // Mock driver stats - in production, calculate from real data
        const driversArray = Array.isArray(driversData) ? driversData : driversData.drivers || [];
        const driversStats: DriverStats[] = driversArray.map((d: any) => ({
          id: d.id,
          name: d.name,
          activeDeliveries: Math.floor(Math.random() * 3),
          completedToday: Math.floor(Math.random() * 15),
          averageTime: Math.floor(Math.random() * 30) + 15,
          rating: 4.5 + Math.random() * 0.5,
          status: Math.random() > 0.3 ? 'available' : 'busy'
        }));
        setDrivers(driversStats);
      }

      if (statsRes.ok || statsRes.status === 404) {
        const stats = statsRes.ok ? await statsRes.json() : {};
        setGlobalStats({
          totalDeliveriesToday: stats.totalDeliveries || 0,
          completedToday: stats.completedDeliveries || 0,
          inProgress: deliveries.length,
          averageDeliveryTime: stats.averageTime || 0,
          customerSatisfaction: stats.averageRating || 0,
          topZones: stats.topZones || []
        });
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const reassignDelivery = async (deliveryId: string, newDriverId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/orders/${deliveryId}/reassign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ driverId: newDriverId })
      });

      if (res.ok) {
        toast.success('✓ Livraison redistribuée', { duration: 2500 });
        setShowReassignModal(false);
        loadData();
      } else {
        toast.error('Erreur lors de la redistribution', { duration: 3000 });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur réseau', { duration: 3000 });
    }
  };

  const filteredDeliveries = selectedDriver
    ? deliveries.filter(d => d.driverId === selectedDriver)
    : deliveries;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Supervision Livraisons
            </h1>
            <p className="text-gray-400">Vue d'ensemble en temps réel des livraisons et livreurs</p>
          </div>
          
          <div className="flex items-center gap-2 bg-neutral-800/50 border border-neutral-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'map'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Aujourd'hui</p>
                <p className="text-3xl font-bold text-white">{globalStats?.totalDeliveriesToday || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Complétées</p>
                <p className="text-3xl font-bold text-emerald-400">{globalStats?.completedToday || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">En cours</p>
                <p className="text-3xl font-bold text-cyan-400">{deliveries.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Temps moy.</p>
                <p className="text-3xl font-bold text-amber-400">{Math.round(globalStats?.averageDeliveryTime || 0)}min</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-pink-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Satisfaction</p>
                <p className="text-3xl font-bold text-pink-400">{(globalStats?.customerSatisfaction || 0).toFixed(1)}★</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              Livreurs ({drivers.length})
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedDriver(null)}
                className={`w-full p-3 rounded-lg text-left transition ${
                  selectedDriver === null
                    ? 'bg-purple-500/20 border-2 border-purple-500'
                    : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <p className="text-white font-semibold">Tous les livreurs</p>
                <p className="text-xs text-gray-400">{deliveries.length} livraison(s) active(s)</p>
              </button>

              {drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  className={`w-full p-3 rounded-lg text-left transition ${
                    selectedDriver === driver.id
                      ? 'bg-purple-500/20 border-2 border-purple-500'
                      : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-semibold">{driver.name}</p>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      driver.status === 'available' ? 'bg-emerald-500/20 text-emerald-300' :
                      driver.status === 'busy' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {driver.status === 'available' ? 'Dispo' : driver.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>
                      <p>En cours: <span className="text-cyan-400 font-semibold">{driver.activeDeliveries}</span></p>
                      <p>Complété: <span className="text-emerald-400 font-semibold">{driver.completedToday}</span></p>
                    </div>
                    <div>
                      <p>Temps moy: <span className="text-amber-400 font-semibold">{driver.averageTime}min</span></p>
                      <p>Note: <span className="text-pink-400 font-semibold">{driver.rating.toFixed(1)}★</span></p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deliveries Panel */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-5">
            <h2 className="text-xl font-bold text-white mb-4">
              Livraisons actives ({filteredDeliveries.length})
            </h2>

            {viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredDeliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:border-purple-500/50 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-white font-bold">{delivery.userName || 'Client'}</p>
                        <p className="text-sm text-gray-400">{delivery.address}</p>
                        <p className="text-xs text-gray-500">{delivery.phone}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                        delivery.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        delivery.status === 'preparing' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                        delivery.status === 'ready' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {delivery.status === 'pending' && 'En attente'}
                        {delivery.status === 'preparing' && 'Préparation'}
                        {delivery.status === 'ready' && 'Prête'}
                        {delivery.status === 'en_route' && 'En route'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-700">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                        </svg>
                        <span>{delivery.driverName || 'Non assigné'}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setShowReassignModal(true);
                        }}
                        className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition"
                      >
                        Redistribuer
                      </button>
                    </div>
                  </div>
                ))}

                {filteredDeliveries.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Aucune livraison active</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg h-96 flex items-center justify-center">
                <p className="text-gray-400">Carte GPS (intégration Google Maps à venir)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Redistribuer la livraison</h2>

            <div className="space-y-3 mb-6">
              {drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => {
                    reassignDelivery(selectedDelivery.id, driver.id);
                  }}
                  className="w-full p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-purple-500 rounded-lg text-left transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold group-hover:text-purple-400">{driver.name}</p>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      driver.status === 'available' ? 'bg-emerald-500/20 text-emerald-300' :
                      driver.status === 'busy' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {driver.status === 'available' ? 'Disponible' : driver.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{driver.activeDeliveries} en cours</span>
                    <span>Moy: {driver.averageTime}min</span>
                    <span>{driver.rating.toFixed(1)}★</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowReassignModal(false)}
              className="w-full px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-semibold transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
