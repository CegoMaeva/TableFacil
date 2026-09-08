/**
 * Manager Supervision Dashboard
 * Vue globale de toutes les commandes et KPI
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Card, Button, Badge, Modal, Input } from '../../components/UI';
import { LineChart, BarChart, PieChart } from 'recharts';

interface DashboardData {
  statuses: Record<string, number>;
  late_orders_count: number;
  active_drivers: number;
  incidents: number;
  completed_today: number;
  active_drivers_list: Array<{
    driver_id: string;
    driver_name: string;
    current_order: string;
    status: string;
  }>;
}

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [intervention, setIntervention] = useState({
    action: 'reassign_driver',
    reason: '',
    new_driver_id: '',
  });

  // Charger le dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/workflow/manager/dashboard');
        setDashboard(response.data);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  const handleIntervene = async () => {
    if (!selectedOrder) return;

    try {
      await api.post(`/workflow/manager/orders/${selectedOrder}/intervene`, {
        action: intervention.action,
        reason: intervention.reason,
        new_driver_id: intervention.new_driver_id,
      });

      setShowInterventionModal(false);
      // Rafraîchir
      const response = await api.get('/workflow/manager/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <p className="text-red-400">Erreur de chargement</p>
      </div>
    );
  }

  // KPI Cards
  const kpiCards = [
    {
      title: 'Commandes aujourd\'hui',
      value: dashboard.completed_today,
      icon: '✅',
      color: 'green',
    },
    {
      title: 'Livreurs actifs',
      value: dashboard.active_drivers,
      icon: '🚗',
      color: 'blue',
    },
    {
      title: 'Commandes retardataires',
      value: dashboard.late_orders_count,
      icon: '⏱️',
      color: 'red',
    },
    {
      title: 'Incidents non résolus',
      value: dashboard.incidents,
      icon: '⚠️',
      color: 'orange',
    },
  ];

  // Statut totaux
  const statusBreakdown = Object.entries(dashboard.statuses).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').toUpperCase(),
    value: count,
  }));

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">📊 Tableau de Bord Gérant</h1>
          <p className="text-gray-400">Supervision globale des commandes</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-sm font-semibold">{kpi.title}</p>
                <span className="text-3xl">{kpi.icon}</span>
              </div>
              <p className={`text-3xl font-bold ${
                kpi.color === 'green' ? 'text-green-400' :
                kpi.color === 'blue' ? 'text-blue-400' :
                kpi.color === 'red' ? 'text-red-400' :
                'text-orange-400'
              }`}>
                {kpi.value}
              </p>
            </Card>
          ))}
        </div>

        {/* Répartition par statut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Graphique */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Répartition par statut</h2>
            <div className="space-y-2">
              {statusBreakdown.map((status, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <p className="text-gray-300 text-sm">{status.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-brand-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (status.value / Math.max(...statusBreakdown.map(s => s.value))) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-brand-400 font-semibold text-sm min-w-8">
                      {status.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Livreurs actifs */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">🚚 Livreurs actifs</h2>
            <div className="space-y-3">
              {dashboard.active_drivers_list.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun livreur actif</p>
              ) : (
                dashboard.active_drivers_list.map((driver, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded"
                  >
                    <div>
                      <p className="font-semibold text-white">{driver.driver_name}</p>
                      <p className="text-xs text-gray-400">{driver.current_order}</p>
                    </div>
                    <Badge variant="success">{driver.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Commandes retardataires */}
        {dashboard.late_orders_count > 0 && (
          <Card className="p-6 mb-8 border-2 border-red-500">
            <h2 className="text-xl font-bold text-white mb-4">
              ⚠️ {dashboard.late_orders_count} commande(s) retardataire(s)
            </h2>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                Ces commandes dépassent le délai estimé. Veuillez intervenir.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowInterventionModal(true)}
                  variant="warning"
                  className="flex-1"
                >
                  Voir et intervenir
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Actions rapides */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">⚙️ Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="secondary" className="w-full text-sm">
              📋 Voir tous les tickets
            </Button>
            <Button variant="secondary" className="w-full text-sm">
              📞 Incidents service client
            </Button>
            <Button variant="secondary" className="w-full text-sm">
              📊 Analytics
            </Button>
            <Button variant="secondary" className="w-full text-sm">
              ⚙️ Paramètres
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal intervention */}
      <Modal
        isOpen={showInterventionModal}
        onClose={() => setShowInterventionModal(false)}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Intervenir sur une commande</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                ID Commande
              </label>
              <Input
                type="text"
                value={selectedOrder || ''}
                onChange={(e) => setSelectedOrder(e.target.value)}
                placeholder="CMD-20250609-0001"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Action
              </label>
              <select
                value={intervention.action}
                onChange={(e) =>
                  setIntervention({ ...intervention, action: e.target.value })
                }
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
              >
                <option value="reassign_driver">Réassigner un livreur</option>
                <option value="expedite">Accélérer</option>
                <option value="cancel">Annuler</option>
              </select>
            </div>

            {intervention.action === 'reassign_driver' && (
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Nouveau livreur
                </label>
                <Input
                  type="text"
                  value={intervention.new_driver_id}
                  onChange={(e) =>
                    setIntervention({ ...intervention, new_driver_id: e.target.value })
                  }
                  placeholder="ID du livreur"
                />
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Raison
              </label>
              <textarea
                value={intervention.reason}
                onChange={(e) =>
                  setIntervention({ ...intervention, reason: e.target.value })
                }
                placeholder="Expliquer le motif..."
                className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 h-20"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowInterventionModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleIntervene}
              variant="warning"
              className="flex-1"
            >
              Intervenir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
