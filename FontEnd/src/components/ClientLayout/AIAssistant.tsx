import { useState, useRef, useEffect } from 'react';

interface Dish {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  rating: number;
  category: string;
  allergens: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  dishes?: Dish[];
}

export const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Message initial de bienvenue
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const welcomeMsg: Message = {
        role: 'assistant',
        content: "Bonjour! Bienvenue chez TableFacil. Comment puis-je vous aider aujourd'hui? 😊",
        timestamp: new Date(),
        suggestions: [
          "Réserver une table",
          "Voir les horaires",
          "Connaître nos promotions",
          "Nous contacter"
        ]
      };
      setMessages([welcomeMsg]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('user_id');

      const response = await fetch('http://localhost:5000/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          user_id: userId
        })
      });

      const data = await response.json();

      if (data.success && data.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response.message || data.response,
          timestamp: new Date(),
          suggestions: data.response.suggestions || data.response.follow_up_questions,
          dishes: data.response.dishes  // Ajouter les données des plats
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.message || 'Erreur lors de la communication');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Je suis désolé, je rencontre des difficultés techniques. Veuillez réessayer dans quelques instants.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'user',
        content: question,
        timestamp: new Date()
      }]);
      setInput('');
      setIsLoading(true);

      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('user_id');

      fetch('http://localhost:5000/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: question,
          user_id: userId
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.response) {
            const assistantMessage: Message = {
              role: 'assistant',
              content: data.response.message || data.response,
              timestamp: new Date(),
              suggestions: data.response.suggestions || data.response.follow_up_questions,
              dishes: data.response.dishes  // Ajouter les données des plats
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }, 100);
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 z-50 flex items-center gap-2 group"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden group-hover:inline-block text-sm font-medium">Assistant IA</span>
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[560px] max-h-[calc(100vh-180px)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Assistant TableFacil</h3>
                <p className="text-xs text-emerald-100">En ligne • Chatbot intelligent</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white font-semibold shadow-md'
                        : 'bg-white text-gray-900 shadow-lg border-2 border-gray-200 font-medium'
                    }`}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-600'}`}>
                      {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {/* Affichage des plats recommandés avec images */}
                {message.role === 'assistant' && message.dishes && message.dishes.length > 0 && (
                  <div className="mt-3 ml-2 space-y-3">
                    {message.dishes.map((dish, idx) => (
                      <div 
                        key={idx}
                        className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition border-2 border-emerald-200 cursor-pointer hover:border-emerald-600"
                      >
                        {/* Image du plat */}
                        {dish.image && (
                          <img 
                            src={dish.image} 
                            alt={dish.name}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        {/* Détails du plat */}
                        <div className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-emerald-700 text-sm">{dish.name}</h4>
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                              {dish.rating.toFixed(1)}/5
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{dish.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-emerald-600">{dish.price}</span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {dish.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Suggestions */}
                {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 ml-2 space-y-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickQuestion(suggestion)}
                        className="block w-full text-left px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-bold transition border-2 border-emerald-700 shadow-md hover:shadow-lg hover:scale-105"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                className="flex-1 resize-none border-2 border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent max-h-24 text-sm text-gray-900 font-medium placeholder:text-gray-500"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
