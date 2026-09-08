import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface InventoryRequest {
  id: string;
  type: string;
  status: string;
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  proposedBy: string;
  proposedByName: string;
  currentQuantity: number;
  proposedAt: string;
  validatedBy: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  notes: string;
}

interface PurchaseOrder {
  id: string;
  status: string;
  items: any[];
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  estimatedDelivery: string;
  notes: string;
}

export const InventoryValidation = () => {
  const [view, setView] = useState<'requests' | 'orders'>('requests');
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  
  const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validateQuantity, setValidateQuantity] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      if (view === 'requests') {
        const response = await fetch(
          `${API_BASE_URL}/api/inventory-requests?status=${filterStatus}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setRequests(Array.isArray(data) ? data : []);
        }
      } else {
        const response = await fetch(
          `${API_BASE_URL}/api/purchase-orders?status=${filterStatus}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setPurchaseOrders(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedRequest) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/inventory-requests/${selectedRequest.id}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            newQuantity: selectedRequest.type === 'inventory_entry' ? validateQuantity : undefined
          })
        }
      );

      if (response.ok) {
        toast.success(
          selectedRequest.type === 'inventory_entry'
            ? 'Entrée validée et inventaire mis à jour'
            : 'Demande validée - Commande d\'achat créée'
        );
        setShowValidateModal(false);
        setSelectedRequest(null);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Veuillez entrer une raison de rejet');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/inventory-requests/${selectedRequest.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: rejectionReason })
        }
      );

      if (response.ok) {
        toast.success('Demande rejetée');
        setShowValidateModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-600/20 border-yellow-600/50 text-yellow-400',
      validated: 'bg-green-600/20 border-green-600/50 text-green-400',
      rejected: 'bg-red-600/20 border-red-600/50 text-red-400',
      ordered: 'bg-blue-600/20 border-blue-600/50 text-blue-400'
    };
    
    const labels: Record<string, string> = {
      pending: 'En attente',
      validated: 'Validée',
      rejected: 'Rejetée',
      ordered: 'Commandée'
    };

    return (
      <span className={`px-3 py-1 border text-xs rounded font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    return type === 'inventory_entry' ? '📦 Entrée' : '🛒 Commande';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
            </svg>
            Validation d'Inventaire
          </h2>
          <p className="text-gray-400 mt-1">Approuver les demandes du cuisiner et gérer les commandes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => { setView('requests'); setFilterStatus('pending'); }}
          className={`px-4 py-3 font-medium transition border-b-2 ${
            view === 'requests'
              ? 'text-white border-emerald-500'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Demandes en attente
        </button>
        <button
          onClick={() => { setView('orders'); setFilterStatus('pending'); }}
          className={`px-4 py-3 font-medium transition border-b-2 ${
            view === 'orders'
              ? 'text-white border-emerald-500'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Commandes d'achat
        </button>
      </div>

      {/* Filter */}
      {view === 'requests' && (
        <div className="flex gap-2">
          {['pending', 'validated', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status === 'pending' ? 'En attente' : status === 'validated' ? 'Validées' : 'Rejetées'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'requests' ? (
        // Demandes
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : requests.length > 0 ? (
            requests.map((req) => (
              <div
                key={req.id}
                className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-white font-medium text-lg">{req.itemName}</p>
                      <span className="text-xs text-gray-400">{getTypeLabel(req.type)}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {req.category} • {req.quantity} {req.unit}
                      {req.type === 'inventory_entry' && (
                        <span className="ml-2">Stock actuel: {req.currentQuantity} {req.unit}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(req.status)}
                    <p className="text-xs text-gray-500 mt-2">Par: {req.proposedByName}</p>
                  </div>
                </div>

                {req.notes && (
                  <p className="text-sm text-gray-400 mb-3 p-2 bg-gray-900/50 rounded">
                    📝 {req.notes}
                  </p>
                )}

                {req.status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setValidateQuantity(req.currentQuantity + req.quantity);
                      setShowValidateModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition"
                  >
                    Examiner
                  </button>
                )}

                {req.status === 'rejected' && req.rejectionReason && (
                  <p className="text-sm text-red-400 mt-2">Raison: {req.rejectionReason}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">Aucune demande</p>
          )}
        </div>
      ) : (
        // Commandes d'achat
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : purchaseOrders.length > 0 ? (
            purchaseOrders.map((order) => (
              <div key={order.id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-medium">Commande {order.id}</p>
                    <p className="text-sm text-gray-400">
                      {order.items.length} article(s) • Total: {order.totalAmount.toLocaleString()} FCFA
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-400 pl-4 border-l border-gray-700">
                      <p>{item.itemName} • {item.quantity} {item.unit} @ {item.price} FCFA</p>
                    </div>
                  ))}
                </div>

                {order.estimatedDelivery && (
                  <p className="text-xs text-gray-500">
                    Livraison estimée: {new Date(order.estimatedDelivery).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">Aucune commande</p>
          )}
        </div>
      )}

      {/* Modal de validation */}
      {showValidateModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full space-y-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white">Validation - {selectedRequest.itemName}</h3>

            {selectedRequest.type === 'inventory_entry' ? (
              <>
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-sm text-gray-400">Stock actuel: <span className="text-white font-bold">{selectedRequest.currentQuantity}</span></p>
                  <p className="text-sm text-gray-400">Quantité proposée: <span className="text-white font-bold">{selectedRequest.quantity}</span></p>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">Nouvelle quantité après réception</label>
                  <input
                    type="number"
                    value={validateQuantity}
                    onChange={(e) => setValidateQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            ) : (
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-sm text-gray-400">Une demande de commande d'achat sera créée pour</p>
                <p className="text-white font-bold mt-2">{selectedRequest.quantity} {selectedRequest.unit} de {selectedRequest.itemName}</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleValidate}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium"
              >
                ✓ Valider
              </button>
              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setRejectionReason('');
                }}
                className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                Annuler
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <label className="block text-gray-300 font-medium mb-2">Ou rejeter la demande</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Raison du rejet..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-sm h-20 resize-none"
              />
              <button
                onClick={handleReject}
                disabled={!rejectionReason}
                className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
              >
                ✗ Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
