import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

interface AssistResponse {
  answer: string;
  sources?: any[];
  live?: any;
}

interface HistoryMessage {
  user_message: string;
  assistant_response: string;
  timestamp: string;
}

const quickPrompts = [
  'Créer une réservation demain 20h pour 2',
  'Modifier ma réservation',
  'Annuler ma réservation',
  'Statut de ma commande',
  'Horaires et politique d\'annulation',
  'Quel plat me recommandes-tu ?'
];

export const AssistantClient: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Scroll automatique après ajout de message
  useEffect(() => {
    if (messages.length > 0 && !loadingHistory) {
      scrollToBottom();
    }
  }, [messages, loadingHistory]);

  // Charger l'historique au démarrage
  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/assist/conversation/history?limit=50`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const history: HistoryMessage[] = data.messages || [];
        
        // Convertir l'historique en format ChatMessage
        const historyMessages: ChatMessage[] = [];
        history.forEach((msg: HistoryMessage) => {
          historyMessages.push({
            role: 'user',
            text: msg.user_message,
            ts: msg.timestamp
          });
          historyMessages.push({
            role: 'assistant',
            text: msg.assistant_response,
            ts: msg.timestamp
          });
        });
        
        setMessages(historyMessages);
        
        // Pas de notification pour l'historique chargé
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearConversation = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/assist/conversation/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setMessages([]);
        toast.success('Conversation supprimée');
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const ts = new Date().toISOString();
    setMessages(prev => [...prev, { role: 'user', text, ts }]);
    setInput('');
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Non authentifié');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/assist/client/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) throw new Error('Erreur assistant');
      const data: AssistResponse = await res.json();
      const answer = data.answer || 'Réponse indisponible';
      setMessages(prev => [...prev, { role: 'assistant', text: answer, ts: new Date().toISOString() }]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur assistant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Assistant TableFacil (client)</p>
            <h1 className="text-3xl font-bold text-white">Comment puis-je aider ?</h1>
            <p className="text-neutral-400 text-sm">
              Réservations, suivi commande, FAQ, recommandations.
            </p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-neutral-300 text-sm">{user?.name || 'Client'}</p>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Effacer l'historique
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => {
                sendMessage(qp);
                // Scroll après un court délai pour laisser le message s'ajouter
                setTimeout(() => scrollToBottom(), 100);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-neutral-700 bg-neutral-900/60 text-white hover:border-emerald-500 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        <div 
          ref={chatContainerRef}
          className="bg-neutral-900/60 border border-neutral-800 rounded-xl h-[60vh] p-4 overflow-y-auto space-y-4"
        >
          {loadingHistory && (
            <div className="flex items-center justify-center h-full">
              <div className="text-neutral-500 text-sm">Chargement de l'historique...</div>
            </div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <p className="text-neutral-500 text-sm">Posez une question pour démarrer.</p>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-xl border text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-50'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Statut de ma réservation ce soir"
            className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? '...' : 'Envoyer'}
          </button>
        </form>
      </div>
    </div>
  );
};
