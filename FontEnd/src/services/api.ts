// Service API pour communiquer avec le backend Flask
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  user_type: 'client' | 'employee';
  type?: string; // Pour les employés
  code?: string; // Pour les employés
  permissions?: string[];
  loyalty_points?: number;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface EmployeeType {
  name: string;
  code_prefix: string;
  code_format: string;
  permissions: string[];
}

export interface ApiError {
  error: string;
}

// Gestion du token
export const TokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },

  removeToken: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },

  getUser: (): User | null => {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },

  setUser: (user: User): void => {
    localStorage.setItem('user_data', JSON.stringify(user));
  },

  isAuthenticated: (): boolean => {
    return !!TokenManager.getToken();
  }
};

// Headers avec authentification
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = TokenManager.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Gestion des erreurs
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `Erreur HTTP ${response.status}`
    }));
    throw new Error(error.error || 'Une erreur est survenue');
  }
  const data = await response.json();
  // If response is a list (bare array), wrap it or return as-is
  if (Array.isArray(data)) {
    return data as any;
  }
  return data;
};

// ===== AUTHENTIFICATION CLIENT =====

export const loginClient = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/client`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse<LoginResponse>(response);
  
  // Sauvegarder le token et les données utilisateur
  if (data.success && data.token) {
    TokenManager.setToken(data.token);
    TokenManager.setUser(data.user);
  }

  return data;
};

// ===== AUTHENTIFICATION EMPLOYÉ =====

export const loginEmployee = async (code: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/employee`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ code: code.toUpperCase(), password }),
  });

  const data = await handleResponse<LoginResponse>(response);
  
  // Sauvegarder le token et les données utilisateur
  if (data.success && data.token) {
    TokenManager.setToken(data.token);
    TokenManager.setUser(data.user);
  }

  return data;
};

// ===== INSCRIPTION EMPLOYÉ (Réservé aux gérants) =====

export interface CreateEmployeeData {
  name: string;
  email: string;
  phone: string;
  type: string;
  password: string;
  code?: string; // Optionnel, généré automatiquement si non fourni
}

export const registerEmployee = async (employeeData: CreateEmployeeData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register/employee`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employeeData),
  });

  return handleResponse(response);
};

// ===== DÉCONNEXION =====

export const logout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  } finally {
    // Toujours nettoyer les données locales
    TokenManager.removeToken();
  }
};

// ===== VÉRIFICATION DU TOKEN =====

export const verifyToken = async (): Promise<{ valid: boolean; user?: User }> => {
  try {
    const token = TokenManager.getToken();
    if (!token) {
      return { valid: false };
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return { valid: false };
    }

    return handleResponse(response);
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    // Si le serveur n'est pas accessible, on considère le token comme potentiellement valide
    // pour éviter de déconnecter l'utilisateur à chaque erreur réseau
    const cachedUser = TokenManager.getUser();
    if (cachedUser) {
      console.log('Utilisation du cache utilisateur en cas d\'erreur réseau');
      return { valid: true, user: cachedUser };
    }
    return { valid: false };
  }
};

// ===== TYPES D'EMPLOYÉS =====

export const getEmployeeTypes = async (): Promise<Record<string, EmployeeType>> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/employee-types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ types: Record<string, EmployeeType> }>(response);
  return data.types;
};

// ===== GÉNÉRATION DE CODE =====

export const generateEmployeeCode = async (type: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/generate-code/${type}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ success: boolean; code: string }>(response);
  return data.code;
};

// ===== VÉRIFICATION DE L'ÉTAT D'AUTHENTIFICATION =====

export const checkAuthStatus = async (): Promise<User | null> => {
  if (!TokenManager.isAuthenticated()) {
    return null;
  }

  const result = await verifyToken();
  if (result.valid && result.user) {
    TokenManager.setUser(result.user);
    return result.user;
  }

  // Token invalide, nettoyer
  TokenManager.removeToken();
  return null;
};

// ===== UTILITAIRES =====

export const getRedirectPath = (user: User): string => {
  if (user.user_type === 'client') {
    return '/client';
  }

  // Redirection selon le type d'employé
  switch (user.type) {
    case 'gerant':
      return '/manager';
    case 'cuisinier':
      return '/kitchen';
    case 'serveur':
      return '/waiter';
    case 'caissier':
      return '/cashier';
    case 'livreur':
      return '/delivery';
    case 'entretien':
      return '/maintenance';
    case 'service_client':
      return '/customer-service';
    default:
      return '/';
  }
};

// ===== GESTION DES EMPLOYÉS (Gérant uniquement) =====

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  code: string;
  address?: string;
  schedule?: string;
  salary?: number;
  dateHired?: string;
  status?: 'active' | 'vacation' | 'absent';
  cvFile?: string;
  casierFile?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone: string;
  type: string;
  address?: string;
  schedule?: string;
  salary?: number;
  dateHired?: string;
  password?: string;
  cvFile?: string;
  casierFile?: string;
  photo?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  schedule?: string;
  salary?: number;
  status?: 'active' | 'vacation' | 'absent';
  password?: string;
  cvFile?: string;
  casierFile?: string;
  photo?: string;
  is_active?: boolean;
}

// Récupérer tous les employés
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ success: boolean; employees: Employee[] }>(response);
  return data.employees;
};

// Public employees list for non-manager UIs
export const getPublicEmployees = async (): Promise<Employee[]> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/public`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await handleResponse<{ success: boolean; employees: Employee[] }>(response);
  return data.employees;
};

// Récupérer un employé par ID
export const getEmployeeById = async (employeeId: string): Promise<Employee> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ success: boolean; employee: Employee }>(response);
  return data.employee;
};

// Créer un nouvel employé
export const createEmployee = async (employeeData: CreateEmployeeRequest): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employeeData),
  });

  return handleResponse(response);
};

// Mettre à jour un employé
export const updateEmployee = async (employeeId: string, updateData: UpdateEmployeeRequest): Promise<Employee> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });

  const data = await handleResponse<{ success: boolean; employee: Employee }>(response);
  return data.employee;
};

// Supprimer (désactiver) un employé
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleResponse(response);
};

// Réactiver un employé
export const reactivateEmployee = async (employeeId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}/reactivate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  await handleResponse(response);
};

// Statistiques des employés
export const getEmployeeStats = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/employees/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ success: boolean; stats: any }>(response);
  return data.stats;
};

// ===== REVIEWS =====

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  recipeId?: string;
  orderId?: string;
  status?: string;
  response?: any;
  createdAt?: string;
}

export const getReviews = async (recipeId?: string): Promise<Review[]> => {
  const url = new URL(`${API_BASE_URL}/api/reviews`);
  if (recipeId) url.searchParams.append('recipeId', recipeId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ reviews: Review[] } | Review[]>(response);
  // Handle both wrapped {reviews: [...]} and bare array formats
  if (Array.isArray(data)) {
    return data;
  }
  return (data as any).reviews || [];
};

export const postReview = async (payload: { rating: number; comment: string; recipeId?: string; orderId?: string }): Promise<Review> => {
  const response = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse<Review>(response);
};

// Met à jour le profil de l'utilisateur connecté (client)
export const updateProfile = async (updateData: Partial<Record<string, any>>): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });

  const data = await handleResponse<{ success: boolean; user: User }>(response);

  if (data && data.user) {
    // Mettre à jour le user en cache
    TokenManager.setUser(data.user);
    return data.user;
  }

  throw new Error('Impossible de mettre à jour le profil');
};

// Upload profile photo (multipart/form-data)
export const uploadProfilePhoto = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('avatar', file);

  const response = await fetch(`${API_BASE_URL}/api/auth/profile/photo`, {
    method: 'POST',
    headers: {
      // Authorization header from TokenManager
      ...(TokenManager.getToken() ? { 'Authorization': `Bearer ${TokenManager.getToken()}` } : {})
    },
    body: form
  });

  const data = await handleResponse<{ success: boolean; url: string }>(response);
  if (data && data.url) return data.url;
  throw new Error('Upload failed');
};

// Rechercher des employés
export const searchEmployees = async (query?: string, type?: string, status?: string): Promise<Employee[]> => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  const response = await fetch(`${API_BASE_URL}/api/employees/search?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<{ success: boolean; employees: Employee[] }>(response);
  return data.employees;
};

// ===== PASSWORD MANAGEMENT =====

// Demander une réinitialisation de mot de passe
export const requestPasswordReset = async (code: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/password/request-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

// Vérifier un token de réinitialisation
export const verifyResetToken = async (token: string): Promise<{ success: boolean; employee_name: string; email: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/password/verify-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  return handleResponse<{ success: boolean; employee_name: string; email: string }>(response);
};

// Réinitialiser le mot de passe avec un token
export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/password/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

// Changer le mot de passe (employé connecté)
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/password/change-password`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

// Types pour les réservations
export interface Reservation {
  id: string;
  clientId: string;
  clientName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  deposit?: number;
  depositPaid?: boolean;
  totalPrice?: number;
  createdAt: string;
  updatedAt: string;
}

// Récupérer les réservations du client
export const fetchClientReservations = async (): Promise<Reservation[]> => {
  const response = await fetch(`${API_BASE_URL}/api/reservations`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<Reservation[]>(response);
};

// Créer une réservation
export const createReservation = async (reservationData: Partial<Reservation>): Promise<Reservation> => {
  const response = await fetch(`${API_BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(reservationData),
  });

  return handleResponse<Reservation>(response);
};

// Mettre à jour une réservation
export const updateReservation = async (reservationId: string, updateData: Partial<Reservation>): Promise<Reservation> => {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });

  return handleResponse<Reservation>(response);
};

// Annuler une réservation
export const cancelReservation = async (reservationId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

// Payer l'acompte de la réservation
export const payReservationDeposit = async (reservationId: string, paymentData: any): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/pay-deposit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });

  return handleResponse<{ success: boolean; message: string }>(response);
};

// Suivi en temps réel des commandes
export const getOrderTracking = async (orderId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/tracking`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<any>(response);
};

// Mettre à jour la position GPS de la commande (pour les livreurs)
export const updateOrderLocation = async (orderId: string, latitude: number, longitude: number): Promise<{ success: boolean; message: string; currentLocation: any }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/location`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ latitude, longitude }),
  });

  return handleResponse<{ success: boolean; message: string; currentLocation: any }>(response);
};
