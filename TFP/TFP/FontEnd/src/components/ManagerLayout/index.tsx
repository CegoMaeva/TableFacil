import { useState } from 'react';
import { RecipeManagement } from './RecipeManagement';
import { StaffManagement } from './StaffManagement';
import { OrdersManagement } from './OrdersManagement';
import { ReservationsManager } from './ReservationsManager';
import { InventoryManagement } from './InventoryManagement';
import { Analytics } from './Analytics';
import { SystemSettings } from './SystemSettings';
import { RestaurantFloorPlan } from './RestaurantFloorPlan';
import { RestaurantFloorPlan3D } from './RestaurantFloorPlan3D';
import { RestaurantFloorPlanEditor } from './RestaurantFloorPlanEditor';
import { LoyaltyManager } from './LoyaltyManager';
import { Kitchen } from './Kitchen';
import { Dashboard } from './Dashboard';
import { Toaster } from 'sonner';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface ManagerLayoutProps {
  user: User;
  onLogout: () => void;
}

export const ManagerLayout = ({ user, onLogout }: ManagerLayoutProps) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [is3DView, setIs3DView] = useState<'2D' | '3D' | 'editor'>('editor'); // Par défaut sur l'éditeur

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Vue d\'ensemble',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
      )
    },
    {
      id: 'menu',
      label: 'Menu & Plats',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      id: 'personnel',
      label: 'Personnel',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'commandes',
      label: 'Commandes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      id: 'cuisine',
      label: 'Cuisine',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4m3-4v4m4-4v4m5 0a2 2 0 100 4H4a2 2 0 100-4h13zm-1 8H4v7a2 2 0 002 2h10a2 2 0 002-2v-7z" />
        </svg>
      )
    },
    {
      id: 'reservations',
      label: 'Réservations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'plan',
      label: 'Plan du Restaurant',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      )
    },
    {
      id: 'inventaire',
      label: 'Inventaire',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'analyses',
      label: 'Analyses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'fidelite',
      label: 'Fidélité',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      id: 'chatbot',
      label: 'Chatbot',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    }
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;

      case 'menu':
        return <RecipeManagement />;

      case 'personnel':
        return <StaffManagement />;

      case 'commandes':
        return <OrdersManagement />;

      case 'cuisine':
        return <Kitchen />;

      case 'reservations':
        return <ReservationsManager />;

      case 'plan':
        return (
          <div className="relative">
            {/* Boutons pour basculer entre 2D, 3D et Éditeur */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => setIs3DView('2D')}
                className={`px-4 py-2 ${is3DView === '2D' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-neutral-800'} hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Vue 2D
              </button>
              <button
                onClick={() => setIs3DView('3D')}
                className={`px-4 py-2 ${is3DView === '3D' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-neutral-800'} hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                Vue 3D
              </button>
              <button
                onClick={() => setIs3DView('editor')}
                className={`px-4 py-2 ${is3DView === 'editor' ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-neutral-800'} hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Éditeur
              </button>
            </div>
            {is3DView === 'editor' ? (
              <RestaurantFloorPlanEditor />
            ) : is3DView === '3D' ? (
              <RestaurantFloorPlan3D />
            ) : (
              <RestaurantFloorPlan />
            )}
          </div>
        );

      case 'inventaire':
        return <InventoryManagement />;

      case 'analyses':
        return <Analytics />;

      case 'fidelite':
        return <LoyaltyManager />;

      case 'chatbot':
        return (
          <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Assistant Chatbot</h1>
                <p className="text-neutral-400 text-lg">Gérez les conversations et réponses automatiques</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Interface */}
                <div className="lg:col-span-2 card-elevated">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-display font-bold text-neutral-100">Conversation</h2>
                    <span className="badge-success">En ligne</span>
                  </div>
                  
                  {/* Messages */}
                  <div className="h-[500px] bg-neutral-900/50 rounded-xl p-4 mb-4 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="bg-neutral-800 rounded-2xl rounded-tl-none p-4">
                            <p className="text-neutral-200">Bonjour, je voudrais réserver une table pour 4 personnes ce soir.</p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">Il y a 2 minutes</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 bg-gradient-to-r from-brand-500 to-accent-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl rounded-tr-none p-4">
                            <p className="text-white">Bien sûr! Pour quelle heure souhaitez-vous réserver?</p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 text-right">Il y a 1 minute</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tapez votre message..."
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-brand-500"
                    />
                    <button className="btn-primary px-6">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Stats & Quick Responses */}
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="card-elevated">
                    <h3 className="text-lg font-bold text-neutral-100 mb-4">Statistiques</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-400">Messages traités</span>
                          <span className="text-neutral-200 font-bold">247</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-2">
                          <div className="bg-brand-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-400">Taux de satisfaction</span>
                          <span className="text-success-DEFAULT font-bold">94%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-2">
                          <div className="bg-success-DEFAULT h-2 rounded-full" style={{ width: '94%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Responses */}
                  <div className="card-elevated">
                    <h3 className="text-lg font-bold text-neutral-100 mb-4">Réponses rapides</h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 text-sm transition-colors">
                        🕐 Horaires d'ouverture
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 text-sm transition-colors">
                        📍 Adresse du restaurant
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 text-sm transition-colors">
                        🍽️ Menu du jour
                      </button>
                      <button className="w-full text-left px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 text-sm transition-colors">
                        📞 Informations de contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Section en construction...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      <Toaster 
        position="top-right" 
        theme="dark"
        richColors
      />
      {/* Sidebar */}
      <div className="w-72 glass border-r border-neutral-800/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-neutral-100 text-lg">TableFacil</h1>
              <p className="text-xs text-neutral-500 font-medium">Gestion Pro</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20 scale-[1.02]'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                {item.icon}
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-neutral-800/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-11 h-11 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-neutral-100 font-semibold text-sm truncate">{user.name}</p>
              <p className="text-neutral-500 text-xs truncate">Gérant Principal</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 rounded-xl transition-all duration-300 border border-neutral-700 hover:border-neutral-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-semibold">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};
