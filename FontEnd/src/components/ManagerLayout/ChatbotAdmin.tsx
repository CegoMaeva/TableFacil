import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  message: string;
}

export const ChatbotAdmin = () => {
  const [activeTab, setActiveTab] = useState<'reminders' | 'deals' | 'logs'>('reminders');
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remindersSent, setRemindersSent] = useState(0);

  const handleSendReminders = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/chatbot/reservations/reminders');
      
      if (response.data.success) {
        setRemindersSent(response.data.reminders_sent);
        
        // Ajouter aux logs
        const log: NotificationLog = {
          id: Date.now().toString(),
          type: 'reminder',
          recipient: `${response.data.reminders_sent} clients`,
          status: 'sent',
          timestamp: new Date(),
          message: response.data.message
        };
        
        setNotificationLogs(prev => [log, ...prev]);
        
        // Afficher un toast
        alert(`✅ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des rappels:', error);
      alert('Erreur lors de l\'envoi des rappels');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">
            🤖 Gestion de l'Assistant
          </h1>
          <p className="text-neutral-400">Contrôlez le chatbot et les notifications</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-4 mb-6 border-b border-neutral-800">
          {(['reminders', 'deals', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-brand-500 border-brand-500'
                  : 'text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              {tab === 'reminders' && '📧 Rappels'}
              {tab === 'deals' && '🎉 Promotions'}
              {tab === 'logs' && '📋 Historique'}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          {/* Onglet Rappels */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-neutral-100 mb-4">
                  📧 Envoyer des Rappels de Réservation
                </h3>
                
                <p className="text-neutral-400 mb-6">
                  Envoie des emails de rappel automatiques aux clients qui ont une réservation demain.
                </p>

                <div className="bg-neutral-800/50 rounded-lg p-4 mb-6 border border-neutral-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-neutral-400 text-sm">Rappels envoyés aujourd'hui</p>
                      <p className="text-3xl font-bold text-green-400">{remindersSent}</p>
                    </div>
                    <div>
                      <p className="text-neutral-400 text-sm">Statut</p>
                      <p className="text-xl font-bold text-cyan-400">Prêt</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendReminders}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isLoading
                      ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/20'
                  }`}
                >
                  {isLoading ? 'Envoi en cours...' : '🚀 Envoyer les Rappels Maintenant'}
                </button>
              </div>

              {/* Paramètres des rappels */}
              <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
                <h4 className="text-lg font-bold text-neutral-100 mb-4">⚙️ Paramètres</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-neutral-300 text-sm font-semibold mb-2">
                      Heure d'envoi automatique
                    </label>
                    <input
                      type="time"
                      defaultValue="09:00"
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <span className="text-neutral-300">Activer les rappels automatiques</span>
                    </label>
                  </div>

                  <button className="mt-4 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-neutral-100 transition-colors">
                    Enregistrer les paramètres
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Promotions */}
          {activeTab === 'deals' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-neutral-100">
                🎉 Gérer les Promotions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'Happy Hour', emoji: '🍹', description: '30% sur les boissons 17h-19h' },
                  { title: 'Menu du jour', emoji: '🍽️', description: 'Plat + boisson à 8,900 FCFA' },
                  { title: 'Groupe 6+', emoji: '👥', description: '10% de réduction' },
                  { title: 'Anniversaire', emoji: '🎂', description: 'Gâteau gratuit' }
                ].map((deal, idx) => (
                  <div key={idx} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-orange-500/50 transition-colors cursor-pointer">
                    <div className="text-3xl mb-2">{deal.emoji}</div>
                    <h4 className="font-bold text-neutral-100 mb-1">{deal.title}</h4>
                    <p className="text-sm text-neutral-400 mb-3">{deal.description}</p>
                    <button className="text-sm px-3 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors">
                      Modifier
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all">
                ➕ Ajouter une Promotion
              </button>
            </div>
          )}

          {/* Onglet Historique */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-neutral-100 mb-4">
                📋 Historique des Notifications
              </h3>

              {notificationLogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-400 text-lg">Aucune notification envoyée pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationLogs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-100">
                          {log.type === 'reminder' ? '📧 Rappel' : '🎉 Promotion'}
                        </h4>
                        <p className="text-sm text-neutral-400">
                          À: {log.recipient} • {log.timestamp.toLocaleString()}
                        </p>
                        <p className="text-sm text-neutral-300 mt-1">{log.message}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        log.status === 'sent'
                          ? 'bg-green-500/20 text-green-400'
                          : log.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {log.status === 'sent' && '✓ Envoyé'}
                        {log.status === 'failed' && '✕ Échoué'}
                        {log.status === 'pending' && '⏳ Attente'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatbotAdmin;
