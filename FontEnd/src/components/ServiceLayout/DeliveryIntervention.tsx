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
  notes?: string;
  items?: any[];
  total?: number;
  problem?: {
    type: 'address_not_found' | 'client_absent' | 'incident' | 'other';
    description: string;
    reportedAt: string;
    reportedBy: string;
  };
}

interface DriverInfo {
  id: string;
  name: string;
  activeDeliveries: number;
  status: 'available' | 'busy' | 'offline';
}

export const DeliveryIntervention = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [problemType, setProblemType] = useState<string>('address_not_found');
  const [problemDescription, setProblemDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const [deliveriesRes, driversRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/employees?type=livreur`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

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
        // Mock driver status - in production, fetch from real-time tracking
        const driversInfo: DriverInfo[] = driversData.map((d: any) => ({
          id: d.id,
          name: d.name,
          activeDeliveries: 0,
          status: 'available' as const
        }));
        setDrivers(driversInfo);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const reportProblem = async () => {
    if (!selectedDelivery || !problemDescription) {
      toast.error('Veuillez décrire le problème', { duration: 3000 });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/orders/${selectedDelivery.id}/problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: problemType,
          description: problemDescription
        })
      });

      if (res.ok) {
        toast.success('❗ Problème signalé', { duration: 2500 });
        setShowProblemModal(false);
        setProblemDescription('');
        loadData();
      } else {
        toast.error('Erreur lors du signalement', { duration: 3000 });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur réseau', { duration: 3000 });
    }
  };

  const reassignDelivery = async (newDriverId: string) => {
    if (!selectedDelivery) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/orders/${selectedDelivery.id}/reassign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ driverId: newDriverId })
      });

      if (res.ok) {
        toast.success('✓ Livraison réassignée', { duration: 2500 });
        setShowReassignModal(false);
        loadData();
      } else {
        toast.error('Erreur lors de la réassignation', { duration: 3000 });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur réseau', { duration: 3000 });
    }
  };

  const rescheduleDelivery = async (newTime: string) => {
    if (!selectedDelivery) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/orders/${selectedDelivery.id}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scheduledTime: newTime })
      });

      if (res.ok) {
        toast.success('📅 Livraison reprogramée', { duration: 2500 });
        loadData();
      } else {
        toast.error('Erreur lors de la reprogrammation', { duration: 3000 });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur réseau', { duration: 3000 });
    }
  };

  const filteredDeliveries = deliveries.filter(d =>
    !searchQuery ||
    d.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.includes(searchQuery)
  );

  const problemDeliveries = filteredDeliveries.filter(d => d.problem);
  const normalDeliveries = filteredDeliveries.filter(d => !d.problem);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Intervention Livraisons
        </h1>
        <p className="text-gray-400">Gérez les problèmes et réassignez les livraisons</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Livraisons actives</p>
              <p className="text-3xl font-bold text-white">{deliveries.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Problèmes signalés</p>
              <p className="text-3xl font-bold text-red-400">{problemDeliveries.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Livreurs disponibles</p>
              <p className="text-3xl font-bold text-emerald-400">{drivers.filter(d => d.status === 'available').length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">En attente</p>
              <p className="text-3xl font-bold text-amber-400">{deliveries.filter(d => d.status === 'pending').length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par client, adresse ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
      </div>

      {/* Problem Deliveries Section */}
      {problemDeliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            Problèmes à résoudre ({problemDeliveries.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problemDeliveries.map(delivery => (
              <div key={delivery.id} className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold">{delivery.userName || 'Client'}</p>
                    <p className="text-xs text-gray-400">{delivery.phone}</p>
                  </div>
                  <span className="px-3 py-1 bg-red-500/30 text-red-300 text-xs font-bold rounded-lg border border-red-500/50">
                    PROBLÈME
                  </span>
                </div>

                {delivery.problem && (
                  <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-300 text-xs font-semibold mb-1">
                      {delivery.problem.type === 'address_not_found' && '📍 Adresse introuvable'}
                      {delivery.problem.type === 'client_absent' && '👤 Client absent'}
                      {delivery.problem.type === 'incident' && '⚠️ Incident'}
                      {delivery.problem.type === 'other' && '❓ Autre problème'}
                    </p>
                    <p className="text-gray-300 text-xs">{delivery.problem.description}</p>
                  </div>
                )}

                <div className="space-y-2 text-sm text-gray-300">
                  <p>📍 {delivery.address || 'Adresse non disponible'}</p>
                  <p>🚚 {delivery.driverName || 'Livreur non assigné'}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-red-500/30">
                  <button
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setShowReassignModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition"
                  >
                    Réassigner
                  </button>
                  <button
                    onClick={() => setSelectedDelivery(delivery)}
                    className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-semibold transition"
                  >
                    Détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal Deliveries */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Livraisons en cours ({normalDeliveries.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {normalDeliveries.map(delivery => (
            <div key={delivery.id} className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-5 space-y-3 hover:border-cyan-500/50 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-bold">{delivery.userName || 'Client'}</p>
                  <p className="text-xs text-gray-400">{delivery.phone}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
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

              <div className="space-y-2 text-sm text-gray-300">
                <p>📍 {delivery.address || 'Adresse non disponible'}</p>
                <p>🚚 {delivery.driverName || 'Livreur non assigné'}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-neutral-700/50">
                <button
                  onClick={() => {
                    setSelectedDelivery(delivery);
                    setShowProblemModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-sm font-semibold transition"
                >
                  Signaler
                </button>
                <button
                  onClick={() => {
                    setSelectedDelivery(delivery);
                    setShowReassignModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-sm font-semibold transition"
                >
                  Réassigner
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-xl">Aucune livraison active</p>
        </div>
      )}

      {/* Problem Report Modal */}
      {showProblemModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Signaler un problème</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Type de problème</label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="address_not_found">Adresse introuvable</option>
                  <option value="client_absent">Client absent</option>
                  <option value="incident">Incident</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Décrivez le problème en détail..."
                  rows={4}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={reportProblem}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition"
                >
                  Signaler
                </button>
                <button
                  onClick={() => {
                    setShowProblemModal(false);
                    setProblemDescription('');
                  }}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-semibold transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Réassigner la livraison</h2>
            
            <div className="space-y-3 mb-6">
              {drivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => reassignDelivery(driver.id)}
                  className="w-full p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-cyan-500 rounded-lg text-left transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold group-hover:text-cyan-400">{driver.name}</p>
                      <p className="text-xs text-gray-400">{driver.activeDeliveries} livraison(s) active(s)</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      driver.status === 'available' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      driver.status === 'busy' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {driver.status === 'available' ? 'Disponible' : driver.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                    </span>
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
