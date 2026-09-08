import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PayPalPayment } from '../Payment/PayPalPayment';
import { CardPayment } from '../Payment/CardPayment';
import { toast } from 'sonner';
import {
  fetchClientReservations,
  createReservation,
  updateReservation,
  cancelReservation,
  payReservationDeposit,
  Reservation,
} from '../../services/api';


export const ReservationsClient = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summaryReservation, setSummaryReservation] = useState<Reservation | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [formData, setFormData] = useState({
    customer: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    guests: 2,
    zone: 'Standard',
    specialRequests: ''
  });

  const { user } = useAuth();

  // Re-fetch reservations when component mounts and when the authenticated user changes
  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchReservations = async () => {
    try {
      const data = await fetchClientReservations();
      setReservations(data);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Impossible de charger vos réservations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        customer: formData.customer,
        phone: formData.phone,
        email: formData.email,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        zone: formData.zone,
        specialRequests: formData.specialRequests,
        notes: formData.specialRequests,
      } as any;

      const reservation = editingId
        ? await updateReservation(editingId, payload)
        : await createReservation(payload);

      await fetchReservations();
      setSummaryReservation(reservation);
      setShowForm(false);
      setEditingId(null);
      setFormData({
        customer: '',
        phone: '',
        email: '',
        date: '',
        time: '',
        guests: 2,
        zone: 'Standard',
        specialRequests: ''
      });

      toast.success(editingId ? 'Réservation mise à jour' : 'Réservation créée');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error?.message || 'Impossible de sauvegarder la réservation');
    } finally {
      setSaving(false);
    }
  };

  const handlePayDeposit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowPaymentModal(true);
    setPaymentMethod(null);
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingId(reservation.id);
    setShowForm(true);
    setFormData({
      customer: (reservation as any).customer || '',
      phone: reservation.phone,
      email: reservation.email || '',
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      zone: reservation.zone,
      specialRequests: (reservation as any).specialRequests || reservation.notes || ''
    });
  };

  const handleCancel = async (reservation: Reservation) => {
    const proceed = confirm('Annuler cette réservation ?');
    if (!proceed) return;
    try {
      setSaving(true);
      await cancelReservation(reservation.id);
      await fetchReservations();
      toast.success('Réservation annulée');
    } catch (error: any) {
      console.error('Erreur annulation:', error);
      toast.error(error?.message || 'Impossible d\'annuler la réservation');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    if (!selectedReservation) return;

    try {
      // Construire les données de paiement comme pour les commandes
      const paymentInfo = {
        paymentMethod: paymentMethod || 'paypal',
        paymentId: paymentData.id || paymentData.transactionId,
        paymentDetails: {
          orderId: paymentData.id,
          payerId: paymentData.payer?.payer_id,
          payerEmail: paymentData.payer?.email_address,
          payerName: paymentData.payer?.name?.given_name + ' ' + paymentData.payer?.name?.surname,
          status: paymentData.status,
          amount: paymentData.purchase_units?.[0]?.amount?.value,
          currency: paymentData.purchase_units?.[0]?.amount?.currency_code,
          captureId: paymentData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
          createTime: paymentData.create_time,
          updateTime: paymentData.update_time
        },
        notes: `Paiement via ${paymentMethod === 'paypal' ? 'PayPal' : 'Carte bancaire'} - ${paymentData.id || 'N/A'}`
      };

      await payReservationDeposit(selectedReservation.id, paymentInfo);
      await fetchReservations();
      setShowPaymentModal(false);
      setSelectedReservation(null);
      setPaymentMethod(null);
      toast.success('Acompte payé, en attente de validation');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du paiement de l\'acompte');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Erreur de paiement:', error);
    alert('Erreur lors du paiement. Veuillez réessayer.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En attente': return 'bg-gray-700/40 text-gray-300';
      case 'Confirmée': return 'bg-gray-700/60 text-gray-100';
      case 'Terminée': return 'bg-gray-700/30 text-gray-400';
      case 'Annulée': return 'bg-gray-700/20 text-gray-500';
      case 'cancelled': return 'bg-gray-700/20 text-gray-500';
      default: return 'bg-gray-700/30 text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    if (status === 'cancelled') return 'Annulée';
    return status;
  };

  const getDepositStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'paid': return 'text-gray-300';
      case 'refunded': return 'text-gray-500';
      case 'forfeited': return 'text-gray-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  // Filtrer les réservations selon le statut sélectionné
  const filteredReservations = reservations.filter(reservation => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['pending', 'confirmed', 'En attente', 'Confirmée'].includes(reservation.status);
    if (filterStatus === 'completed') return ['completed', 'Terminée'].includes(reservation.status);
    if (filterStatus === 'cancelled') return ['cancelled', 'Annulée'].includes(reservation.status);
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes Réservations</h1>
          <p className="text-gray-400 mt-1">Gérez vos réservations de table</p>
        </div>
        <Button
          onClick={() => {
            if (showForm) {
              setEditingId(null);
            }
            setShowForm(!showForm);
          }}
          className="bg-gray-700 hover:bg-gray-600 text-gray-100"
        >
          {showForm ? 'Annuler' : '+ Nouvelle Réservation'}
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex justify-center gap-3 overflow-x-auto pb-2">
        <Button
          onClick={() => setFilterStatus('all')}
          className={`${
            filterStatus === 'all'
              ? 'bg-red-900 text-white'
              : 'bg-red-800 text-white hover:bg-red-700'
          } transition-all`}
        >
          Toutes
        </Button>
        <Button
          onClick={() => setFilterStatus('active')}
          className={`${
            filterStatus === 'active'
              ? 'bg-red-900 text-white'
              : 'bg-red-800 text-white hover:bg-red-700'
          } transition-all`}
        >
          En cours
        </Button>
        <Button
          onClick={() => setFilterStatus('completed')}
          className={`${
            filterStatus === 'completed'
              ? 'bg-red-900 text-white'
              : 'bg-red-800 text-white hover:bg-red-700'
          } transition-all`}
        >
          Terminées
        </Button>
        <Button
          onClick={() => setFilterStatus('cancelled')}
          className={`${
            filterStatus === 'cancelled'
              ? 'bg-red-900 text-white'
              : 'bg-red-800 text-white hover:bg-red-700'
          } transition-all`}
        >
          Annulées
        </Button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Modifier la réservation' : 'Nouvelle Réservation'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Nom complet</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="guests">Nombre de personnes</Label>
              <Input
                id="guests"
                type="number"
                min="1"
                max="20"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 2 })}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="zone">Zone</Label>
              <select
                id="zone"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                required
              >
                <option value="Standard">Standard</option>
                <option value="VIP">VIP</option>
                <option value="Terrasse">Terrasse</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="specialRequests">Demandes spéciales (optionnel)</Label>
              <textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-700 hover:bg-gray-600"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-gray-700 hover:bg-gray-600 text-gray-100"
                disabled={saving}
              >
                {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Créer la réservation'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Liste des réservations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReservations.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-400">
              {filterStatus === 'all' ? 'Aucune réservation pour le moment' :
               filterStatus === 'active' ? 'Aucune réservation en cours' :
               filterStatus === 'completed' ? 'Aucune réservation terminée' :
               'Aucune réservation annulée'}
            </p>
          </Card>
        ) : (
          filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-semibold text-lg">Réservation #{reservation.id.slice(0, 8)}</p>
                  <p className="text-gray-400 text-sm">{new Date(reservation.date).toLocaleDateString('fr-FR')} • {reservation.time}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(reservation.status)}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatStatus(reservation.status)}
                  </span>
                  <span className={`text-xs font-semibold ${getDepositStatusColor(reservation.depositStatus)}`}>
                    Acompte : {reservation.depositStatus === 'pending' ? 'Non payé' :
                      reservation.depositStatus === 'paid' ? 'Payé' :
                      reservation.depositStatus === 'refunded' ? 'Remboursé' : 'Perdu'}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <h4 className="text-gray-200 font-semibold">Détails</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Personnes', value: reservation.guests },
                    { label: 'Zone', value: reservation.zone },
                    { label: 'Table', value: reservation.table },
                    { label: 'Acompte', value: `${reservation.depositAmount.toLocaleString()} FCFA` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-100">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
                      </svg>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <span className="text-sm text-gray-300">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {((reservation as any).specialRequests || reservation.notes) && (
                <div className="mt-4 p-3 bg-gray-700/70 rounded-lg">
                  <p className="text-gray-300 text-sm">{(reservation as any).specialRequests || reservation.notes}</p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                {reservation.depositStatus === 'pending' && reservation.status === 'En attente' ? (
                  <Button
                    onClick={() => handlePayDeposit(reservation)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-100"
                  >
                    Payer l'acompte
                  </Button>
                ) : <div />}

                <div className="flex gap-2 flex-wrap justify-end">
                  {reservation.status !== 'Annulée' && reservation.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      className="!bg-white !text-black hover:!bg-gray-100 border-gray-300"
                      onClick={() => handleEdit(reservation)}
                      disabled={saving}
                    >
                      Modifier
                    </Button>
                  )}
                  {reservation.status !== 'Annulée' && reservation.status !== 'cancelled' && (
                    <Button
                      variant="default"
                      className="bg-black text-white hover:bg-gray-900"
                      onClick={() => handleCancel(reservation)}
                      disabled={saving}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Récapitulatif après création/modification */}
      {summaryReservation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Récapitulatif de votre réservation</h3>
              <button
                onClick={() => setSummaryReservation(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm">
              <div className="flex justify-between text-gray-300"><span>Date</span><span className="text-white font-semibold">{new Date(summaryReservation.date).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between text-gray-300"><span>Heure</span><span className="text-white font-semibold">{summaryReservation.time}</span></div>
              <div className="flex justify-between text-gray-300"><span>Personnes</span><span className="text-white font-semibold">{summaryReservation.guests}</span></div>
              <div className="flex justify-between text-gray-300"><span>Zone</span><span className="text-white font-semibold">{summaryReservation.zone}</span></div>
              {summaryReservation.table && (
                <div className="flex justify-between text-gray-300"><span>Table</span><span className="text-white font-semibold">{summaryReservation.table}</span></div>
              )}
              <div className="flex justify-between text-gray-300"><span>Acompte demandé</span><span className="text-brand-500 font-bold">{summaryReservation.depositAmount?.toLocaleString()} FCFA</span></div>
              <div className="flex justify-between text-gray-300"><span>Statut</span><span className="text-white font-semibold">{formatStatus(summaryReservation.status)}</span></div>
              {((summaryReservation as any).specialRequests || summaryReservation.notes) && (
                <div className="text-gray-300">
                  <span className="block text-xs uppercase tracking-wide text-gray-500">Notes</span>
                  <p className="text-white mt-1 whitespace-pre-line">{(summaryReservation as any).specialRequests || summaryReservation.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setSummaryReservation(null)}>
                Fermer
              </Button>
              {summaryReservation.depositStatus === 'pending' && (
                <Button className="bg-gray-700 hover:bg-gray-600 text-gray-100" onClick={() => {
                  setSelectedReservation(summaryReservation);
                  setShowPaymentModal(true);
                  setPaymentMethod(null);
                  setSummaryReservation(null);
                }}>
                  Payer l'acompte
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de paiement */}
      {showPaymentModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                Paiement de l'acompte
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReservation(null);
                  setPaymentMethod(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {!paymentMethod ? (
                <div className="space-y-4">
                  {/* Récapitulatif */}
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-3">Détails de la réservation</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white">{new Date(selectedReservation.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Heure:</span>
                        <span className="text-white">{selectedReservation.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Personnes:</span>
                        <span className="text-white">{selectedReservation.guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Zone:</span>
                        <span className="text-white">{selectedReservation.zone}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                        <span className="text-white font-semibold">Acompte à payer:</span>
                        <span className="text-brand-500 font-bold text-lg">{selectedReservation.depositAmount.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Choix méthode de paiement */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Choisissez votre mode de paiement</h3>
                    <div className="grid gap-3">
                      <button
                        onClick={() => setPaymentMethod('paypal')}
                        className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-transparent hover:border-brand-500 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .913-.788h.556c3.78 0 6.737-1.537 7.596-5.987.36-1.867.174-3.422-.818-4.5z"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-white font-semibold">PayPal</p>
                            <p className="text-gray-400 text-sm">Paiement sécurisé via PayPal</p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('card')}
                        className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-transparent hover:border-brand-500 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-white font-semibold">Carte bancaire</p>
                            <p className="text-gray-400 text-sm">Visa, Mastercard, Amex</p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setPaymentMethod(null)}
                    className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </button>

                  {paymentMethod === 'paypal' && (
                    <PayPalPayment
                      amount={selectedReservation.depositAmount}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}

                  {paymentMethod === 'card' && (
                    <CardPayment
                      amount={selectedReservation.depositAmount}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
