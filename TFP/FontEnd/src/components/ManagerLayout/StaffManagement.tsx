import { useState, useEffect } from 'react';
import { 
  getAllEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee
} from '../../services/api';

interface Employee {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address?: string;
  dateHired?: string;
  schedule?: string;
  salary?: number;
  status?: 'active' | 'vacation' | 'absent';
  cvFile?: string;
  casierFile?: string;
  photo?: string;
  code?: string;
  is_active: boolean;
}

export const StaffManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [weekSchedule, setWeekSchedule] = useState({
    lundi: '',
    mardi: '',
    mercredi: '',
    jeudi: '',
    vendredi: '',
    samedi: '',
    dimanche: ''
  });

  // Charger les employés au montage du composant
  useEffect(() => {
    loadEmployees();
  }, []);

  // Charger les horaires quand on édite un employé
  useEffect(() => {
    if (editingEmployee?.schedule) {
      try {
        // Si schedule est un JSON, le parser
        const parsed = JSON.parse(editingEmployee.schedule);
        setWeekSchedule(parsed);
      } catch {
        // Si c'est une chaîne simple, réinitialiser
        setWeekSchedule({lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: ''});
      }
    }
  }, [editingEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading employees...');
      const data = await getAllEmployees();
      console.log('Employees loaded successfully:', data);
      
      // S'assurer que data est un tableau
      if (Array.isArray(data)) {
        setEmployees(data as any);
      } else {
        console.warn('Unexpected data format:', data);
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Error loading:', err);
      
      // Vérifier si c'est une erreur d'authentification
      if (err.message?.includes('Token') || err.message?.includes('Unauthorized') || 
          err.message?.includes('401') || err.message?.includes('403') ||
          err.message?.includes('Accès réservé')) {
        setError('⚠️ You must be logged in as a manager to access this page.');
      } else {
        setError(err.message || 'Error loading employees. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };



  const roleLabels: Record<string, string> = {
    gerant: 'Gérant',
    cuisinier: 'Cuisinier',
    serveur: 'Serveur',
    caissier: 'Caissier',
    livreur: 'Livreur',
    entretien: 'Préposé à l\'entretien',
    service_client: 'Service clientèle'
  };

  const rolePrefixes: Record<string, string> = {
    gerant: 'GER',
    cuisinier: 'CUI',
    serveur: 'SER',
    caissier: 'CAI',
    livreur: 'LIV',
    entretien: 'ENT',
    service_client: 'SVC'
  };

  const generatePreviewCode = (role: string): string => {
    if (!role) return 'Select a role to view the code';
    const prefix = rolePrefixes[role];
    const year = new Date().getFullYear();
    const lastCode = employees
      .filter(emp => emp.type === role)
      .map(emp => emp.code || '')
      .filter(code => code.startsWith(prefix))
      .sort()
      .pop();
    
    let nextNumber = 1;
    if (lastCode) {
      const match = lastCode.match(/-(\w)(\d{3})$/);
      if (match) {
        const letter = match[1];
        const num = parseInt(match[2]);
        if (letter === 'A' && num < 999) {
          nextNumber = num + 1;
        } else if (num === 999) {
          return `${prefix}-${year}-${String.fromCharCode(letter.charCodeAt(0) + 1)}001`;
        }
      }
    }
    
    return `${prefix}-${year}-A${String(nextNumber).padStart(3, '0')}`;
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Actif', color: 'bg-emerald-500/20 text-emerald-400' },
    vacation: { label: 'Vacation', color: 'bg-yellow-500/20 text-yellow-400' },
    absent: { label: 'Absent', color: 'bg-red-500/20 text-red-400' }
  };

  const roles = Object.keys(roleLabels);
  
  // Fonction pour formater l'affichage des horaires
  const formatScheduleDisplay = (schedule?: string): string => {
    if (!schedule) return 'Non défini';
    try {
      const parsed = JSON.parse(schedule);
      const workDays = Object.entries(parsed).filter(([_, time]) => time && time !== 'off');
      if (workDays.length === 0) return 'Aucun horaire';
      
      // Afficher les jours de travail
      const days = workDays.map(([day, _]) => day.substring(0, 3)).join(', ');
      return `${workDays.length} jours (${days})`;
    } catch {
      return schedule;
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp || !emp.is_active) return false;
    const matchesRole = filterRole === 'all' || emp.type === filterRole;
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  }).map(emp => ({
    ...emp,
    status: emp.status || 'active',
    salary: emp.salary || 0,
    schedule: emp.schedule || 'Non défini'
  }));

  console.log('Total employees:', employees.length);
  console.log('Filtered employees:', filteredEmployees.length);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id);
        await loadEmployees();
      } catch (err: any) {
        alert('Error deleting: ' + err.message);
      }
    }
  };

  const handleSaveEdit = async (updatedEmployee: Employee) => {
    try {
      await updateEmployee(updatedEmployee.id, {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        address: updatedEmployee.address,
        schedule: updatedEmployee.schedule,
        salary: updatedEmployee.salary,
        status: updatedEmployee.status,
        cvFile: updatedEmployee.cvFile,
        casierFile: updatedEmployee.casierFile,
        photo: updatedEmployee.photo
      });
      setEditingEmployee(null);
      setPhotoPreview('');
      setWeekSchedule({lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: ''});
      await loadEmployees();
    } catch (err: any) {
      alert('Erreur lors de la mise à jour: ' + err.message);
    }
  };

  const handleAddNew = async (newEmployee: Omit<Employee, 'id' | 'code' | 'is_active'> & { password?: string }) => {
    try {
      const result = await createEmployee({
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        type: newEmployee.type,
        address: newEmployee.address,
        schedule: newEmployee.schedule,
        salary: newEmployee.salary,
        dateHired: newEmployee.dateHired,
        cvFile: newEmployee.cvFile,
        casierFile: newEmployee.casierFile,
        photo: newEmployee.photo,
        password: newEmployee.password // Envoyer le mot de passe si fourni
      });
      
      setShowAddForm(false);
      setPhotoPreview('');
      setShowPassword(false);
      setWeekSchedule({lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: ''});
      await loadEmployees();
      
      // Afficher le code et mot de passe généré
      if (result.credentials) {
        const passwordInfo = result.employee.generated_password 
          ? `Mot de passe généré: ${result.employee.generated_password}\n\n⚠️ Notez bien ces informations, le mot de passe ne sera plus affiché.`
          : `Mot de passe: (celui que vous avez défini)\n\n✓ L'employé peut se connecter avec le mot de passe que vous avez fourni.`;
        
        alert(
          `✅ Employé créé avec succès!\n\n` +
          `Code de connexion: ${result.credentials.code}\n` +
          passwordInfo
        );
      }
    } catch (err: any) {
      alert('Erreur lors de la création: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'cvFile' | 'casierFile') => {
    const file = e.target.files?.[0];
    if (file) {
      // Simuler l'upload - en production, vous uploaderiez vers un serveur
      console.log(`Uploading ${field}:`, file.name);
      return file.name;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des employés...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
          <p className="text-red-400 mb-4">❌ {error}</p>
          <button
            onClick={loadEmployees}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion du Personnel</h1>
          <p className="text-gray-400">Gérez vos employés, leurs horaires et documents</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un employé
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total employés</p>
          <p className="text-2xl font-bold text-white">{employees.length}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Actifs</p>
          <p className="text-2xl font-bold text-emerald-400">
            {employees.filter(e => (e.status || 'active') === 'active').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">En vacation</p>
          <p className="text-2xl font-bold text-yellow-400">
            {employees.filter(e => e.status === 'vacation').length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Masse salariale</p>
          <p className="text-2xl font-bold text-white">
            {(employees.reduce((acc, emp) => acc + (emp.salary || 0), 0) / 1000).toFixed(0)}K FCFA
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
              filterRole === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Tous ({employees.length})
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                filterRole === role
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {roleLabels[role]} ({employees.filter(e => e.type === role && e.is_active).length})
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingEmployee) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 sticky top-0 bg-gray-800 z-10 pb-4">
              {editingEmployee ? 'Modifier l\'employé' : 'Ajouter un nouvel employé'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const employeeData: any = {
                  name: formData.get('name') as string,
                  type: formData.get('type') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  dateHired: formData.get('dateHired') as string,
                  schedule: JSON.stringify(weekSchedule),
                  salary: Number(formData.get('salary')),
                  status: formData.get('status') as 'active' | 'vacation' | 'absent',
                  cvFile: formData.get('cvFile') as string || editingEmployee?.cvFile,
                  casierFile: formData.get('casierFile') as string || editingEmployee?.casierFile,
                  photo: photoPreview || editingEmployee?.photo || ''
                };

                // Ajouter le mot de passe uniquement si fourni et pour nouveau employé
                if (!editingEmployee) {
                  const password = formData.get('password') as string;
                  if (password && password.trim()) {
                    employeeData.password = password.trim();
                  }
                }
                
                if (editingEmployee) {
                  handleSaveEdit({ ...employeeData, id: editingEmployee.id });
                } else {
                  handleAddNew(employeeData);
                }
              }}
              className="space-y-4"
            >
              {/* Informations personnelles */}
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Informations personnelles</h3>
                
                {/* Photo de l'employé */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Photo de l'employé (optionnel)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      name="photo"
                      type="file"
                      accept="image/*"
                      id="photo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            setPhotoPreview(base64String);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer cursor-pointer"
                    />
                    {(photoPreview || editingEmployee?.photo) && (
                      <img 
                        src={photoPreview || editingEmployee?.photo || ''} 
                        alt="Photo" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: JPG, PNG, GIF (max 2MB)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Nom complet *</label>
                    <input
                      name="name"
                      defaultValue={editingEmployee?.name}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email *</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingEmployee?.email}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="email@restaurant.com"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Téléphone *</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={editingEmployee?.phone}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="77 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Adresse *</label>
                    <input
                      name="address"
                      defaultValue={editingEmployee?.address}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Dakar, Senegal"
                    />
                  </div>
                </div>
              </div>

              {/* Informations de connexion - Seulement pour nouveau employé */}
              {!editingEmployee && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">Mot de passe de connexion</h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Laissez vide pour générer automatiquement un mot de passe sécurisé
                      </p>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Mot de passe (optionnel)</label>
                        <div className="relative">
                          <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            className="w-full px-4 py-2 pr-12 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                            placeholder="Laissez vide pour génération automatique"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 transition-colors"
                            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? (
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
                        <p className="text-xs text-gray-500 mt-1">
                          Si fourni, doit contenir: 8+ caractères, majuscule, minuscule, chiffre et caractère spécial
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informations professionnelles */}
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Informations professionnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Rôle *</label>
                    <select
                      name="type"
                      defaultValue={editingEmployee?.type}
                      required
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Sélectionner un rôle</option>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Aperçu du code généré */}
                  {!editingEmployee && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Code qui sera généré</label>
                      <div className="w-full px-4 py-2 bg-gray-900/50 border border-emerald-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span className="text-emerald-400 font-mono font-semibold">
                            {generatePreviewCode(selectedRole)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Ce code sera automatiquement attribué lors de la création
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Date d'embauche *</label>
                    <input
                      name="dateHired"
                      type="date"
                      defaultValue={editingEmployee?.dateHired}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-3">Horaires de travail hebdomadaires *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day) => (
                        <div key={day}>
                          <label className="block text-gray-500 text-xs mb-1 capitalize">{day}</label>
                          <input
                            type="text"
                            value={weekSchedule[day as keyof typeof weekSchedule]}
                            onChange={(e) => setWeekSchedule({...weekSchedule, [day]: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                            placeholder="09:00-17:00 ou off"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Format: HH:MM-HH:MM (ex: 09:00-17:00) ou "off" pour un jour de repos
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Salaire mensuel (FCFA) *</label>
                    <input
                      name="salary"
                      type="number"
                      defaultValue={editingEmployee?.salary}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Statut *</label>
                    <select
                      name="status"
                      defaultValue={editingEmployee?.status || 'active'}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="active">Actif</option>
                      <option value="vacation">Vacation</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Documents requis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      CV (Curriculum Vitae) *
                    </label>
                    <input
                      name="cvFile"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const fileName = handleFileUpload(e, 'cvFile');
                        e.currentTarget.setAttribute('data-filename', fileName);
                      }}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer"
                    />
                    {editingEmployee?.cvFile && typeof editingEmployee.cvFile === 'string' && editingEmployee.cvFile.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fichier actuel: {editingEmployee.cvFile}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Casier judiciaire *
                    </label>
                    <input
                      name="casierFile"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const fileName = handleFileUpload(e, 'casierFile');
                        e.currentTarget.setAttribute('data-filename', fileName);
                      }}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer"
                    />
                    {editingEmployee?.casierFile && typeof editingEmployee.casierFile === 'string' && editingEmployee.casierFile.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fichier actuel: {editingEmployee.casierFile}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Formats acceptés: PDF, DOC, DOCX (max 5MB par fichier)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold"
                >
                  {editingEmployee ? 'Enregistrer les modifications' : 'Ajouter l\'employé'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setShowAddForm(false);
                    setSelectedRole('');
                    setPhotoPreview('');
                    setWeekSchedule({lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: ''});
                  }}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="space-y-4">
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-5 hover:shadow-xl transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 flex-1">
                {employee.photo ? (
                  <img 
                    src={employee.photo} 
                    alt={employee.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {employee.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{employee.name}</h3>
                  <p className="text-emerald-400 text-sm">{roleLabels[employee.type] || employee.type}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {employee.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {employee.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule & Salary */}
              <div className="hidden lg:flex flex-col items-end gap-1">
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatScheduleDisplay(employee.schedule)}
                </span>
                <span className="text-sm font-semibold text-white">
                  {(employee.salary || 0).toLocaleString()} FCFA/mois
                </span>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${statusLabels[employee.status || 'active'].color}`}>
                  {statusLabels[employee.status || 'active'].label}
                </span>
                
                {/* Documents Icons */}
                <div className="flex gap-1">
                  {employee.cvFile && typeof employee.cvFile === 'string' && employee.cvFile.length > 0 && (
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded" title="CV disponible">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                  )}
                  {employee.casierFile && typeof employee.casierFile === 'string' && employee.casierFile.length > 0 && (
                    <span className="p-2 bg-blue-500/20 text-blue-400 rounded" title="Casier disponible">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setEditingEmployee(employee)}
                  className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
                  title="Modifier"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/30"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Aucun employé trouvé</p>
        </div>
      )}
    </div>
  );
};
