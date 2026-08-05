import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TokenManager, getPublicEmployees } from '../../services/api';

interface CallItem {
  id: string;
  caller: string;
  source: string; // client, livreur, employee, supplier...
  status: string; // waiting, ongoing, completed
  notes?: string;
  assigned_to?: string | null;
  timestamp?: string;
}

export const CallDesk = () => {
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchCalls();
  }, []);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const token = TokenManager.getToken();
      const res = await fetch(`${apiBase}/api/calls`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des appels');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Prioritize: waiting courier (livreur) first, then other waiting, then ongoing, then completed
        const order = (c: CallItem) => {
          if (c.status === 'waiting' && c.source === 'livreur') return 0;
          if (c.status === 'waiting') return 1;
          if (c.status === 'ongoing') return 2;
          return 3;
        };
        data.sort((a: CallItem, b: CallItem) => {
          const oa = order(a);
          const ob = order(b);
          if (oa !== ob) return oa - ob;
          return (a.timestamp || '').localeCompare(b.timestamp || '');
        });
        setCalls(data);
      } else {
        setCalls([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger la file d\'appel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const list = await getPublicEmployees();
        setEmployees(list || []);
      } catch (err) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  const resolveName = (identifier?: string | null) => {
    if (!identifier) return 'Inconnu';
    const id = identifier.startsWith('employee:') ? identifier.split(':')[1] : identifier;
    const e = employees.find(emp => emp.id === id);
    if (e) return e.name || `${e.type || 'Employé'} ${e.id}`;
    return identifier;
  };

  const assignToMe = async (callId: string) => {
    try {
      const user = TokenManager.getUser();
      if (!user) return toast.error('Utilisateur non authentifié');
      const token = TokenManager.getToken();
      const res = await fetch(`${apiBase}/api/calls/${callId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ employee_id: user.id })
      });
      if (!res.ok) throw new Error('Erreur lors de l\'assignation');
      toast.success('Appel assigné à vous');
      await fetchCalls();
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\'assigner l\'appel');
    }
  };

  const completeCall = async (callId: string) => {
    try {
      const token = TokenManager.getToken();
      const res = await fetch(`${apiBase}/api/calls/${callId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ outcome: 'handled_by_service' })
      });
      if (!res.ok) throw new Error('Erreur lors de la complétion');
      toast.success('Appel marqué comme terminé');
      await fetchCalls();
    } catch (err) {
      console.error(err);
      toast.error('Impossible de terminer l\'appel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neutral-100 mb-2">File d'appel</h1>
        <p className="text-neutral-400">Priorité aux livreurs — assignez et complétez les appels</p>
      </div>

      <div className="space-y-4">
        {calls.length === 0 ? (
          <div className="card-elevated text-center py-12">
            <p className="text-neutral-400 text-lg">Aucun appel en file</p>
          </div>
        ) : (
          calls.map((c) => (
            <div key={c.id} className="card-elevated flex items-start justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-neutral-100">{c.caller || c.id}</h3>
                  <span className="badge-neutral">{c.source}</span>
                  <span className={
                    c.status === 'waiting' ? 'badge-warning' : c.status === 'ongoing' ? 'badge-info' : 'badge-success'
                  }>{c.status}</span>
                </div>
                {c.notes && <p className="text-sm text-neutral-400">{c.notes}</p>}
                <p className="text-sm text-neutral-400">Assigné à: {resolveName(c.assignedTo || c.assigned_to)}</p>
                {c.timestamp && <p className="text-xs text-neutral-500 mt-2">{new Date(c.timestamp).toLocaleString('fr-FR')}</p>}
              </div>

              <div className="flex flex-col items-end gap-2">
                {c.status === 'waiting' && (
                  <button onClick={() => assignToMe(c.id)} className="btn-primary">Assigner à moi</button>
                )}

                {c.status === 'ongoing' && (
                  <button onClick={() => completeCall(c.id)} className="btn-secondary">Compléter</button>
                )}

                <button onClick={fetchCalls} className="btn-ghost">Rafraîchir</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CallDesk;
