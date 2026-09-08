import { useState } from 'react';
import { RecipeManagement } from './RecipeManagement';
import { StaffManagement } from './StaffManagement';
import { OrdersManagement } from './OrdersManagement';
import { ReservationsManager } from './ReservationsManager';
import { InventoryManagement } from './InventoryManagement';
import { InventoryValidation } from './InventoryValidation';
import { Analytics } from './Analytics';
import { SystemSettings } from './SystemSettings';
import { RestaurantFloorPlan } from './RestaurantFloorPlan';
import { RestaurantFloorPlan3D } from './RestaurantFloorPlan3D';
import { RestaurantFloorPlanEditor } from './RestaurantFloorPlanEditor';
import { LoyaltyManager } from './LoyaltyManager';
import { Kitchen } from './Kitchen';
import { Dashboard } from './Dashboard';
import { DeliverySupervision } from './DeliverySupervision';
import { Toaster } from 'sonner';
import { NotificationCenter } from '../Common/NotificationCenter';
import { MessagingSystem } from '../Common/MessagingSystem';

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
      id: 'inventaire',
      label: 'Inventaire',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'inventory-validation',
      label: 'Validation Inventaire',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      id: 'livraisons',
      label: 'Livraisons',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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

      case 'inventaire':
        return <InventoryManagement />;

      case 'inventory-validation':
        return <InventoryValidation />;

      case 'analyses':
        return <Analytics />;

      case 'fidelite':
        return <LoyaltyManager />;

      case 'livraisons':
        return <DeliverySupervision />;

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
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Toaster 
        position="top-right" 
        theme="dark"
        richColors
      />
      
      {/* Top Navbar */}
      <div className="h-16 bg-neutral-900 border-b border-neutral-800/50 flex items-center justify-between px-6">
        <div className="flex-1">
          <h2 className="text-neutral-100 font-bold text-xl">TableFacil - Gestion</h2>
        </div>
        <div className="flex items-center gap-4">
          <MessagingSystem
            userId={user.id || ''}
            userName={user.name || 'Gérant'}
            userRole="manager"
          />
          <NotificationCenter
            userType="manager"
            userId={user.id || ''}
            userName={user.name || 'Gérant'}
            onActionClick={(notif) => {
              // Ouvrir le tableau de bord ou la section concernée
              if (notif.type === 'alert') setCurrentPage('dashboard');
              if (notif.type === 'delivery') setCurrentPage('livraisons');
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1">
      {/* Sidebar */}
      <div className="w-72 glass border-r border-neutral-800/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-800/50">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="TableFacil"
              className="w-12 h-12 rounded-2xl object-contain bg-white shadow-lg shadow-brand-500/30"
            />
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
    </div>
  );
};
