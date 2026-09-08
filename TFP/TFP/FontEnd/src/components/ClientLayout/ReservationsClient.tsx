import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PayPalPayment } from '../Payment/PayPalPayment';
import { CardPayment } from '../Payment/CardPayment';

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
}

export const ReservationsClient = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | null>(null);
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
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/reservations', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchReservations();
        setShowForm(false);
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
        alert('Réservation créée avec succès! Veuillez payer l\'acompte pour confirmer.');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la création de la réservation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la réservation');
    }
  };

  const handlePayDeposit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowPaymentModal(true);
    setPaymentMethod(null);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    if (!selectedReservation) return;

    try {
      const token = localStorage.getItem('auth_token');
      
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
      
      const response = await fetch(`http://localhost:5000/api/reservations/${selectedReservation.id}/pay-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentInfo)
      });

      if (response.ok) {
        await fetchReservations();
        setShowPaymentModal(false);
        setSelectedReservation(null);
        setPaymentMethod(null);
        alert('Acompte payé avec succès! Votre réservation est en attente de validation.');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors du paiement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du paiement de l\'acompte');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Erreur de paiement:', error);
    alert('Erreur lors du paiement. Veuillez réessayer.');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes Réservations</h1>
          <p className="text-gray-400 mt-1">Gérez vos réservations de table</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-brand-500 to-accent-600 hover:from-brand-600 hover:to-accent-700"
        >
          {showForm ? 'Annuler' : '+ Nouvelle Réservation'}
        </Button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Nouvelle Réservation</h2>
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
                className="bg-gradient-to-r from-brand-500 to-accent-600 hover:from-brand-600 hover:to-accent-700"
              >
                Créer la réservation
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Liste des réservations */}
      <div className="grid gap-4">
        {reservations.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-400">Aucune réservation pour le moment</p>
          </Card>
        ) : (
          reservations.map((reservation) => (
            <Card key={reservation.id} className="bg-gray-800 border-gray-700 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(reservation.status)}`}>
                      {reservation.status}
                    </span>
                    <span className={`text-sm font-semibold ${getDepositStatusColor(reservation.depositStatus)}`}>
                      Acompte: {reservation.depositStatus === 'pending' ? 'Non payé' : 
                               reservation.depositStatus === 'paid' ? 'Payé' :
                               reservation.depositStatus === 'refunded' ? 'Remboursé' : 'Perdu'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                  </div>

                  {reservation.specialRequests && (
                    <div className="mt-3 p-3 bg-gray-700 rounded">
                      <span className="text-gray-400 text-sm">Demandes spéciales:</span>
                      <p className="text-white text-sm mt-1">{reservation.specialRequests}</p>
                    </div>
                  )}
                </div>

                {reservation.depositStatus === 'pending' && reservation.status === 'En attente' && (
                  <Button
                    onClick={() => handlePayDeposit(reservation)}
                    className="bg-green-600 hover:bg-green-700 ml-4"
                  >
                    Payer l'acompte
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

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
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
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
                          <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-accent-600 rounded-lg flex items-center justify-center">
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
  );
};
