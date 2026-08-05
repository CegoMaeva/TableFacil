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
    zone: 'Standard',
    occasion: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [assignedTable, setAssignedTable] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<any>(null);

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
      const payload: any = {
        ...formData,
        guests: parseInt(formData.guests)
      };
      if (formData['table']) payload.table = formData['table'];

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
    // Load tables for the chosen date/time/zone/guests
    if (!formData.date || !formData.time || !formData.zone || !formData.guests) {
      setError('Veuillez remplir la date, l\'heure, la zone et le nombre de personnes avant de charger les tables');
      return;
    }
    setLoadingTables(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { navigate('/login'); return; }

      const url = new URL('http://localhost:5000/api/tables');
      url.searchParams.append('date', formData.date);
      url.searchParams.append('time', formData.time);
      url.searchParams.append('zone', formData.zone);
      url.searchParams.append('guests', String(formData.guests));

      const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Erreur chargement tables');
      }
      const data = await res.json();

      // Mark which are selectable (available) or reserved
      setAvailableTables(data || []);
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
        zone: 'Standard',
        occasion: '',
        notes: ''
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
        <p className="text-emerald-400 text-xs">
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
      {/* Table selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Choisir une table (optionnel)</label>
          <button type="button" onClick={loadAvailableTables} className="text-xs text-emerald-400 hover:underline disabled:opacity-50" disabled={loadingTables}>
            {loadingTables ? 'Chargement...' : 'Charger les tables disponibles'}
          </button>
        </div>

        {availableTables.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
            {availableTables.map(tbl => (
              <button key={tbl.id} type="button" onClick={() => selectTable(tbl)} className={`p-2 rounded-lg text-left border ${assignedTable?.id === tbl.id ? 'border-emerald-400 bg-emerald-500/10' : 'border-gray-600'} disabled:opacity-50`} disabled={tbl.status === 'reserved'}>
                <div className="text-sm text-white font-semibold">Table {tbl.number}</div>
                <div className="text-xs text-gray-400">{tbl.capacity}p • {tbl.zone}</div>
                {tbl.status === 'reserved' && <div className="text-xs text-red-400">Réservée</div>}
              </button>
            ))}
          </div>
        )}

        {assignedTable && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
            <div className="text-white font-semibold">Table sélectionnée: {assignedTable.number}</div>
            <div className="text-gray-300 text-sm">Capacité: {assignedTable.capacity} • Zone: {assignedTable.zone}</div>
            <button type="button" onClick={() => { setAssignedTable(null); setFormData({ ...formData, table: '' }); }} className="text-xs text-red-400 mt-2">Retirer la sélection</button>
          </div>
        )}
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
            Zone *
          </label>
          <select
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            required
            className="text-base bg-gray-700/50 text-white box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors"
          >
            <option value="Standard">Standard</option>
            <option value="VIP">VIP</option>
            <option value="Terrasse">Terrasse</option>
          </select>
        </div>
      </div>
      
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-6">
        <label className="text-sm font-medium text-gray-300 items-center box-border caret-transparent gap-x-2 flex leading-[14px] outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 mb-2">
          Occasion spéciale (optionnel)
        </label>
        <select
          value={formData.occasion}
          onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
          className="text-base bg-gray-700/50 text-white box-border caret-transparent flex h-9 leading-6 outline-[oklab(0.708_0_0_/_0.5)] text-start w-full border border-gray-600/50 focus:border-emerald-500/50 px-3 py-1 rounded-lg md:text-sm md:leading-5 transition-colors mb-4"
        >
          <option value="">Aucune</option>
          <option value="Anniversaire">Anniversaire</option>
          <option value="Dîner d'affaires">Dîner d'affaires</option>
          <option value="Rendez-vous romantique">Rendez-vous romantique</option>
          <option value="Célébration">Célébration</option>
        </select>
        
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
        className="text-white text-sm font-medium items-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed caret-transparent gap-x-2 inline-flex shrink-0 h-9 justify-center leading-5 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-nowrap w-full px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:scale-100"
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
