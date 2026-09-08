import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Recipe {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  category: string;
}

interface RichAnswer {
  text: string;
  hasRecipes: boolean;
  recipes: Recipe[];
  hasMenuLink: boolean;
  hasReservationLink: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  ts: string;
  richData?: RichAnswer;
}

interface AssistResponse {
  answer: string | RichAnswer;
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
  const navigate = useNavigate();
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
          
          // Vérifier si la réponse est du JSON enrichi ou du texte
          let assistantText = msg.assistant_response;
          let richData: RichAnswer | undefined;
          try {
            const parsed = JSON.parse(msg.assistant_response);
            if (parsed.text && typeof parsed.hasRecipes === 'boolean') {
              richData = parsed;
              assistantText = parsed.text;
            }
          } catch (e) {
            // Pas du JSON, utiliser comme du texte simple
          }
          
          historyMessages.push({
            role: 'assistant',
            text: assistantText,
            ts: msg.timestamp,
            richData
          });
        });
        
        setMessages(historyMessages);
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
      
      // Extraire la réponse enrichie ou simple texte - ROBUSTE
      let responseText = '';
      let richData: RichAnswer | undefined;
      
      // Vérifier si la réponse est un objet enrichi
      if (typeof data.answer === 'object' && data.answer !== null && !Array.isArray(data.answer)) {
        if (data.answer.text && typeof data.answer.text === 'string') {
          richData = data.answer;
          responseText = data.answer.text;
        } else if (typeof data.answer.hasRecipes === 'boolean') {
          // C'est un objet enrichi mais texte manquant
          richData = data.answer;
          responseText = data.answer.text || 'Résultat trouvé';
        } else {
          // Objet mais pas enrichi
          responseText = 'Réponse indisponible';
        }
      } else if (typeof data.answer === 'string') {
        // Vérifier si c'est une string JSON (réponse sérialisée)
        try {
          const parsed = JSON.parse(data.answer);
          if (parsed.text && typeof parsed.hasRecipes === 'boolean') {
            richData = parsed;
            responseText = parsed.text;
          } else {
            responseText = data.answer;
          }
        } catch (e) {
          // Pas du JSON, utiliser directement
          responseText = data.answer || 'Réponse indisponible';
        }
      } else {
        responseText = String(data.answer || 'Réponse indisponible');
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: responseText, 
        ts: new Date().toISOString(),
        richData 
      }]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur assistant');
    } finally {
      setLoading(false);
    }
  };

  // Composant pour afficher un message assistant enrichi avec recettes et liens
  const renderAssistantMessage = (message: ChatMessage) => {
    const richData = message.richData;
    
    return (
      <div className="space-y-3">
        {/* Texte principal */}
        <div className="text-neutral-50 whitespace-pre-wrap">{message.text}</div>
        
        {/* Recettes recommandées */}
        {richData?.hasRecipes && richData?.recipes && richData.recipes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-700 space-y-3">
            <p className="text-sm font-semibold text-emerald-400">Plats recommandés:</p>
            <div className="grid grid-cols-1 gap-3">
              {richData.recipes.map((recipe: Recipe) => (
                <div
                  key={recipe.id}
                  className="flex gap-3 p-3 bg-neutral-900/40 rounded-lg border border-neutral-700 hover:border-emerald-500/50 transition cursor-pointer relative"
                  onClick={() => {
                    // Naviguer vers le menu avec le plat spécifique en paramètre
                    navigate('/client/menu', { state: { scrollToRecipe: recipe.id } });
                  }}
                >
                  {/* Badge Deal du jour */}
                  {(recipe as any).isDealOfDay && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                      {(recipe as any).dealBadge || '🔥 DEAL'}
                    </div>
                  )}
                  
                  {/* Image */}
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Plat';
                    }}
                  />
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm truncate">{recipe.name}</h4>
                    <p className="text-xs text-neutral-400 truncate">{recipe.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-emerald-400 font-semibold text-sm">{recipe.price}</span>
                      <span className="text-xs text-neutral-500">{recipe.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Liens vers menu et réservations */}
        {(richData?.hasMenuLink || richData?.hasReservationLink) && (
          <div className="mt-4 pt-4 border-t border-neutral-700 flex flex-wrap gap-2">
            {richData?.hasMenuLink && (
              <button
                onClick={() => navigate('/client/menu')}
                className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition"
              >
                ➜ Accéder au menu
              </button>
            )}
            {richData?.hasReservationLink && (
              <button
                onClick={() => navigate('/client/reservations')}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition"
              >
                ➜ Accéder aux réservations
              </button>
            )}
          </div>
        )}
      </div>
    );
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
              <div className={`max-w-[95%] sm:max-w-[85%] md:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 rounded-xl border text-xs sm:text-sm ${
                m.role === 'user'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                  : 'bg-neutral-800 border-neutral-700'
              }`}>
                {m.role === 'assistant' && m.richData ? 
                  renderAssistantMessage(m) 
                  : <div className="whitespace-pre-wrap">{m.text}</div>
                }
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
