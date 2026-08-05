import { useState } from 'react';
import { CardPayment } from './CardPayment';
import { PayPalPayment } from './PayPalPayment';

interface DepositPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  depositAmount: number;
  customerName: string;
  onPaymentSuccess: () => void;
}

export const DepositPaymentModal = ({
  isOpen,
  onClose,
  reservationId,
  depositAmount,
  customerName,
  onPaymentSuccess
}: DepositPaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePaymentSuccess = async (method: 'card' | 'paypal') => {
    setIsProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      
      // 1. Marquer le paiement de l'acompte
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}/pay-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: method })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du paiement');
      }

      const data = await response.json();
      console.log('Paiement confirmé:', data);
      
      // 2. Générer le reçu
      try {
        const receiptResponse = await fetch('http://localhost:5000/api/receipts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reservation_id: reservationId,
            amount: depositAmount,
            payment_method: method === 'card' ? 'Carte Bancaire' : 'PayPal',
            transaction_id: `TXN-${Date.now()}`
          })
        });

        if (receiptResponse.ok) {
          const receiptData = await receiptResponse.json();
          console.log('Reçu généré:', receiptData.receipt_number);
          
          // Ouvrir le reçu dans un nouvel onglet
          const receiptWindow = window.open('', '_blank');
          if (receiptWindow) {
            receiptWindow.document.write(receiptData.receipt_html);
            receiptWindow.document.close();
          }
          
          // Notification de succès avec le numéro de reçu
          alert(`✅ Paiement réussi!\n\n` +
                `Votre réservation est en attente de validation par le restaurant.\n` +
                `Un reçu (N° ${receiptData.receipt_number}) a été généré et ouvert dans un nouvel onglet.\n\n` +
                `Vous pouvez l'imprimer ou le sauvegarder pour vos dossiers.`);
        }
      } catch (receiptError) {
        console.error('Erreur génération reçu:', receiptError);
        // Ne pas bloquer si la génération du reçu échoue
        alert('✅ Paiement réussi! Votre réservation est en attente de validation.');
      }
      
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      setError(err.message || 'Erreur lors du paiement de l\'acompte');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-neutral-800">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold text-neutral-100">
                Paiement de l'acompte
              </h2>
              <p className="text-neutral-400 mt-1">
                Pour confirmer votre réservation
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info Réservation */}
        <div className="p-6 bg-gradient-to-br from-brand-500/10 to-accent-500/10 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Client</p>
              <p className="text-lg font-semibold text-neutral-100">{customerName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Acompte requis (25%)</p>
              <p className="text-3xl font-display font-bold text-brand-400">
                {depositAmount.toLocaleString()} FCFA
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-neutral-900/50 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-info-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-neutral-300">
                <p className="font-semibold mb-1">💰 Remboursement garanti</p>
                <p className="text-neutral-400">
                  L'acompte vous sera <strong className="text-success-light">intégralement remboursé</strong> si vous honorez votre réservation.
                  En cas d'absence sans annulation, l'acompte sera conservé par le restaurant.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sélection méthode de paiement */}
        <div className="p-6 border-b border-neutral-800">
          <p className="text-sm font-semibold text-neutral-300 mb-3">Choisissez votre méthode de paiement</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('card')}
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-neutral-100">Carte Bancaire</p>
                  <p className="text-xs text-neutral-400">Visa, Mastercard</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('paypal')}
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'paypal'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.721-4.509z"/>
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-neutral-100">PayPal</p>
                  <p className="text-xs text-neutral-400">Compte PayPal</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Formulaire de paiement */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-error-DEFAULT/10 border border-error-DEFAULT/30 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-error-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-error-light text-sm">{error}</p>
            </div>
          )}

          {paymentMethod === 'card' ? (
            <CardPayment
              amount={depositAmount}
              onSuccess={() => handlePaymentSuccess('card')}
              onError={(error) => setError(error)}
            />
          ) : (
            <PayPalPayment
              amount={depositAmount}
              onSuccess={() => handlePaymentSuccess('paypal')}
              onError={(error) => setError(error)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-neutral-900/50 border-t border-neutral-800">
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <svg className="w-4 h-4 text-success-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Paiement sécurisé - Vos données sont protégées</p>
          </div>
        </div>
      </div>
    </div>
  );
};
