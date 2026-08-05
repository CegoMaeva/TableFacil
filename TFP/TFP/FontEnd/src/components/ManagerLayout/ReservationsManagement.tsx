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

  const statusConfig: Record<string, { color: string; icon: string }> = {
    'En attente': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⏳' },
    'Confirmée': { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
    'Annulée': { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '❌' },
    'Terminée': { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '✔️' },
    // Fallback pour les anciens statuts anglais
    'pending': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⏳' },
    'confirmed': { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
    'cancelled': { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '❌' },
    'completed': { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '✔️' }
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
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion des Réservations</h1>
          <p className="text-gray-400">Consultez et gérez toutes les réservations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle réservation
          </button>

          <button
            onClick={() => setShowAvailabilityForm(true)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            ➕ Ajouter disponibilité
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total réservations</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-emerald-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Confirmées</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Aujourd'hui</p>
          <p className="text-2xl font-bold text-blue-400">{stats.today}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedDate('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedDate === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            📅 Toutes les dates
          </button>
          {uniqueDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedDate === date
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
              <span className="ml-2 text-xs opacity-75">
                ({reservations.filter(r => r.date === date).length})
              </span>
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filterStatus === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Tous les statuts
          </button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {config.icon} {status === 'pending' ? 'En attente' : status === 'confirmed' ? 'Confirmée' : status === 'cancelled' ? 'Annulée' : 'Terminée'}
              <span className="ml-2 text-xs opacity-75">
                ({reservations.filter(r => r.status === status).length})
              </span>
            </button>
          ))}
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
                  zone: formData.get('zone') as 'Standard' | 'VIP' | 'Terrasse',
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
                  <label className="block text-gray-400 text-sm mb-2">Occasion</label>
                  <input
                    name="occasion"
                    defaultValue={editingReservation?.occasion}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Anniversaire, Affaires..."
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
                  <input
                    name="table"
                    defaultValue={editingReservation?.table || 'À attribuer'}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Table 5"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Zone *</label>
                  <select
                    name="zone"
                    defaultValue={editingReservation?.zone || 'Standard'}
                    required
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Standard">🪑 Standard</option>
                    <option value="VIP">⭐ VIP</option>
                    <option value="Terrasse">🌿 Terrasse</option>
                  </select>
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

      {/* Reservations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReservations.map((reservation) => (
          <div
            key={reservation.id}
            className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden transition-all hover:shadow-xl"
          >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{reservation.customer}</h3>
                  {reservation.email && <p className="text-sm text-gray-400">{reservation.email}</p>}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusConfig[reservation.status]?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                  {statusConfig[reservation.status]?.icon || '❓'} {reservation.status}
                </span>
              </div>

              {/* Info */}
              <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(reservation.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {reservation.time}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {reservation.phone}
                </div>
              </div>

              {/* Details */}
              {reservation.table && (
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs font-semibold">
                    📍 {reservation.table}
                  </span>
                </div>
              )}

              {reservation.occasion && (
                <p className="text-xs text-blue-400">🎉 {reservation.occasion}</p>
              )}

              {reservation.notes && (
                <p className="text-xs text-gray-500 bg-gray-900/30 rounded p-2">
                  📝 {reservation.notes}
                </p>
              )}

              {/* Acompte Info */}
              {reservation.depositAmount && (
                <div className={`p-3 rounded-lg border ${
                  reservation.depositStatus === 'paid' 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : reservation.depositStatus === 'refunded'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : reservation.depositStatus === 'forfeited'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400">Acompte (25%)</span>
                    <span className={`text-xs font-bold ${
                      reservation.depositStatus === 'paid' 
                        ? 'text-emerald-400' 
                        : reservation.depositStatus === 'refunded'
                        ? 'text-blue-400'
                        : reservation.depositStatus === 'forfeited'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}>
                      {reservation.depositAmount?.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reservation.depositStatus === 'pending' && (
                      <span className="text-xs text-yellow-400">⏳ En attente de paiement</span>
                    )}
                    {reservation.depositStatus === 'paid' && (
                      <span className="text-xs text-emerald-400">✅ Payé ({reservation.paymentMethod === 'card' ? '💳 Carte' : '🅿️ PayPal'})</span>
                    )}
                    {reservation.depositStatus === 'refunded' && (
                      <span className="text-xs text-blue-400">💰 Remboursé (client présent)</span>
                    )}
                    {reservation.depositStatus === 'forfeited' && (
                      <span className="text-xs text-red-400">🚫 Conservé (client absent)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Boutons de présence (si réservation confirmée et date passée/aujourd'hui) */}
              {reservation.depositStatus === 'paid' && reservation.attended === null && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Le client s'est-il présenté ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAttended(reservation.id, true)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-1 text-sm font-semibold shadow-lg"
                    >
                      ✅ Présent
                    </button>
                    <button
                      onClick={() => handleMarkAttended(reservation.id, false)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center gap-1 text-sm font-semibold shadow-lg"
                    >
                      ❌ Absent
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {/* Bouton Confirmer : uniquement si status="En attente" ET acompte payé */}
                {reservation.status === 'En attente' && reservation.depositStatus === 'paid' && (
                  <button
                    onClick={() => handleConfirm(reservation.id)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-1 text-sm font-semibold shadow-lg shadow-emerald-500/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirmer la réservation
                  </button>
                )}
                
                {/* Message si acompte non payé */}
                {reservation.status === 'En attente' && reservation.depositStatus !== 'paid' && (
                  <div className="flex-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-yellow-500/30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ⏳ En attente du paiement client
                  </div>
                )}
                
                {reservation.status === 'Confirmée' && (
                  <button
                    onClick={() => handleComplete(reservation.id)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center gap-1 text-sm font-semibold"
                  >
                    ✔️ Terminer
                  </button>
                )}
                <button
                  onClick={() => setEditingReservation(reservation)}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-1 text-sm font-semibold shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
                {reservation.status !== 'Annulée' && reservation.status !== 'Terminée' && (
                  <button
                    onClick={() => handleCancel(reservation.id)}
                    className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/30"
                    title="Annuler"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(reservation.id)}
                  className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/30"
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

      {filteredReservations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Aucune réservation trouvée</p>
        </div>
      )}
    </div>
  );
};
