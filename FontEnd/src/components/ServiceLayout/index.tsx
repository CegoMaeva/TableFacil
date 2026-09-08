import { useState } from 'react';
import { OrdersManagement } from './OrdersManagement';
import { ReservationsManagement } from './ReservationsManagement';
import { ClientVerification } from './ClientVerification';
import { Tables } from './Tables';
import { DeliveryIntervention } from './DeliveryIntervention';
import { Messages } from './Messages';
import { Toaster } from 'sonner';
import { NotificationCenter } from '../Common/NotificationCenter';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface ServiceLayoutProps {
  user: User;
  onLogout: () => void;
}

export const ServiceLayout = ({ user, onLogout }: ServiceLayoutProps) => {
  const [currentPage, setCurrentPage] = useState('commandes');

  const menuItems = [
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
      id: 'reservations',
      label: 'Réservations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'tables',
      label: 'Tables',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      )
    },
    {
      id: 'verification',
      label: 'Vérification Clients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'interventions',
      label: 'Interventions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'commandes':
        return <OrdersManagement />;

      case 'reservations':
        return <ReservationsManagement />;

      case 'tables':
        return <Tables />;

      case 'verification':
        return <ClientVerification />;

      case 'interventions':
        return <DeliveryIntervention />;

      case 'notifications':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-500/10 rounded-xl">
                <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <p className="text-sm text-neutral-400">Centre des notifications</p>
              </div>
            </div>
            <NotificationCenter userType="service" userId={user.id} />
          </div>
        );

      case 'messages':
        return <Messages />;

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
    <div className="min-h-screen bg-neutral-950">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-40 shadow-2xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo et Titre */}
            <div className="flex items-center gap-4">
              <img
                src="/logo.svg"
                alt="TableFacil"
                className="w-12 h-12 rounded-2xl object-contain bg-white shadow-lg shadow-brand-500/30"
              />
              <div>
                <h1 className="font-display font-bold text-neutral-100 text-lg">TableFacil</h1>
                <p className="text-xs text-neutral-500 font-medium">Service Client</p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-200">{user.name}</p>
                <p className="text-xs text-neutral-500">Service Clientèle</p>
              </div>
              
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2 border border-neutral-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-neutral-900 border-b border-neutral-800 shadow-lg">
        <div className="px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 flex-shrink-0 font-medium ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {renderContent()}
      </main>
    </div>
  );
};
