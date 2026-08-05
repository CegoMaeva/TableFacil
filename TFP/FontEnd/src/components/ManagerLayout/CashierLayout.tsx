import React, { useState } from 'react';
import { Cashier } from './Cashier';

interface User {
  id: string;
  name: string;
  role: string;
  email?: string;
  type?: string;
}

interface Props {
  user: User;
  onLogout: () => void;
}

export const CashierLayout: React.FC<Props> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'onsite' | 'validation'>('onsite');

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                </svg>
              </div>
              <div>
                <h1 className="font-display font-bold text-neutral-100 text-lg">TableFacil</h1>
                <p className="text-xs text-neutral-500 font-medium">Caissier</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-200">{user?.name}</p>
                <p className="text-xs text-neutral-500">Accès caissier</p>
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

          {/* Tab Navigation */}
          <div className="flex gap-2 border-t border-neutral-800 pt-4">
            <button
              onClick={() => setActiveTab('onsite')}
              className={`px-6 py-2 rounded-t-xl font-semibold transition-all duration-200 ${
                activeTab === 'onsite'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Commandes sur place
              </div>
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-6 py-2 rounded-t-xl font-semibold transition-all duration-200 ${
                activeTab === 'validation'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validation en ligne
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Cashier activeTab={activeTab} />
      </main>
    </div>
  );
};
