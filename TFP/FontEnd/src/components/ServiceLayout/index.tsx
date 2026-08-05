import { useState } from 'react';
import { OrdersManagement } from './OrdersManagement';
import { ReservationsManagement } from './ReservationsManagement';
import { ClientVerification } from './ClientVerification';
import { Tables } from './Tables';
import { Messages } from './Messages';
import { CallDesk } from './CallDesk';
import { Toaster } from 'sonner';

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
      id: 'messages',
      label: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    }
    ,
    {
      id: 'calls',
      label: 'Appels',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l.72 2.16a1 1 0 01-.27 1.02L8.7 8.7a11.05 11.05 0 005.58 5.58l1.84-1.29a1 1 0 011.02-.27l2.16.72a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C7.82 21 3 16.18 3 10V5z" />
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

      case 'messages':
        return <Messages />;

      case 'calls':
        return <CallDesk />;

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
              <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
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
