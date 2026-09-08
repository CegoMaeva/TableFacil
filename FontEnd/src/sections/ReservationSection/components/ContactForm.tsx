import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DepositPaymentModal } from '../../../components/Payment/DepositPaymentModal';

export const ContactForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
    occasion: '',
    notes: '',
    table: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [assignedTable, setAssignedTable] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<any>(null);

  // Tables disponibles pour les clients (5 tables fixes)
  const restaurantTables = [
    { id: 'T2', number: 'T2', capacity: 2, zone: 'Restaurant' },
    { id: 'T9', number: 'T9', capacity: 4, zone: 'Restaurant' },
    { id: 'T11', number: 'T11', capacity: 4, zone: 'Restaurant' },
    { id: 'T13', number: 'T13', capacity: 4, zone: 'Restaurant' },
    { id: 'T14', number: 'T14', capacity: 4, zone: 'Restaurant' }
  ];

  // Vérifier si une table est disponible (pas réservée 3h avant et 3h après)
  const isTableAvailable = (tableId: string, date: string, time: string, existingReservations: any[]) => {
    const requestedDateTime = new Date(`${date}T${time}`);
    const requestedTime = requestedDateTime.getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000; // 3 heures en millisecondes

    for (const reservation of existingReservations) {
      if (reservation.table === tableId && reservation.status !== 'cancelled') {
        const reservationDateTime = new Date(`${reservation.date}T${reservation.time}`);
        const reservationTime = reservationDateTime.getTime();
        
        // Vérifier si la nouvelle réservation est dans la fenêtre de blocage (3h avant/après)
        const timeDiff = Math.abs(requestedTime - reservationTime);
        if (timeDiff < threeHoursMs) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Vérifier qu'une table a été sélectionnée
      if (!assignedTable) {
        setError('Veuillez sélectionner une table disponible');
        setLoading(false);
        return;
      }

      const payload: any = {
        ...formData,
        guests: parseInt(formData.guests),
        table: assignedTable.id
      };

      const response = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.suggestion || 'Erreur lors de la réservation');
      }

      // Stocker les données de la réservation et ouvrir le modal de paiement
      setPendingReservation(data.reservation);
      setAssignedTable(data.assignedTable);
      setShowPaymentModal(true);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTables = async () => {
    // Load tables for the chosen date/time/guests
    if (!formData.date || !formData.time || !formData.guests) {
      setError('Veuillez remplir la date, l\'heure et le nombre de personnes avant de charger les tables');
      return;
    }
    setLoadingTables(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { navigate('/login'); return; }

      // Charger toutes les réservations existantes
      const res = await fetch('http://localhost:5000/api/reservations', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }
      
      const allReservations = await res.json();
      const guestsCount = parseInt(formData.guests);

      // Filtrer les tables selon la capacité et la disponibilité
      const tablesWithStatus = restaurantTables.map(table => {
        const isAvailable = isTableAvailable(table.id, formData.date, formData.time, allReservations);
        const hasCapacity = table.capacity >= guestsCount;
        
        return {
          ...table,
          status: isAvailable && hasCapacity ? 'available' : 'reserved',
          reason: !hasCapacity ? 'Capacité insuffisante' : (!isAvailable ? 'Réservée (±3h)' : '')
        };
      });

      // Filtrer pour n'afficher que les tables disponibles avec capacité suffisante
      const availableTablesOnly = tablesWithStatus.filter(t => t.status === 'available');
      
      if (availableTablesOnly.length === 0) {
        setError('Aucune table disponible pour cette date et heure. Essayez un autre créneau.');
      }

      setAvailableTables(availableTablesOnly);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoadingTables(false);
    }
  };

  const selectTable = (table: any) => {
    setAssignedTable(table);
    setFormData({ ...formData, table: table.id });
    setError('');
  };


  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSuccess(true);
    
    // Réinitialiser le formulaire après 5 secondes
    setTimeout(() => {
      setFormData({
        customer: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: '',
        occasion: '',
        notes: '',
        table: ''
      });
      setSuccess(false);
      setAssignedTable(null);
      setPendingReservation(null);
    }, 5000);
  };

  if (success && assignedTable) {
    return (
      <div className="text-center p-6">
        <div className="text-yellow-400 text-5xl mb-4">⏳</div>
        <h3 className="text-white text-xl font-semibold mb-2">Acompte Payé!</h3>
        <p className="text-gray-300 mb-4">Votre réservation est en attente de validation</p>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <p className="text-yellow-400 font-semibold text-lg mb-2">
            Table N° {assignedTable.number}
          </p>
          <p className="text-gray-300 text-sm">
            Capacité: {assignedTable.capacity} personnes
          </p>
          <p className="text-gray-300 text-sm">
            Zone: {formData.zone}
          </p>
          <p className="text-gray-300 text-sm mt-2">
            💰 Acompte payé - remboursable si présence
          </p>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          📋 Le restaurant va vérifier votre réservation
        </p>
        <p className="text-red-400 text-xs">
          Vous recevrez un email de confirmation une fois validée par le gérant
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <div className="box-border caret-transparent gap-x-4 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-4 mb-6 md:grid-cols-[repeat(2,minmax(0px,1fr))]">
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Nom *
          </label>
          <input
            placeholder="Votre nom"
            value={formData.customer}
            onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            required
            className="text-base bg-gray-700/50 text-white placeholder-gray-400 box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          />
        </div>
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Email *
          </label>
          <input
            type="email"
            placeholder="votre@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="text-base bg-gray-700/50 text-white placeholder-gray-400 box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          />
        </div>
      </div>
      
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-6">
        <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
          Téléphone *
        </label>
        <input
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          className="text-base bg-gray-700/50 text-white placeholder-gray-400 box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
        />
      </div>
      
      <div className="box-border caret-transparent gap-x-4 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-4 mb-6 md:grid-cols-[repeat(2,minmax(0px,1fr))]">
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            min={new Date().toISOString().split('T')[0]}
            className="text-base bg-gray-700/50 text-white box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          />
        </div>
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Heure *
          </label>
          <select
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            className="text-base bg-gray-700/50 text-white box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          >
            <option value="">Sélectionner l'heure</option>
            {['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="box-border caret-transparent gap-x-4 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-4 mb-6 md:grid-cols-[repeat(2,minmax(0px,1fr))]">
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Nombre de personnes *
          </label>
          <select
            value={formData.guests}
            onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
            required
            className="text-base bg-gray-700/50 text-white box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          >
            <option value="">Nombre de personnes</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'personne' : 'personnes'}</option>
            ))}
          </select>
        </div>
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
            Occasion (optionnel)
          </label>
          <input
            type="text"
            placeholder="Anniversaire, rendez-vous..."
            value={formData.occasion || ''}
            onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
            className="text-base bg-gray-700/50 text-white placeholder-gray-400 box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          />
        </div>
      </div>

      {/* Table selection */}
      <div className="mb-6 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-base font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
            </svg>
            Choisir votre table *
          </label>
          <button 
            type="button" 
            onClick={loadAvailableTables} 
            disabled={loadingTables || !formData.date || !formData.time || !formData.guests}
            className="px-4 py-2 bg-red-900 hover:bg-red-800 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingTables ? '⏳ Chargement...' : '🔍 Voir les tables disponibles'}
          </button>
        </div>

        {(!formData.date || !formData.time || !formData.guests) && (
          <div className="text-sm text-gray-400 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
            💡 Veuillez d'abord remplir la date, l'heure et le nombre de personnes pour voir les tables disponibles.
          </div>
        )}

        {availableTables.length > 0 && (
          <div>
            <p className="text-sm text-gray-300 mb-3">📋 Tables disponibles pour votre réservation :</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
              {availableTables.map(tbl => (
                <button 
                  key={tbl.id} 
                  type="button" 
                  onClick={() => selectTable(tbl)} 
                  className={`p-4 rounded-lg text-center border-2 transition-all ${assignedTable?.id === tbl.id ? 'border-red-600 bg-red-900/30 shadow-lg scale-105' : 'border-gray-600 hover:border-red-500/50 hover:bg-gray-700/30'} disabled:opacity-50 disabled:cursor-not-allowed`} 
                  disabled={tbl.status === 'reserved'}
                >
                  <div className="text-xl text-white font-bold mb-1">Table {tbl.number}</div>
                  <div className="text-sm text-gray-300">{tbl.capacity} {tbl.capacity > 1 ? 'personnes' : 'personne'}</div>
                  {assignedTable?.id === tbl.id && <div className="text-xs text-red-400 mt-2">✓ Sélectionnée</div>}
                  {tbl.status === 'reserved' && <div className="text-xs text-red-400 mt-1">❌ Non disponible</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {availableTables.length === 0 && formData.date && formData.time && formData.guests && !loadingTables && (
          <div className="text-sm text-red-400 bg-red-900/10 border border-red-500/30 rounded-lg p-3">
            ⚠️ Aucune table disponible pour cette date et heure. Les tables sont réservées 3h avant et après chaque réservation. Essayez un autre créneau.
          </div>
        )}

        {assignedTable && (
          <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg flex items-center gap-2">
                  ✓ Table {assignedTable.number} sélectionnée
                </div>
                <div className="text-gray-300 text-sm">Capacité: {assignedTable.capacity} {assignedTable.capacity > 1 ? 'personnes' : 'personne'}</div>
              </div>
              <button 
                type="button" 
                onClick={() => { setAssignedTable(null); setFormData({ ...formData, table: '' }); }} 
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition-all"
              >
                Changer
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-6">
        <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
          Note du client (optionnel)
        </label>
        <textarea
          placeholder="Ajoutez des demandes spéciales ou des préférences..."
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="text-base bg-gray-700/50 text-white placeholder-gray-400 box-border caret-transparent flex leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-2 rounded-lg md:text-sm md:leading-5 transition-colors resize-none"
        ></textarea>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="text-white text-sm font-medium items-center bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed caret-transparent gap-x-2 inline-flex shrink-0 h-9 justify-center leading-5 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-nowrap w-full px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:scale-100"
      >
        {loading ? '⏳ Réservation en cours...' : '🍽️ Réserver ma table'}
      </button>

      {/* Modal de paiement de l'acompte */}
      {showPaymentModal && pendingReservation && (
        <DepositPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          reservationId={pendingReservation.id}
          depositAmount={pendingReservation.depositAmount}
          customerName={formData.customer}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </form>
  );
};
