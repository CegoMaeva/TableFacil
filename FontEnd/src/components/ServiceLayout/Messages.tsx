import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TokenManager, getPublicEmployees } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Message {
  id: number;
  from: string;
  subject: string;
  content: string;
  time: string;
  read: boolean;
  type: 'client' | 'kitchen' | 'manager';
}

export const Messages = () => {
  const [threads, setThreads] = useState<any[]>([]);
  const [channel, setChannel] = useState<'clients' | 'employees'>('clients');

  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeParticipants, setComposeParticipants] = useState<string>('');

  const currentUser = TokenManager.getUser();
  const token = TokenManager.getToken();

  useEffect(() => {
    // fetch threads for current channel
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/communications/threads?channel=${channel}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('Erreur lors de la récupération des discussions');
        }
        const data = await res.json();
        setThreads(data);
      } catch (err: any) {
        toast.error(err.message || 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
    setSelectedThread(null);
  }, [channel]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const list = await getPublicEmployees();
        setEmployees(list || []);
      } catch (err) {
        // ignore
      }
    };
    fetchEmployees();
  }, []);

  const getTypeInfo = (type: string) => {
    const typeMap: Record<string, { icon: string; color: string; bg: string }> = {
      'client': { icon: '👤', color: 'text-brand-400', bg: 'bg-brand-500/20' },
      'kitchen': { icon: '👨‍🍳', color: 'text-warning-light', bg: 'bg-warning-DEFAULT/20' },
      'manager': { icon: '💼', color: 'text-info-light', bg: 'bg-info-DEFAULT/20' }
    };
    return typeMap[type] || typeMap['client'];
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedThread) {
      toast.error('Veuillez écrire un message');
      return;
    }

    try {
      // choose recipient: pick first participant that's not the current user
      const recipient = (selectedThread.participants || []).find((p: string) => p !== (currentUser?.id || '')) || selectedThread.participants?.[0];

      const res = await fetch(`${API_BASE}/api/communications/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: reply, to: recipient })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur lors de l\'envoi');
      }

      const msg = await res.json();
      // append locally
      const updated = threads.map(t => t.id === selectedThread.id ? { ...t, messages: [...(t.messages || []), msg], updatedAt: msg.createdAt } : t);
      setThreads(updated);
      setSelectedThread(prev => prev ? { ...prev, messages: [...(prev.messages || []), msg], updatedAt: msg.createdAt } : prev);
      setReply('');
      toast.success('Message envoyé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi');
    }
  };

  const quickReplies = [
    "D'accord, nous allons préparer votre demande.",
    "Votre commande sera prête dans quelques minutes.",
    "Merci pour votre patience.",
    "Nous prenons note de votre allergie.",
    "J'arrive tout de suite à votre table."
  ];

  const unreadCount = threads.reduce((acc, t) => acc + (t.unread || 0), 0);

  const selectedMessage = selectedThread?.messages?.length
    ? selectedThread.messages[selectedThread.messages.length - 1]
    : { type: 'client' };

  const createThread = async () => {
    if (!composeSubject.trim()) {
      toast.error('Sujet requis');
      return;
    }

    // participants: split by comma and include selected employees if provided
    const parts = composeParticipants.split(',').map(p => p.trim()).filter(Boolean);

    // Si on cible un employé mais que le canal est resté "clients", basculer sur "employees"
    const targetsEmployee = parts.some(p => p.startsWith('employee:') || p.startsWith('emp_'));
    const effectiveChannel = targetsEmployee && channel === 'clients' ? 'employees' : channel;

    try {
      const res = await fetch(`${API_BASE}/api/communications/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ channel: effectiveChannel, subject: composeSubject, participants: parts })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur');
      }
      const thread = await res.json();
      // refresh threads and open
      const r2 = await fetch(`${API_BASE}/api/communications/threads?channel=${channel}`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await r2.json();
      setThreads(data);
      setSelectedThread(thread);
      setShowCompose(false);
      setComposeSubject('');
      setComposeParticipants('');
      toast.success('Discussion créée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Messages & Communications</h1>
        <p className="text-neutral-400 text-lg">
          {unreadCount > 0 && (
            <span className="badge-warning mr-2">{unreadCount} nouveau(x)</span>
          )}
          Gérez la communication avec les clients et l'équipe
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setChannel('clients')} className={`px-4 py-2 rounded ${channel === 'clients' ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-300'}`}>Clients</button>
        <button onClick={() => setChannel('employees')} className={`px-4 py-2 rounded ${channel === 'employees' ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-neutral-300'}`}>Employés</button>
        <div className="ml-auto">
          <button onClick={() => setShowCompose(true)} className="px-4 py-2 rounded bg-green-600 text-white">Nouvelle discussion</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="card-elevated">
            <h2 className="text-xl font-bold text-neutral-100 mb-4">Boîte de réception</h2>
            {showCompose && (
              <div className="p-4 mb-4 bg-neutral-900/40 rounded">
                <div className="mb-2">
                  <label className="text-sm text-neutral-300 block mb-1">Sujet</label>
                  <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-neutral-200" />
                </div>
                <div className="mb-2">
                  <label className="text-sm text-neutral-300 block mb-1">Participants (séparés par des virgules, ex: client:alice@example.com ou +33123456789)</label>
                  <input value={composeParticipants} onChange={e => setComposeParticipants(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-neutral-200" placeholder="Sélectionnez un employé ci-dessous ou entrez un email / numéro" />
                </div>
                <div className="mb-3">
                  <select
                    onChange={e => setComposeParticipants(prev => prev ? prev + ', ' + e.target.value : e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 rounded px-3 py-2"
                  >
                    <option value="">Ajouter un employé...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={`employee:${emp.id}`}>{emp.name} ({emp.type})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setComposeParticipants(''); setComposeSubject(''); setShowCompose(false); }}
                    className="btn-secondary px-4 py-2"
                  >
                    Annuler
                  </button>
                  <button onClick={createThread} className="btn-primary px-4 py-2">Créer</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {loading && <div className="p-4 text-center text-neutral-400">Chargement...</div>}
              {!loading && threads.length === 0 && <div className="p-4 text-neutral-400">Aucune discussion</div>}

              {threads.map((thread) => {
                const preview = thread.messages?.[thread.messages.length - 1];
                return (
                  <button
                    key={thread.id}
                    onClick={async () => {
                      setSelectedThread(thread);
                      // mark read
                      try {
                        await fetch(`${API_BASE}/api/communications/threads/${thread.id}/mark-read`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                          }
                        });
                        // refresh threads
                        const res = await fetch(`${API_BASE}/api/communications/threads?channel=${channel}`, {
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                          }
                        });
                        const data = await res.json();
                        setThreads(data);
                      } catch (err) {
                        // ignore
                      }
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedThread?.id === thread.id
                        ? 'bg-brand-500/20 border border-brand-500'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    } ${thread.unread ? 'border-l-4 border-l-brand-500' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xl">💬</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold truncate text-neutral-100`}>
                            {thread.subject || thread.participants?.join(', ')}
                          </p>
                          {thread.unread > 0 && (
                            <span className="text-sm text-brand-400">{thread.unread}</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 truncate mb-1">{preview?.content || '—'}</p>
                        <p className="text-xs text-neutral-500">{new Date(thread.updatedAt || thread.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <div className="card-elevated">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${getTypeInfo((selectedMessage as any).type || 'client').bg} rounded-full flex items-center justify-center`}>
                      <span className="text-2xl">{getTypeInfo((selectedMessage as any).type || 'client').icon}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">{selectedThread.subject || selectedThread.participants?.join(', ')}</h2>
                      <p className="text-sm text-neutral-400">{new Date(selectedThread.updatedAt || selectedThread.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4 mb-6">
                  {(selectedThread.messages || []).map((m: any) => (
                    <div key={m.id} className={`p-4 rounded-xl ${m.from === (currentUser?.id || '') ? 'bg-brand-500/20 self-end' : 'bg-neutral-900/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-neutral-100">{m.from}</div>
                        <div className="text-xs text-neutral-500">{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-neutral-200">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Replies */}
              <div className="mb-4">
                <p className="text-sm text-neutral-400 mb-2">Réponses rapides:</p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((quick, idx) => (
                    <button
                      key={idx}
                      onClick={() => setReply(quick)}
                      className="text-sm px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply */}
              <div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-brand-500 resize-none mb-4"
                />
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={sendReply} className="btn-primary px-4 py-2">
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Envoyer la réponse
                  </button>
                  <button onClick={() => setReply('')} className="btn-secondary px-4 py-2">
                    Effacer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-elevated">
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-brand-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-100 mb-2">Sélectionnez une discussion</h3>
                <p className="text-neutral-400">Choisissez une discussion dans la liste pour la lire et y répondre</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
