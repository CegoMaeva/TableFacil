import { useState, useEffect } from 'react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'manager' | 'employee' | 'delivery';
  recipientId?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface MessagingSystemProps {
  userId: string;
  userName: string;
  userRole: 'client' | 'manager' | 'employee' | 'delivery';
}

export const MessagingSystem: React.FC<MessagingSystemProps> = ({ userId, userName, userRole }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Charger les messages depuis localStorage
  useEffect(() => {
    const storedMessages = localStorage.getItem('messages');
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(parsedMessages);
      const unread = parsedMessages.filter((msg: Message) => !msg.isRead && !msg.recipientId?.includes(userId)).length;
      setUnreadCount(unread);
    }
  }, [userId]);

  // Sauvegarder les messages dans localStorage
  const saveMessages = (updatedMessages: Message[]) => {
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
  };

  const sendMessage = (recipientId: string, recipientRole: string) => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      recipientId: recipientId,
      message: newMessage,
      timestamp: new Date(),
      isRead: false,
    };

    const updatedMessages = [...messages, message];
    saveMessages(updatedMessages);
    setNewMessage('');
  };

  const markAsRead = (messageId: string) => {
    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, isRead: true } : msg
    );
    saveMessages(updatedMessages);
  };

  const getConversations = () => {
    const conversations = new Map<string, Message>();
    messages
      .filter(msg => msg.senderId === userId || msg.recipientId === userId)
      .forEach(msg => {
        const contactId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        if (contactId && !conversations.has(contactId)) {
          conversations.set(contactId, msg);
        }
      });
    return Array.from(conversations.values());
  };

  const getConversationMessages = (contactId: string) => {
    return messages.filter(
      msg =>
        (msg.senderId === userId && msg.recipientId === contactId) ||
        (msg.senderId === contactId && msg.recipientId === userId)
    );
  };

  const conversations = getConversations();

  return (
    <div className="relative">
      {/* Bouton Messagerie */}
      <button
        onClick={() => setShowMessaging(!showMessaging)}
        className="relative p-2 hover:bg-neutral-800 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-900 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal Messagerie */}
      {showMessaging && (
        <div className="absolute right-0 top-12 w-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <h3 className="font-bold text-neutral-100">Messages</h3>
            <button
              onClick={() => setShowMessaging(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              ✕
            </button>
          </div>

          <div className="flex h-96">
            {/* Liste des conversations */}
            <div className="w-1/3 border-r border-neutral-800 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-neutral-400 text-sm text-center">Aucune conversation</div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedContact(conv.senderId === userId ? conv.recipientId || '' : conv.senderId)}
                    className={`w-full p-3 border-b border-neutral-800 text-left hover:bg-neutral-800 transition-colors ${
                      selectedContact === (conv.senderId === userId ? conv.recipientId : conv.senderId)
                        ? 'bg-neutral-800'
                        : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-neutral-100 truncate">
                      {conv.senderId === userId ? conv.recipientId : conv.senderName}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{conv.message}</p>
                  </button>
                ))
              )}
            </div>

            {/* Chat */}
            {selectedContact ? (
              <div className="w-2/3 flex flex-col">
                <div className="flex-1 p-3 overflow-y-auto bg-neutral-950">
                  {getConversationMessages(selectedContact).map(msg => (
                    <div
                      key={msg.id}
                      className={`mb-2 flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                      onClick={() => markAsRead(msg.id)}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg ${
                          msg.senderId === userId
                            ? 'bg-red-900 text-white'
                            : 'bg-neutral-800 text-neutral-200'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-neutral-800 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && selectedContact) {
                        sendMessage(selectedContact, userRole);
                      }
                    }}
                    placeholder="Votre message..."
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-900"
                  />
                  <button
                    onClick={() => selectedContact && sendMessage(selectedContact, userRole)}
                    className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-2/3 flex items-center justify-center text-neutral-400">
                Sélectionnez une conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
