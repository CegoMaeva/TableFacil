import { LoginSection } from "./sections/LoginSection";
import { ForgotPassword } from "./sections/ForgotPassword";
import { ResetPassword } from "./sections/ResetPassword";
import { ClientLayout } from "./components/ClientLayout";
import { ManagerLayout } from "./components/ManagerLayout";
import { ServiceLayout } from "./components/ServiceLayout";
import { Cashier } from "./components/ManagerLayout/Cashier";
import { CashierLayout } from "./components/ManagerLayout/CashierLayout";
import { Kitchen } from "./components/ManagerLayout/Kitchen";
import DeliveryDashboard from "./components/Delivery/DeliveryDashboard";
import { OrderTrackingPage } from "./sections/OrderTracking";
import { PublicHome } from "./sections/PublicHome";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { User } from "./services/api";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';

const AppContent = () => {
  const { user, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (userData: User) => {
    login(userData);
  };

  const handleLogout = async () => {
    await logout();
    // Rediriger vers la page d'accueil après déconnexion
    navigate('/', { replace: true });
  };

  // Afficher un loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/" element={
        user ? (
          // Redirection selon le rôle si connecté
          user.role === 'gerant' || user.role === 'admin' ? (
            <Navigate to="/manager/dashboard" replace />
          ) : user.user_type === 'client' ? (
            <Navigate to="/client/accueil" replace />
          ) : user.user_type === 'employee' && user.type === 'caissier' ? (
            <Navigate to="/cashier" replace />
          ) : user.user_type === 'employee' && user.type === 'cuisinier' ? (
            <Navigate to="/kitchen" replace />
          ) : user.user_type === 'employee' && user.type === 'livreur' ? (
            <Navigate to="/delivery" replace />
          ) : (
            <Navigate to="/employee" replace />
          )
        ) : (
          <PublicHome />
        )
      } />
      <Route path="/login" element={
        user ? (
          // Redirection si déjà connecté
          user.role === 'gerant' || user.role === 'admin' ? (
            <Navigate to="/manager/dashboard" replace />
          ) : user.user_type === 'client' ? (
            <Navigate to="/client/accueil" replace />
          ) : user.user_type === 'employee' && user.type === 'caissier' ? (
            <Navigate to="/cashier" replace />
          ) : user.user_type === 'employee' && user.type === 'cuisinier' ? (
            <Navigate to="/kitchen" replace />
          ) : user.user_type === 'employee' && user.type === 'livreur' ? (
            <Navigate to="/delivery" replace />
          ) : (
            <Navigate to="/employee" replace />
          )
        ) : (
          <LoginSection onLogin={handleLogin} />
        )
      } />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Route employee - accessible même sans user connecté */}
      <Route path="/employee" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'employee' && user.role !== 'gerant' && user.role !== 'admin' ? (
          // Redirect employees by their specific type
          user.type === 'caissier' ? (
            <Navigate to="/cashier" replace />
          ) : user.type === 'service_client' ? (
            <Navigate to="/service/commandes" replace />
          ) : user.type === 'cuisinier' ? (
            <Navigate to="/kitchen" replace />
          ) : user.type === 'livreur' ? (
            <Navigate to="/delivery" replace />
          ) : (
            <Navigate to="/service/commandes" replace />
          )
        ) : (
          user.role === 'gerant' || user.role === 'admin' ? (
            <Navigate to="/manager/dashboard" replace />
          ) : (
            <Navigate to="/client/accueil" replace />
          )
        )
      } />

      {/* Routes Service Clientèle */}
      <Route path="/service/*" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'employee' && user.type === 'service_client' ? (
          <ServiceLayout user={user} onLogout={handleLogout} />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      {/* Cashier route for employees with type 'caissier' */}
      <Route path="/cashier" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'employee' && user.type === 'caissier' ? (
          <CashierLayout user={user as any} onLogout={handleLogout} />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      {/* Kitchen route for employees with type 'cuisinier' */}
      <Route path="/kitchen" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'employee' && user.type === 'cuisinier' ? (
          <Kitchen />
        ) : (
          <Navigate to="/" replace />
        )
      } />
      {/* Delivery route for livreurs */}
      <Route path="/delivery" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'employee' && user.type === 'livreur' ? (
          <DeliveryDashboard />
        ) : (
          <Navigate to="/" replace />
        )
      } />
      
      {/* Routes Gérant/Admin */}
      <Route path="/manager" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : (user.role === 'gerant' || user.role === 'admin') && user.name ? (
          <Navigate to="/manager/dashboard" replace />
        ) : (
          <Navigate to="/client/menu" replace />
        )
      } />
      <Route path="/manager/*" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : (user.role === 'gerant' || user.role === 'admin') && user.name ? (
          <ManagerLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/client/menu" replace />
        )
      } />
      
      {/* Routes Client - Toujours définies pour éviter le warning */}
      <Route path="/client" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <Navigate to="/client/accueil" replace />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/accueil" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/menu" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/commandes" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/reservations" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/profil" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/fidelite" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/avis" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <ClientLayout user={user as User & { name: string }} onLogout={handleLogout} />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
      <Route path="/client/orders/:orderId/tracking" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.user_type === 'client' && user.name ? (
          <OrderTrackingPage />
        ) : (
          <Navigate to="/manager/dashboard" replace />
        )
      } />
    </Routes>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};
