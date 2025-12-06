import { useEffect, useRef, useState } from 'react';

interface PayPalPaymentProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
}

export const PayPalPayment = ({ amount, onSuccess, onError }: PayPalPaymentProps) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  
  const PAYPAL_CLIENT_ID = 'ARGl9SOgX4c-LExb9GzE3isgCDzRV5gnlj2FtOb69lGxVB038TsOmO6PUse0qAbDH3kAXhcEWZdAqYRW';
  
  useEffect(() => {
    // Vérifier si le script est déjà chargé
    if (window.paypal) {
      setIsScriptLoaded(true);
      return;
    }

    // Charger le script PayPal
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error('Erreur lors du chargement du script PayPal');
      onError('Impossible de charger PayPal. Veuillez réessayer.');
    };
    
    document.body.appendChild(script);

    return () => {
      // Nettoyer le script lors du démontage
      const existingScript = document.querySelector(`script[src*="paypal.com/sdk"]`);
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !window.paypal || !paypalRef.current || isRendering) {
      return;
    }

    setIsRendering(true);

    try {
      // Convertir FCFA en USD (1 USD ≈ 600 FCFA)
      const amountInUSD = (amount / 600).toFixed(2);

      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 55,
          tagline: false
        },
        createOrder: function(data: any, actions: any) {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amountInUSD,
                currency_code: 'USD'
              },
              description: `Acompte réservation - ${amount} FCFA (${amountInUSD} USD)`
            }]
          });
        },
        onApprove: function(data: any, actions: any) {
          return actions.order.capture().then(function(details: any) {
            console.log('Paiement PayPal réussi:', details);
            onSuccess(details);
          });
        },
        onError: function(err: any) {
          console.error('Erreur PayPal:', err);
          onError('Une erreur est survenue lors du paiement PayPal');
        },
        onCancel: function(data: any) {
          console.log('Paiement PayPal annulé:', data);
          onError('Paiement annulé');
        }
      }).render(paypalRef.current);
    } catch (error) {
      console.error('Erreur lors du rendu des boutons PayPal:', error);
      onError('Erreur lors de l\'initialisation de PayPal');
      setIsRendering(false);
    }
  }, [isScriptLoaded, amount]);
  
  return (
    <div className="w-full">
      {/* Header PayPal avec design professionnel */}
      <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.721-4.509z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
              Paiement sécurisé avec PayPal
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Paiement rapide et sécurisé. Vous serez redirigé vers PayPal pour finaliser votre transaction.
            </p>
            <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Chiffré SSL</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Protégé</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Rapide</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Montant */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Montant à payer:</span>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {amount.toLocaleString()} FCFA
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ≈ ${(amount / 600).toFixed(2)} USD
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteneur du bouton PayPal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        {!isScriptLoaded ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement PayPal...</span>
          </div>
        ) : (
          <div ref={paypalRef} id="paypal-button-container"></div>
        )}
      </div>
      
      {/* Footer avec garanties */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Garantie de remboursement</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-medium">Paiement 100% sécurisé</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-medium">Paiement instantané</span>
        </div>
      </div>

      {/* Logos des moyens de paiement acceptés */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">Moyens de paiement acceptés</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMDAzMDg3Ii8+PHBhdGggZD0iTTE1LjUgMTJMMTcuNSAxNEwyMC41IDEwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==" alt="Visa" className="h-6 opacity-70" />
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0MCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjRUI0MzFCIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxMiIgcj0iNiIgZmlsbD0iI0ZGNUYwMCIvPjxjaXJjbGUgY3g9IjI2IiBjeT0iMTIiIHI9IjYiIGZpbGw9IiNGRkJCMDAiLz48L3N2Zz4=" alt="Mastercard" className="h-6 opacity-70" />
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA1MCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMDAzMDg3Ii8+PHBhdGggZD0iTTEwIDEyQzEwIDguNjg2MyAxMi42ODYzIDYgMTYgNkMxOS4zMTM3IDYgMjIgOC42ODYzIDIyIDEyQzIyIDE1LjMxMzcgMTkuMzEzNyAxOCAxNiAxOEMxMi42ODYzIDE4IDEwIDE1LjMxMzcgMTAgMTJaIiBmaWxsPSIjMDA5Q0RFIi8+PHBhdGggZD0iTTI4IDEyQzI4IDguNjg2MyAzMC42ODYzIDYgMzQgNkMzNy4zMTM3IDYgNDAgOC42ODYzIDQwIDEyQzQwIDE1LjMxMzcgMzcuMzEzNyAxOCAzNCAxOEMzMC42ODYzIDE4IDI4IDE1LjMxMzcgMjggMTJaIiBmaWxsPSIjRkZCQjAwIi8+PC9zdmc+" alt="PayPal" className="h-6 opacity-90" />
        </div>
      </div>
    </div>
  );
};

// Déclaration de type pour window.paypal
declare global {
  interface Window {
    paypal?: any;
  }
}

