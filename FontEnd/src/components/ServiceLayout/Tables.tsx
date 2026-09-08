import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Reservation {
  id: string;
  clientId: string;
  customer?: string;
  userName?: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  userPhone?: string;
  date: string;
  time: string;
  guests?: number;
  numberOfGuests?: number;
  status: string;
  table?: string;
  tableNumber?: number;
  notes?: string;
  specialRequests?: string;
  occasion?: string;
  zone?: string;
  createdAt?: string;
}

export const Tables = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTable, setSelectedTable] = useState<string>('all');

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      // Filtrer les réservations actives (pas annulées)
      const activeReservations = data.filter((r: Reservation) => 
        r.status !== 'Annulée' && r.status !== 'cancelled' && (r.table || r.tableNumber)
      );
      setReservations(activeReservations);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les réservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-warning-DEFAULT/20 text-warning-DEFAULT',
      'En attente': 'bg-warning-DEFAULT/20 text-warning-DEFAULT',
      'confirmed': 'bg-success-DEFAULT/20 text-success-DEFAULT',
      'Confirmée': 'bg-success-DEFAULT/20 text-success-DEFAULT',
      'seated': 'bg-info-DEFAULT/20 text-info-DEFAULT',
      'Client installé': 'bg-info-DEFAULT/20 text-info-DEFAULT',
      'completed': 'bg-accent-DEFAULT/20 text-accent-DEFAULT',
      'Terminée': 'bg-accent-DEFAULT/20 text-accent-DEFAULT'
    };
    return colors[status] || 'bg-neutral-800 text-neutral-400';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'confirmed': 'Confirmée',
      'seated': 'Client installé',
      'completed': 'Terminée'
    };
    return labels[status] || status;
  };

  // Extraire le numéro de table (T12 -> 12)
  const getTableNumber = (reservation: Reservation): number => {
    if (reservation.tableNumber) return reservation.tableNumber;
    if (reservation.table) {
      const match = reservation.table.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }
    return 0;
  };

  // Obtenir le nom du client
  const getClientName = (reservation: Reservation): string => {
    return reservation.customer || reservation.userName || 'Client';
  };

  // Obtenir le nombre d'invités
  const getGuestCount = (reservation: Reservation): number => {
    return reservation.guests || reservation.numberOfGuests || 0;
  };

  // Filtrer par date sélectionnée
  const filteredByDate = reservations.filter(r => {
    const matchesDate = r.date === selectedDate;
    const matchesTable = selectedTable === 'all' || getTableNumber(r) === Number(selectedTable);
    return matchesDate && matchesTable;
  });

  const availableTablesForDate = Array.from(
    new Set(
      reservations
        .filter(r => r.date === selectedDate)
        .map((r) => getTableNumber(r))
        .filter((num) => num > 0)
    )
  ).sort((a, b) => a - b);
  const tablesForDate = filteredByDate.reduce((acc, res) => {
    const tableNum = getTableNumber(res);
    if (!acc[tableNum]) acc[tableNum] = [];
    acc[tableNum].push(res);
    return acc;
  }, {} as Record<number, Reservation[]>);

  // Grouper toutes les tables
  const tableGroups = reservations.reduce((acc, res) => {
    const tableNum = getTableNumber(res);
    if (!acc[tableNum]) acc[tableNum] = [];
    acc[tableNum].push(res);
    return acc;
  }, {} as Record<number, Reservation[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Tables Réservées</h1>
        <p className="text-neutral-400 text-lg">Consultez les réservations par table et horaire</p>
      </div>

      {/* Sélecteur de date */}
      <div className="card-elevated mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-neutral-300 font-medium">Filtrer par date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field flex-1 max-w-xs"
          />
          <div className="flex items-center gap-2">
            <label className="text-neutral-300 font-medium whitespace-nowrap">Table:</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 max-w-[160px]"
            >
              <option value="all">Toutes</option>
              {availableTablesForDate.map((table) => (
                <option key={table} value={table}>{`Table ${table}`}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="btn-secondary"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setSelectedTable('all')}
            className="btn-secondary"
          >
            Réinitialiser table
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Tables réservées</p>
              <p className="text-3xl font-bold text-brand-400">{Object.keys(tablesForDate).length}</p>
            </div>
            <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Réservations du jour</p>
              <p className="text-3xl font-bold text-success-DEFAULT">{filteredByDate.length}</p>
            </div>
            <div className="w-12 h-12 bg-success-DEFAULT/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-success-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Clients attendus</p>
              <p className="text-3xl font-bold text-accent-DEFAULT">
                {filteredByDate.reduce((sum, r) => sum + getGuestCount(r), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-DEFAULT/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des tables réservées */}
      <div className="space-y-4">
        {Object.keys(tablesForDate).length === 0 ? (
          <div className="card-elevated text-center py-12">
            <svg className="w-16 h-16 text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-neutral-400 text-lg">Aucune table réservée pour cette date</p>
          </div>
        ) : (
          Object.keys(tablesForDate)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((tableNum) => {
              const tableReservations = tablesForDate[parseInt(tableNum)];
              const sorted = [...tableReservations].sort((a, b) => a.time.localeCompare(b.time));

              return (
                <div key={tableNum} className="card-elevated">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">{tableNum}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-neutral-100">Table {tableNum}</h3>
                        <p className="text-sm text-neutral-400">
                          {sorted.length} réservation(s) • {sorted.reduce((sum, r) => sum + getGuestCount(r), 0)} client(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline des réservations */}
                  <div className="space-y-3">
                    {sorted.map((reservation, idx) => (
                      <div key={reservation.id} className="bg-neutral-900/50 rounded-xl p-4 hover:bg-neutral-900 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl font-bold text-brand-400">{reservation.time}</span>
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(reservation.status)}`}>
                                {getStatusLabel(reservation.status)}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-lg font-semibold text-neutral-100">{getClientName(reservation)}</p>
                              <div className="flex items-center gap-4 text-sm text-neutral-400 flex-wrap">
                                <span>👥 {getGuestCount(reservation)} personne(s)</span>
                                <span>📧 {reservation.email || reservation.userEmail}</span>
                                <span>📱 {reservation.phone || reservation.userPhone}</span>
                                {reservation.zone && <span>📍 {reservation.zone}</span>}
                              </div>
                              {(reservation.notes || reservation.specialRequests || reservation.occasion) && (
                                <div className="mt-2 p-2 bg-neutral-800/50 rounded-lg">
                                  {reservation.occasion && (
                                    <p className="text-xs text-neutral-500 mb-1">🎉 {reservation.occasion}</p>
                                  )}
                                  {(reservation.notes || reservation.specialRequests) && (
                                    <>
                                      <p className="text-xs text-neutral-500 mb-1">Demandes spéciales:</p>
                                      <p className="text-sm text-neutral-300">{reservation.notes || reservation.specialRequests}</p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {idx === 0 && (
                            <div className="px-3 py-1 bg-brand-500/20 text-brand-400 rounded-lg text-xs font-bold">
                              PROCHAINE
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Vue complète de toutes les tables */}
      {selectedDate === new Date().toISOString().split('T')[0] && Object.keys(tableGroups).length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-neutral-100 mb-4">Vue d'ensemble (toutes dates)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.keys(tableGroups)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map((tableNum) => {
                const count = tableGroups[parseInt(tableNum)].length;
                return (
                  <div key={tableNum} className="card-elevated text-center hover:border-brand-500/50 transition-all cursor-pointer">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">{tableNum}</span>
                    </div>
                    <p className="text-neutral-100 font-semibold mb-1">Table {tableNum}</p>
                    <p className="text-sm text-neutral-400">{count} réservation(s)</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
