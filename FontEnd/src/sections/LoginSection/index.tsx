import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginClient, loginEmployee } from '../../services/api';

interface LoginSectionProps {
  onLogin: (user: any) => void;
}

export const LoginSection = ({ onLogin }: LoginSectionProps) => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'client' | 'employee'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  
  // États pour affichage des mots de passe
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  
  // Inscription client
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (loginType === 'client') {
        // Connexion client avec email et mot de passe
        if (!email.trim() || !password.trim()) {
          setError('Email et mot de passe requis');
          setLoading(false);
          return;
        }
        
        const response = await loginClient(email, password);
        
        if (response.success) {
          setSuccess('Connexion réussie !');
          onLogin(response.user);
          setTimeout(() => {
            navigate('/client');
          }, 500);
        }
      } else {
        // Connexion employé avec code et mot de passe
        if (!employeeCode.trim() || !employeePassword.trim()) {
          setError('Code employé et mot de passe requis');
          setLoading(false);
          return;
        }
        
        const response = await loginEmployee(employeeCode, employeePassword);
        
        if (response.success) {
          setSuccess(response.message);
          onLogin(response.user);
          setTimeout(() => {
            // Redirection selon le rôle
            if (response.user.role === 'gerant' || response.user.role === 'admin') {
              navigate('/manager');
            } else if (response.user.user_type === 'employee') {
              navigate('/employee');
            }
          }, 500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    if (!signupName || !signupEmail || !signupPassword) {
      setError('Veuillez remplir tous les champs obligatoires');
      setLoading(false);
      return;
    }
    
    if (signupPassword !== signupPasswordConfirm) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }
    
    if (signupPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/register/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }
      
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        setSuccess('Compte créé avec succès !');
        setTimeout(() => {
          onLogin(data.user);
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <style>{`
        @keyframes slideshow {
          0% { opacity: 1; }
          25% { opacity: 1; }
          30% { opacity: 0; }
          95% { opacity: 0; }
          100% { opacity: 1; }
        }
        .carousel-image {
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: slideshow 8s infinite;
        }
        .carousel-image:nth-child(1) { animation-delay: 0s; }
        .carousel-image:nth-child(2) { animation-delay: 2s; }
        .carousel-image:nth-child(3) { animation-delay: 4s; }
        .carousel-image:nth-child(4) { animation-delay: 6s; }
      `}</style>

      {/* Colonne gauche - Images défilantes + Contenu */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-800">
        {/* Header avec logo et titre */}
        <div className="absolute top-0 left-0 right-0 z-20 px-12 py-8">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/logo.svg"
              alt="TableFacil"
              className="w-10 h-10 rounded-lg object-contain bg-white shadow-sm"
            />
            <h3 className="text-white font-bold text-xl">TableFacil</h3>
          </div>
        </div>

        {/* Carousel d'images uniquement */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop" 
            alt="Plat 1" 
            className="carousel-image"
          />
          <img 
            src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop" 
            alt="Plat 2" 
            className="carousel-image"
          />
          <img 
            src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop" 
            alt="Plat 3" 
            className="carousel-image"
          />
          <img 
            src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop" 
            alt="Plat 4" 
            className="carousel-image"
          />
        </div>

        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* Contenu texte */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-20 text-white">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Votre satisfaction,<br />
            <span className="bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
              Notre priorité
            </span>
          </h1>

          <p className="text-lg text-white/90 mb-12 leading-relaxed max-w-md">
            Une plateforme pensée pour vos clients. Offrez-leur une expérience de réservation simple et agréable, directement depuis votre restaurant.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white/90 hover:text-white transition-colors">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-base">Réservations simples et rapides</span>
            </div>
            <div className="flex items-center gap-4 text-white/90 hover:text-white transition-colors">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-base">Gestion de vos préférences culinaires</span>
            </div>
            <div className="flex items-center gap-4 text-white/90 hover:text-white transition-colors">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-base">Fidélité et récompenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Colonne droite - Formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 py-16 md:px-16 bg-gray-900 relative">
        {/* Icône retour discrète */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 p-2 text-gray-500 hover:text-emerald-400 transition-colors group"
          title="Retour à l'accueil"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        {/* Formulaire avec effet papier légèrement chanfreiné */}
        <div className="max-w-sm w-full mx-auto bg-amber-50 shadow-2xl p-8" style={{
          clipPath: 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)',
          transform: 'perspective(1000px) rotateY(-2deg) rotateX(1deg)',
          boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(180,130,70,0.1)'
        }}>
          {/* Tabs: Uniquement Connexion */}
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-600">Accédez à votre espace personnel</p>
          </div>

          {/* Messages d'erreur/succès */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* LOGIN FORM - Affichage uniquement */}
          <form onSubmit={handleLogin} className="space-y-6">
              {/* Type de compte */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Type de compte</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoginType('client')}
                    className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                      loginType === 'client'
                        ? 'bg-red-900 border-red-800 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginType('employee')}
                    className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                      loginType === 'employee'
                        ? 'bg-red-900 border-red-800 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Employé
                  </button>
                </div>
              </div>

              {loginType === 'employee' ? (
                <>
                  {/* Code Employé */}
                  <div>
                    <label htmlFor="code" className="block text-sm font-semibold text-gray-900 mb-2">
                      Code Employé
                    </label>
                    <input
                      id="code"
                      type="text"
                      placeholder="EX: CUI-2025-67BM"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  {/* Mot de passe Employé */}
                  <div>
                    <label htmlFor="emp-pass" className="block text-sm font-semibold text-gray-900 mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="emp-pass"
                        type={showEmployeePassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={employeePassword}
                        onChange={(e) => setEmployeePassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmployeePassword(!showEmployeePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showEmployeePassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Email Client */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Adresse email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  {/* Mot de passe Client */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showClientPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientPassword(!showClientPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showClientPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mot de passe oublié */}
                  <div className="text-right">
                    <a
                      href="/forgot-password"
                      className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>
                </>
              )}

              {/* Bouton Connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>

              {loginType === 'client' && (
                <p className="text-center text-sm text-gray-600">
                  Pas encore de compte ?{' '}
                  <a
                    href="/signup"
                    className="text-gray-700 hover:text-gray-900 font-semibold transition-colors"
                  >
                    S'inscrire ici
                  </a>
                </p>
              )}
            </form>

          {/* SIGNUP FORM - Masqué */}
          {false && (
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Nom */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom complet
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Adresse email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="signup-pass" className="block text-sm font-semibold text-gray-900 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="signup-pass"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSignupPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label htmlFor="signup-pass-confirm" className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="signup-pass-confirm"
                    type={showSignupPasswordConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPasswordConfirm(!showSignupPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSignupPasswordConfirm ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Bouton Inscription */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création du compte...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <p className="text-center text-sm text-gray-600">
                Déjà inscrit ?{' '}
                <a
                  href="/login"
                  className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                >
                  Se connecter
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSection;
