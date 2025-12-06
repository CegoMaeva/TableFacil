import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, TokenManager, checkAuthStatus, logout as apiLogout } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialiser avec les données du localStorage si disponibles
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Vérifier d'abord si un token existe
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        localStorage.removeItem('user_data');
        setIsLoading(false);
        return;
      }

      // Timeout de 2 secondes pour ne pas bloquer l'interface
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2000);
      });

      const authenticatedUser = await Promise.race([
        checkAuthStatus(),
        timeoutPromise
      ]);
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        // Sauvegarder les données utilisateur
        localStorage.setItem('user_data', JSON.stringify(authenticatedUser));
      } else {
        // Si timeout ou erreur, garder les données en cache mais marquer pour revalidation
        const savedUser = localStorage.getItem('user_data');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Erreur de vérification d\'authentification:', error);
      // En cas d'erreur, garder l'utilisateur en cache si disponible
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    // Sauvegarder dans localStorage
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
      TokenManager.removeToken();
      localStorage.removeItem('user_data');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
