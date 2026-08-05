import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Reservation {
  id: string;
  customer: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  zone: string;
  table: string;
  status: string;
  depositAmount: number;
  depositStatus: string;
  specialRequests?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export const ReservationsManager = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchReservations();
  }, [filter, selectedDate]);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      let url = 'http://localhost:5000/api/reservations';
      const params = new URLSearchParams();
      
      if (filter !== 'all') params.append('status', filter);
      if (selectedDate) params.append('date', selectedDate);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reservationId: string) => {
    if (!confirm('Approuver cette réservation?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchReservations();
        alert('Réservation approuvée avec succès!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'approbation de la réservation');
    }
  };

  const handleReject = async (reservationId: string) => {
    const reason = prompt('Raison du rejet:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await fetchReservations();
        alert('Réservation rejetée avec succès!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du rejet de la réservation');
    }
  };

  const handleMarkAttended = async (reservationId: string, attended: boolean) => {
    const message = attended 
      ? 'Confirmer que le client s\'est présenté? L\'acompte sera remboursé.'
      : 'Confirmer que le client ne s\'est PAS présenté? L\'acompte sera conservé.';
    
    if (!confirm(message)) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}/mark-attended`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attended })
      });

      if (response.ok) {
        await fetchReservations();
        alert(attended ? 'Client marqué présent!' : 'Client marqué absent!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En attente': return 'bg-yellow-500';
      case 'Confirmée': return 'bg-green-500';
      case 'Terminée': return 'bg-blue-500';
      case 'Annulée': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDepositStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'paid': return 'text-green-600';
      case 'refunded': return 'text-blue-600';
      case 'forfeited': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const stats = {
    total: reservations.length,
    enAttente: reservations.filter(r => r.status === 'En attente').length,
    confirmee: reservations.filter(r => r.status === 'Confirmée').length,
    terminee: reservations.filter(r => r.status === 'Terminée').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Gestion des Réservations</h1>
        <p className="text-gray-400 mt-1">Approuvez ou rejetez les réservations selon la disponibilité</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 p-6">
          <div className="text-white">
            <p className="text-sm opacity-90">Total</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-600 to-yellow-700 border-0 p-6">
          <div className="text-white">
            <p className="text-sm opacity-90">En attente</p>
            <p className="text-3xl font-bold mt-1">{stats.enAttente}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 p-6">
          <div className="text-white">
            <p className="text-sm opacity-90">Confirmées</p>
            <p className="text-3xl font-bold mt-1">{stats.confirmee}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-6">
          <div className="text-white">
            <p className="text-sm opacity-90">Terminées</p>
            <p className="text-3xl font-bold mt-1">{stats.terminee}</p>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-brand-500' : 'bg-gray-700 hover:bg-gray-600'}
            >
              Toutes
            </Button>
            <Button
              onClick={() => setFilter('En attente')}
              className={filter === 'En attente' ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}
            >
              En attente
            </Button>
            <Button
              onClick={() => setFilter('Confirmée')}
              className={filter === 'Confirmée' ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-600'}
            >
              Confirmées
            </Button>
            <Button
              onClick={() => setFilter('Terminée')}
              className={filter === 'Terminée' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}
            >
              Terminées
            </Button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
          {selectedDate && (
            <Button
              onClick={() => setSelectedDate('')}
              className="bg-gray-700 hover:bg-gray-600"
            >
              Réinitialiser date
            </Button>
          )}
        </div>
      </Card>

      {/* Liste des réservations */}
      <div className="grid gap-4">
        {reservations.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-400">Aucune réservation trouvée</p>
          </Card>
        ) : (
          reservations.map((reservation) => (
            <Card key={reservation.id} className="bg-gray-800 border-gray-700 p-6">
              <div className="space-y-4">
                {/* En-tête */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(reservation.status)}`}>
                      {reservation.status}
                    </span>
                    <span className={`text-sm font-semibold ${getDepositStatusColor(reservation.depositStatus)}`}>
                      Acompte: {reservation.depositStatus === 'pending' ? 'Non payé' : 
                               reservation.depositStatus === 'paid' ? 'Payé' :
                               reservation.depositStatus === 'refunded' ? 'Remboursé' : 'Perdu'}
                    </span>
                  </div>
                </div>

                {/* Informations */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Client:</span>
                    <p className="text-white font-medium">{reservation.customer}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Téléphone:</span>
                    <p className="text-white font-medium">{reservation.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white font-medium text-xs">{reservation.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Date:</span>
                    <p className="text-white font-medium">{new Date(reservation.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Heure:</span>
                    <p className="text-white font-medium">{reservation.time}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Personnes:</span>
                    <p className="text-white font-medium">{reservation.guests}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Zone:</span>
                    <p className="text-white font-medium">{reservation.zone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Table:</span>
                    <p className="text-white font-medium">{reservation.table}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Acompte:</span>
                    <p className="text-white font-medium">{reservation.depositAmount.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Créée le:</span>
                    <p className="text-white font-medium text-xs">
                      {new Date(reservation.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Demandes spéciales */}
                {reservation.specialRequests && (
                  <div className="p-3 bg-gray-700 rounded">
                    <span className="text-gray-400 text-sm">Demandes spéciales:</span>
                    <p className="text-white text-sm mt-1">{reservation.specialRequests}</p>
                  </div>
                )}

                {/* Informations d'approbation/rejet */}
                {reservation.approvedBy && (
                  <div className="p-3 bg-green-900/30 border border-green-700 rounded">
                    <p className="text-green-400 text-sm">
                      Approuvée par <strong>{reservation.approvedBy}</strong> le {new Date(reservation.approvedAt!).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}
                {reservation.rejectedBy && (
                  <div className="p-3 bg-red-900/30 border border-red-700 rounded">
                    <p className="text-red-400 text-sm">
                      Rejetée par <strong>{reservation.rejectedBy}</strong> le {new Date(reservation.rejectedAt!).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-red-300 text-sm mt-1">Raison: {reservation.rejectionReason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {reservation.status === 'En attente' && reservation.depositStatus === 'paid' && (
                    <>
                      <Button
                        onClick={() => handleApprove(reservation.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✓ Approuver
                      </Button>
                      <Button
                        onClick={() => handleReject(reservation.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        ✕ Rejeter
                      </Button>
                    </>
                  )}
                  {reservation.status === 'Confirmée' && reservation.depositStatus === 'paid' && (
                    <>
                      <Button
                        onClick={() => handleMarkAttended(reservation.id, true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Client présent
                      </Button>
                      <Button
                        onClick={() => handleMarkAttended(reservation.id, false)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Client absent
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
