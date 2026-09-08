import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Reservation {
  id: string;
  clientId: string;
  customer: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  table?: string;
  zone?: 'Standard' | 'VIP' | 'Terrasse';
  status: string; // 'En attente', 'Confirmée', 'Annulée', 'Terminée'
  depositAmount?: number;
  depositStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited';
  depositPaidAt?: string;
  paymentMethod?: 'card' | 'paypal';
  attended?: boolean | null;
  notes?: string;
  occasion?: string;
  createdAt: string;
  updatedAt: string;
}

export const ReservationsManagement = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReservations();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadReservations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadReservations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }

      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les réservations');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { color: string; bgColor: string }> = {
    'En attente': { color: 'text-amber-400 border-amber-500/30', bgColor: 'bg-amber-500/10' },
    'Confirmée': { color: 'text-emerald-400 border-emerald-500/30', bgColor: 'bg-emerald-500/10' },
    'Annulée': { color: 'text-red-400 border-red-500/30', bgColor: 'bg-red-500/10' },
    'Terminée': { color: 'text-blue-400 border-blue-500/30', bgColor: 'bg-blue-500/10' },
    // Fallback pour les anciens statuts anglais
    'pending': { color: 'text-amber-400 border-amber-500/30', bgColor: 'bg-amber-500/10' },
    'confirmed': { color: 'text-emerald-400 border-emerald-500/30', bgColor: 'bg-emerald-500/10' },
    'cancelled': { color: 'text-red-400 border-red-500/30', bgColor: 'bg-red-500/10' },
    'completed': { color: 'text-blue-400 border-blue-500/30', bgColor: 'bg-blue-500/10' }
  };

  const normalizeStatus = (status: string) => {
    const map: Record<string, string> = {
      'pending': 'En attente',
      'confirmed': 'Confirmée',
      'cancelled': 'Annulée',
      'completed': 'Terminée'
    };
    return map[status] || status;
  };

  const filterReservations = () => {
    let filtered = reservations;

    if (selectedDate !== 'all') {
      filtered = filtered.filter(r => r.date === selectedDate);
    }

    if (filterStatus !== 'all') {
      // Normaliser la comparaison des statuts (français et anglais)
      const statusMap: Record<string, string[]> = {
        'En attente': ['En attente', 'pending'],
        'Confirmée': ['Confirmée', 'confirmed'],
        'Annulée': ['Annulée', 'cancelled'],
        'Terminée': ['Terminée', 'completed'],
        'pending': ['En attente', 'pending'],
        'confirmed': ['Confirmée', 'confirmed'],
        'cancelled': ['Annulée', 'cancelled'],
        'completed': ['Terminée', 'completed']
      };
      
      const acceptedStatuses = statusMap[filterStatus] || [filterStatus];
      filtered = filtered.filter(r => acceptedStatuses.includes(r.status));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.customer && r.customer.toLowerCase().includes(query)) ||
        r.phone.includes(searchQuery) ||
        (r.email && r.email.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  };

  const handleConfirm = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Confirmée' })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la confirmation');
      }

      const updated = await response.json();
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success('✅ Réservation confirmée - Le client sera notifié');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de confirmer la réservation');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation');
      }

      const updated = await response.json();
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success('Réservation annulée');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible d\'annuler la réservation');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la completion');
      }

      const updated = await response.json();
      setReservations(reservations.map(r => r.id === id ? updated : r));
      toast.success('Réservation marquée comme terminée');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de terminer la réservation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette réservation ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setReservations(reservations.filter(r => r.id !== id));
      toast.success('Réservation supprimée');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de supprimer la réservation');
    }
  };

  const handleMarkAttended = async (reservationId: string, attended: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/mark-attended`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attended })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du marquage');
      }

      const updated = await response.json();
      setReservations(reservations.map(r => r.id === reservationId ? updated.reservation : r));
      
      if (attended) {
        toast.success('✅ Client marqué présent - Acompte remboursé');
      } else {
        toast.warning('❌ Client marqué absent - Acompte conservé');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible de marquer la présence');
    }
  };

  const handleUpdate = async (reservation: Reservation) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservation)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const updated = await response.json();
      setReservations(reservations.map(r => r.id === reservation.id ? updated : r));
      setEditingReservation(null);
      toast.success('Réservation mise à jour');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de mettre à jour la réservation');
    }
  };

  const handleAddNew = async (reservationData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      // Utiliser l'endpoint gérant
      const response = await fetch(`${API_BASE_URL}/api/reservations/admin/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de la création');
      }

      const payload = await response.json();
      // Ajouter la nouvelle réservation à la liste locale
      setReservations((prev) => [payload.reservation, ...prev]);
      setShowAddForm(false);
      toast.success('✅ Réservation créée');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible de créer la réservation');
    }
  };

  const handleSaveEdit = async (reservation: any) => {
    // Réutilise handleUpdate existant
    await handleUpdate(reservation);
  };

  const handleAddAvailability = async (slotData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reservations/admin/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slotData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de l\'ajout de disponibilité');
      }

      const payload = await response.json();
      setShowAvailabilityForm(false);
      toast.success('✅ Disponibilité ajoutée');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Impossible d\'ajouter la disponibilité');
    }
  };

  const filteredReservations = filterReservations();
  const uniqueDates = Array.from(new Set(reservations.map(r => r.date))).sort();

  // Stats
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => normalizeStatus(r.status) === 'En attente').length,
    confirmed: reservations.filter(r => normalizeStatus(r.status) === 'Confirmée').length,
    today: reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des réservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">Gestion des Réservations</h1>
            <p className="text-gray-400">Consultez et gérez toutes vos réservations</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Nouvelle réservation
            </button>

            <button
              onClick={() => setShowAvailabilityForm(true)}
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
              </svg>
              Ajouter disponibilité
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">En attente</p>
                <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Confirmées</p>
                <p className="text-3xl font-bold text-emerald-400">{stats.confirmed}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Aujourd'hui</p>
                <p className="text-3xl font-bold text-blue-400">{stats.today}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7h-2v5h2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all backdrop-blur-sm"
          />
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-400 px-1">Filtrer par date</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedDate('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedDate === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-neutral-800/50 text-gray-400 hover:text-white hover:bg-neutral-700/50 border border-neutral-700/50'
              }`}
            >
              Toutes les dates
            </button>
            {uniqueDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedDate === date
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                    : 'bg-neutral-800/50 text-gray-400 hover:text-white hover:bg-neutral-700/50 border border-neutral-700/50'
                }`}
              >
                {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
                <span className="ml-2 text-xs opacity-60">
                  ({reservations.filter(r => r.date === date).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-400 px-1">Filtrer par statut</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-neutral-800/50 text-gray-400 hover:text-white hover:bg-neutral-700/50 border border-neutral-700/50'
              }`}
            >
              Tous les statuts
            </button>
            {['En attente', 'Confirmée', 'Annulée', 'Terminée'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                    : 'bg-neutral-800/50 text-gray-400 hover:text-white hover:bg-neutral-700/50 border border-neutral-700/50'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${
                  status === 'En attente' ? 'bg-amber-400' :
                  status === 'Confirmée' ? 'bg-emerald-400' :
                  status === 'Annulée' ? 'bg-red-400' :
                  'bg-blue-400'
                }`}></span>
                {status}
                <span className="text-xs opacity-60">
                  ({reservations.filter(r => normalizeStatus(r.status) === status).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingReservation) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const reservationData: any = {
                  customer: formData.get('customer') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  date: formData.get('date') as string,
                  time: formData.get('time') as string,
                  guests: Number(formData.get('guests')),
                  table: formData.get('table') as string,
                  zone: 'Restaurant',
                  status: formData.get('status') as Reservation['status'],
                  auto_confirm: formData.get('auto_confirm') === 'on',
                  notes: formData.get('notes') as string,
                  occasion: formData.get('occasion') as string || undefined
                };

                if (editingReservation) {
                  handleSaveEdit({ ...reservationData, id: editingReservation.id });
                } else {
                  handleAddNew(reservationData);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nom du client *</label>
                  <input
                    name="customer"
                    defaultValue={editingReservation?.customer}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Téléphone *</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={editingReservation?.phone}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="77 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingReservation?.email}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date *</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editingReservation?.date}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Heure *</label>
                  <input
                    name="time"
                    type="time"
                    defaultValue={editingReservation?.time}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nombre de personnes *</label>
                  <select
                    name="guests"
                    defaultValue={editingReservation?.guests || 2}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                      <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Table *</label>
                  <select
                    name="table"
                    defaultValue={editingReservation?.table || 'T2'}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="T2">Table T2 (2 personnes)</option>
                    <option value="T9">Table T9 (4 personnes)</option>
                    <option value="T11">Table T11 (4 personnes)</option>
                    <option value="T13">Table T13 (4 personnes)</option>
                    <option value="T14">Table T14 (4 personnes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Occasion</label>
                  <input
                    name="occasion"
                    defaultValue={editingReservation?.occasion}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Anniversaire, rendez-vous..."
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Statut *</label>
                  <select
                    name="status"
                    defaultValue={editingReservation?.status || 'En attente'}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="En attente">⏳ En attente</option>
                    <option value="Confirmée">✅ Confirmée</option>
                    <option value="Annulée">❌ Annulée</option>
                    <option value="Terminée">✔️ Terminée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editingReservation?.notes}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Allergies, demandes spéciales..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                >
                  {editingReservation ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReservation(null);
                    setShowAddForm(false);
                  }}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="auto_confirm" id="auto_confirm" className="w-4 h-4" />
                <label htmlFor="auto_confirm" className="text-gray-300">Confirmer immédiatement (marquer l'acompte comme payé)</label>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Form Modal */}
      {showAvailabilityForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-lg w-full my-8">
            <h2 className="text-2xl font-bold text-white mb-6">Ajouter une disponibilité</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const slot = {
                  date: formData.get('date') as string,
                  start_time: formData.get('start_time') as string,
                  end_time: formData.get('end_time') as string,
                  zone: formData.get('zone') as string,
                  capacity: Number(formData.get('capacity')),
                  notes: formData.get('notes') as string
                };
                handleAddAvailability(slot);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date *</label>
                  <input name="date" type="date" required className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Heure début *</label>
                  <input name="start_time" type="time" required className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Heure fin *</label>
                  <input name="end_time" type="time" required className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Zone *</label>
                  <select name="zone" required className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                    <option value="Standard">Standard</option>
                    <option value="VIP">VIP</option>
                    <option value="Terrasse">Terrasse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Capacité *</label>
                  <input name="capacity" type="number" required min={1} defaultValue={4} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Notes</label>
                  <input name="notes" className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg">Ajouter</button>
                <button type="button" onClick={() => setShowAvailabilityForm(false)} className="px-6 py-3 bg-gray-700 text-white rounded-lg">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reservations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReservations.map((reservation, index) => (
          <div
            key={reservation.id}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden transition-all hover:border-emerald-500/40 hover:shadow-2xl"
          >
            <div className="p-5 space-y-4">
              {/* En-tête */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Réservation #{index + 1}</p>
                  <p className="text-sm text-gray-400">Statut : <span className={
                    reservation.status === 'Confirmée' || reservation.status === 'confirmed'
                      ? 'text-emerald-300'
                      : reservation.status === 'En attente' || reservation.status === 'pending'
                      ? 'text-amber-300'
                      : reservation.status === 'Annulée' || reservation.status === 'cancelled'
                      ? 'text-red-300'
                      : 'text-blue-300'
                  }>{reservation.status === 'pending' ? 'En attente' : reservation.status === 'confirmed' ? 'Confirmée' : reservation.status === 'cancelled' ? 'Annulée' : reservation.status}</span></p>
                </div>
              </div>

              {/* Infos principales */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-300 font-semibold">{reservation.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-300 font-semibold">{reservation.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-300 font-semibold">{reservation.guests} {reservation.guests > 1 ? 'personnes' : 'personne'}</p>
                  </div>
                </div>

                {reservation.table && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Table</p>
                      <p className="text-sm text-red-400 font-bold">{reservation.table}</p>
                    </div>
                  </div>
                )}

                {reservation.zone && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Zone</p>
                      <p className="text-sm text-gray-300 font-semibold">{reservation.zone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditingReservation(reservation)}
                  className="w-full rounded-full bg-neutral-100 text-neutral-900 font-semibold py-3 hover:bg-white transition"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleCancel(reservation.id)}
                  className="w-full rounded-full border border-neutral-600 text-gray-200 font-semibold py-3 hover:border-white transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReservations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-lg bg-neutral-800/50 border border-neutral-700/50 flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7h-2v5h2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-semibold">Aucune réservation trouvée</p>
          <p className="text-gray-600 text-sm mt-1">Essayez de modifier vos critères de filtrage</p>
        </div>
      )}
    </div>
  );
};
