import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  clientName: string;
  attachments: string[];
  messages: Message[];
}

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export const SupportAgent = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTickets = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/agent`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur chargement tickets');
      const data = await res.json();
      setTickets(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ message: messageText })
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
      toast.success('Message envoyé');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Erreur mise à jour statut');
      const updated = await res.json();

      const updatedTickets = tickets.map(t =>
        t.id === ticketId ? updated : t
      );
      setTickets(updatedTickets);
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const assignTicket = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');

      const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ assignedTo: user?.id })
      });

      if (!res.ok) throw new Error('Erreur assignation');
      const updated = await res.json();

      const updatedTickets = tickets.map(t =>
        t.id === ticketId ? updated : t
      );
      setTickets(updatedTickets);
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      toast.success('Ticket assigné');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'assignation');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Nouveau';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    return statusMatch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const stats = {
    openTickets: tickets.filter(t => t.status === 'open').length,
    inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
    resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
    assignedToMe: tickets.filter(t => t.assignedTo === user?.id).length
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Simplifié */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Support Client</h1>
          <p className="text-sm text-neutral-400">Gérez vos demandes clients</p>
        </div>

        {/* Stats Simplifiées */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <p className="text-xs text-blue-400 mb-1">Nouveaux</p>
            <p className="text-2xl font-bold text-blue-400">{stats.openTickets}</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 mb-1">En cours</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.inProgressTickets}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <p className="text-xs text-green-400 mb-1">Résolus</p>
            <p className="text-2xl font-bold text-green-400">{stats.resolvedTickets}</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <p className="text-xs text-emerald-400 mb-1">Mes tickets</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.assignedToMe}</p>
          </div>
        </div>

        {/* Filtres Simplifiés */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Tous ({tickets.length})
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === 'open'
                ? 'bg-blue-500 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Nouveaux ({stats.openTickets})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-yellow-500 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            En cours ({stats.inProgressTickets})
          </button>
        </div>

        {/* Main Content - Layout Simplifié */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Liste des Tickets - Plus compacte */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-900/60 rounded-lg p-4 border border-neutral-800">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center justify-between">
                Tickets
                <span className="text-sm text-neutral-400 font-normal">
                  {filteredTickets.length} demande(s)
                </span>
              </h2>
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="text-sm">Aucun ticket</p>
                  </div>
                ) : (
                  filteredTickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedTicket?.id === ticket.id
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : 'bg-neutral-800/50 border border-neutral-700 hover:border-emerald-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-white text-sm leading-tight flex-1">
                          {ticket.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          ticket.status === 'open' ? 'bg-blue-500 text-white' :
                          ticket.status === 'in_progress' ? 'bg-yellow-500 text-black' :
                          ticket.status === 'resolved' ? 'bg-green-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mb-1">👤 {ticket.clientName}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          ticket.priority === 'high' ? 'text-red-400' :
                          ticket.priority === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {ticket.priority === 'high' ? '🔴 Urgent' :
                           ticket.priority === 'medium' ? '🟡 Moyen' :
                           '🔵 Faible'}
                        </span>
                        {ticket.assignedTo ? (
                          <span className="text-xs text-emerald-400">✓ Assigné</span>
                        ) : (
                          <span className="text-xs text-orange-400">⚠ Non assigné</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Détails du Ticket - Interface Simplifiée */}
          <div className="lg:col-span-3">
            {selectedTicket ? (
              <div className="bg-neutral-900/60 rounded-lg p-4 border border-neutral-800">
                {/* En-tête Compact */}
                <div className="flex items-start justify-between mb-4 pb-3 border-b border-neutral-700">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-1">{selectedTicket.title}</h2>
                    <p className="text-sm text-neutral-400 mb-2">{selectedTicket.description}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-neutral-500">
                        👤 <span className="text-white">{selectedTicket.clientName}</span>
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        selectedTicket.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        selectedTicket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {selectedTicket.priority === 'high' ? 'Urgent' :
                         selectedTicket.priority === 'medium' ? 'Moyen' : 'Faible'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        selectedTicket.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                        selectedTicket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        selectedTicket.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {getStatusLabel(selectedTicket.status)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-neutral-500 hover:text-white ml-2"
                  >
                    ✕
                  </button>
                </div>

                {/* Actions Rapides */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {!selectedTicket.assignedTo && (
                    <button
                      onClick={() => assignTicket(selectedTicket.id)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✓ M'assigner
                    </button>
                  )}
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'in_progress')}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-colors"
                    >
                      ▶ Prendre en charge
                    </button>
                  )}
                  {selectedTicket.status === 'in_progress' && (
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'resolved')}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✓ Résoudre
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'closed')}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔒 Fermer
                    </button>
                  )}
                </div>

                {/* Zone de Conversation */}
                <div className="bg-neutral-800/30 rounded-lg p-3 mb-3 max-h-[calc(100vh-480px)] overflow-y-auto">
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                    <div className="text-center py-8 text-neutral-500">
                      <p className="text-3xl mb-2">💬</p>
                      <p className="text-sm">Aucun message</p>
                      <p className="text-xs mt-1">Commencez la conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTicket.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderRole === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-3 py-2 rounded-lg ${
                              msg.senderRole === 'agent'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}
                          >
                            <p className="text-xs font-semibold mb-1">
                              {msg.sender} {msg.senderRole === 'agent' ? '(Vous)' : '(Client)'}
                            </p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulaire de Réponse */}
                {selectedTicket.status !== 'closed' ? (
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Écrivez votre réponse..."
                      className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      Envoyer
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4 text-neutral-500 text-sm">
                    🔒 Ce ticket est fermé
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900/60 rounded-lg p-8 border border-neutral-800 text-center h-full flex items-center justify-center">
                <div>
                  <p className="text-5xl mb-4">📋</p>
                  <p className="text-neutral-400 text-lg mb-2">Sélectionnez un ticket</p>
                  <p className="text-neutral-600 text-sm">Cliquez sur un ticket à gauche pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportAgent;
