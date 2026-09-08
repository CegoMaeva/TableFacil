import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Ticket {
  id: string;
  customer?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  attachments: string[];
  messages: Message[];
  notes?: Note[];
  disputes?: Dispute[];
  escalations?: Escalation[];
}

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

interface Note {
  id: string;
  author: string;
  authorRole: string;
  note: string;
  timestamp: string;
}

interface Dispute {
  id: string;
  raisedBy: string;
  role: string;
  reason: string;
  amount?: number;
  details?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Escalation {
  id: string;
  by: string;
  role: string;
  reason: string;
  summary: string;
  timestamp: string;
  status: string;
}

interface TimelineItem {
  id: string;
  type: 'message' | 'note' | 'dispute';
  author: string;
  role: string;
  content: string;
  timestamp: string;
  details?: string;
  amount?: number;
  status?: string;
}

export const SupportTickets = () => {
  const { user: authUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendAsClient, setSendAsClient] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    attachments: [] as string[]
  });
  const [noteText, setNoteText] = useState('');
  const [disputeData, setDisputeData] = useState({ reason: '', amount: '', details: '' });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [escalationReason, setEscalationReason] = useState('Demande complexe nécessitant un agent');
  const [escalating, setEscalating] = useState(false);

  const isServiceAgent = ['service_client', 'gerant', 'admin'].includes((authUser as any)?.role);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchTimeline(selectedTicket.id);
      setEscalationReason('Demande complexe nécessitant un agent');
    } else {
      setTimeline([]);
    }
  }, [selectedTicket?.id]);

  const loadTickets = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur chargement tickets');
      const data = await res.json();
      setTickets(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (ticketId: string) => {
    try {
      setTimelineLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur chargement historique');
      const data = await res.json();
      setTimeline(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger l\'historique');
    } finally {
      setTimelineLoading(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Erreur création ticket');
      const newTicket = await res.json();
      setTickets([...tickets, newTicket]);
      setFormData({ title: '', description: '', priority: 'medium', attachments: [] });
      setShowCreateForm(false);
      toast.success('Ticket créé avec succès');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création du ticket');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !messageText.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          as_client: sendAsClient,
          client_name: selectedTicket.customer
        })
      });

      if (!res.ok) throw new Error('Erreur envoi message');
      const newMessage = await res.json();

      const updatedTickets = tickets.map(t =>
        t.id === selectedTicket.id
          ? { ...t, messages: [...(t.messages || []), newMessage] }
          : t
      );
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      setMessageText('');
      setSendAsClient(false);
      toast.success('Message envoyé');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !noteText.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: noteText })
      });

      if (!res.ok) throw new Error('Erreur ajout note');
      const note = await res.json();

      const updatedTickets = tickets.map(t =>
        t.id === selectedTicket.id
          ? { ...t, notes: [...(t.notes || []), note] }
          : t
      );
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      setNoteText('');
      toast.success('Note ajoutée');
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\'ajouter la note');
    }
  };

  const addDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !disputeData.reason.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${selectedTicket.id}/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: disputeData.reason,
          amount: disputeData.amount ? Number(disputeData.amount) : undefined,
          details: disputeData.details
        })
      });

      if (!res.ok) throw new Error('Erreur ajout litige');
      const dispute = await res.json();

      const updatedTickets = tickets.map(t =>
        t.id === selectedTicket.id
          ? { ...t, disputes: [...(t.disputes || []), dispute] }
          : t
      );
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      setDisputeData({ reason: '', amount: '', details: '' });
      toast.success('Litige ajouté');
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\'ajouter le litige');
    }
  };

  const escalateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setEscalating(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${selectedTicket.id}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: escalationReason })
      });

      if (!res.ok) throw new Error('Erreur escalade');
      const payload = await res.json();
      const escalation = payload.escalation;

      const updatedTickets = tickets.map(t => {
        if (t.id === selectedTicket.id) {
          // Only allow valid status values
          let newStatus: Ticket['status'] = t.status;
          if (t.status !== 'closed' && t.status !== 'resolved') {
            newStatus = 'in_progress';
          }
          return {
            ...t,
            status: newStatus,
            escalations: [...(t.escalations || []), escalation]
          };
        }
        return t;
      });
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id) || null;
      setSelectedTicket(updated);
      toast.success('Escalade transmise au service client');
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\'escalader');
    } finally {
      setEscalating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Basse';
      case 'medium': return 'Moyenne';
      case 'high': return 'Haute';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Support Client</h1>
          <p className="text-neutral-400">Gérez vos demandes de support et communiquez directement avec notre équipe</p>
        </div>

        {/* Button Créer Ticket */}
        {!showCreateForm && !selectedTicket && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
          >
            ✚ Créer une nouvelle demande
          </button>
        )}

        {/* Create Ticket Form */}
        {showCreateForm && (
          <div className="bg-neutral-900/40 rounded-lg p-6 mb-6 border border-neutral-800">
            <h2 className="text-2xl font-bold text-white mb-4">Créer une nouvelle demande</h2>
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Résumez votre problème"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Description détaillée</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre problème en détail..."
                  rows={5}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Priorité</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Basse priorité</option>
                  <option value="medium">Priorité moyenne</option>
                  <option value="high">Haute priorité</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Pièces jointes</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    // Vous pouvez ajouter la logique d'upload ici
                    toast.info(`${files.length} fichier(s) sélectionné(s)`);
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                >
                  Créer le ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-900/40 rounded-lg p-4 border border-neutral-800">
              <h2 className="text-xl font-bold text-white mb-4">Mes demandes</h2>
              <div className="space-y-2">
                {tickets.length === 0 ? (
                  <p className="text-neutral-400 text-sm">Aucune demande pour le moment</p>
                ) : (
                  tickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => { setSelectedTicket(ticket); setShowCreateForm(false); }}
                      className={`w-full p-3 rounded-lg text-left transition-all border ${
                        selectedTicket?.id === ticket.id
                          ? 'bg-emerald-500/20 border-emerald-500/50'
                          : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-white truncate flex-1">{ticket.title}</span>
                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details and Chat */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-neutral-900/40 rounded-lg p-6 border border-neutral-800">
                {/* Ticket Header */}
                <div className="mb-6 pb-4 border-b border-neutral-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedTicket.title}</h2>
                      <p className="text-neutral-400 mb-3">{selectedTicket.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-neutral-400 hover:text-white text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-neutral-800 border border-neutral-700 ${getPriorityColor(selectedTicket.priority)}`}>
                      Priorité: {getPriorityLabel(selectedTicket.priority)}
                    </span>
                    {selectedTicket.assignedTo && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 border border-blue-500/30 text-blue-400">
                        Assigné à: {selectedTicket.assignedTo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto mb-4 bg-neutral-800/20 rounded-lg p-4">
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                    <p className="text-neutral-500 text-center py-8">Aucun message pour le moment</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderRole === 'client' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              msg.senderRole === 'client'
                                ? 'bg-emerald-500/20 border border-emerald-500/50'
                                : 'bg-blue-500/20 border border-blue-500/50'
                            }`}
                          >
                            <p className={`text-sm font-medium ${msg.senderRole === 'client' ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {msg.sender}
                            </p>
                            <p className="text-white text-sm mt-1">{msg.message}</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <form onSubmit={sendMessage} className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Écrivez votre message..."
                        className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Envoyer
                      </button>
                    </div>
                    {isServiceAgent && (
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
                        <input
                          type="checkbox"
                          className="form-checkbox rounded border-neutral-600 bg-neutral-800"
                          checked={sendAsClient}
                          onChange={(e) => setSendAsClient(e.target.checked)}
                        />
                        Envoyer en tant que client (édition au nom du client)
                      </label>
                    )}
                  </form>
                )}

                {/* Historique et escalade */}
                <div className="mt-6 bg-neutral-800/40 border border-neutral-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">Historique des interactions</h3>
                      <p className="text-xs text-neutral-500">Messages, notes et litiges pour accélérer le traitement</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selectedTicket && fetchTimeline(selectedTicket.id)}
                        className="px-3 py-2 text-xs rounded border border-neutral-600 text-neutral-200 hover:border-emerald-500"
                      >
                        Rafraîchir
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                      {timelineLoading ? (
                        <p className="text-neutral-400 text-sm">Chargement de l'historique...</p>
                      ) : timeline.length === 0 ? (
                        <p className="text-neutral-500 text-sm">Aucune interaction enregistrée</p>
                      ) : (
                        timeline.map((item) => (
                          <div key={item.id} className="p-3 rounded bg-neutral-900/70 border border-neutral-700">
                            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                              <span>{item.author} · {item.role}</span>
                              <span>{new Date(item.timestamp).toLocaleString('fr-FR')}</span>
                            </div>
                            <p className="text-sm text-white">{item.content}</p>
                            {item.details && <p className="text-xs text-neutral-400 mt-1">{item.details}</p>}
                            {item.amount ? <p className="text-xs text-neutral-300 mt-1">Montant contesté : {item.amount} FCFA</p> : null}
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <span className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 uppercase tracking-wide">{item.type}</span>
                              {item.status && <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">{item.status}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-3">
                      <form onSubmit={escalateTicket} className="p-3 rounded bg-neutral-900/70 border border-neutral-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Escalade service client</p>
                          {selectedTicket.escalations?.length ? (
                            <span className="text-[11px] text-emerald-300">
                              {selectedTicket.escalations[selectedTicket.escalations.length - 1].status}
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-500">Optionnel</span>
                          )}
                        </div>
                        <textarea
                          value={escalationReason}
                          onChange={(e) => setEscalationReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-white text-sm"
                          placeholder="Décrivez la complexité ou l'urgence"
                        />
                        <button
                          type="submit"
                          disabled={escalating}
                          className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium disabled:opacity-60"
                        >
                          {escalating ? 'Envoi...' : 'Escalader'}
                        </button>
                        {selectedTicket.escalations?.length ? (
                          <p className="text-[11px] text-neutral-400">
                            Dernier résumé: {selectedTicket.escalations[selectedTicket.escalations.length - 1].summary}
                          </p>
                        ) : (
                          <p className="text-[11px] text-neutral-500">L'assistant transmet un résumé du contexte</p>
                        )}
                      </form>
                    </div>
                  </div>
                </div>

                {isServiceAgent && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Notes internes */}
                    <div className="bg-neutral-800/40 border border-neutral-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Notes internes</h3>
                        <span className="text-xs text-neutral-500">Service client</span>
                      </div>
                      <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                        {!(selectedTicket.notes && selectedTicket.notes.length) && (
                          <p className="text-neutral-500 text-sm">Aucune note</p>
                        )}
                        {selectedTicket.notes?.map(note => (
                          <div key={note.id} className="p-3 rounded bg-neutral-900/70 border border-neutral-700">
                            <p className="text-sm text-white">{note.note}</p>
                            <p className="text-xs text-neutral-500 mt-1">{note.author} · {new Date(note.timestamp).toLocaleString('fr-FR')}</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={addNote} className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Ajouter une note interne..."
                          rows={2}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500"
                        />
                        <button
                          type="submit"
                          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                        >
                          Ajouter une note
                        </button>
                      </form>
                    </div>

                    {/* Litiges */}
                    <div className="bg-neutral-800/40 border border-neutral-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Litiges</h3>
                        <span className="text-xs text-neutral-500">Client & service</span>
                      </div>
                      <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                        {!(selectedTicket.disputes && selectedTicket.disputes.length) && (
                          <p className="text-neutral-500 text-sm">Aucun litige</p>
                        )}
                        {selectedTicket.disputes?.map(dispute => (
                          <div key={dispute.id} className="p-3 rounded bg-neutral-900/70 border border-neutral-700">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-white font-medium">{dispute.reason}</p>
                              <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">{dispute.status}</span>
                            </div>
                            {dispute.amount ? (
                              <p className="text-sm text-neutral-300">Montant contesté : {dispute.amount} FCFA</p>
                            ) : null}
                            {dispute.details && <p className="text-sm text-neutral-400 mt-1">{dispute.details}</p>}
                            <p className="text-xs text-neutral-500 mt-1">Par {dispute.raisedBy} · {new Date(dispute.createdAt).toLocaleString('fr-FR')}</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={addDispute} className="space-y-2">
                        <input
                          type="text"
                          value={disputeData.reason}
                          onChange={(e) => setDisputeData({ ...disputeData, reason: e.target.value })}
                          placeholder="Motif du litige"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500"
                        />
                        <input
                          type="number"
                          value={disputeData.amount}
                          onChange={(e) => setDisputeData({ ...disputeData, amount: e.target.value })}
                          placeholder="Montant (optionnel)"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500"
                        />
                        <textarea
                          value={disputeData.details}
                          onChange={(e) => setDisputeData({ ...disputeData, details: e.target.value })}
                          placeholder="Détails (optionnel)"
                          rows={2}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500"
                        />
                        <button
                          type="submit"
                          className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium"
                        >
                          Déclarer un litige
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900/40 rounded-lg p-6 border border-neutral-800 text-center">
                <p className="text-neutral-400">Sélectionnez une demande pour voir les détails et communiquer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
