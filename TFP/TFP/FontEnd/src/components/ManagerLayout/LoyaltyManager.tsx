import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface LoyaltyProfile {
  userId: string;
  userName: string;
  points: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  level: string;
  joinDate: string;
  levelInfo: {
    min_points: number;
    max_points: number;
    discount: number;
    color: string;
  };
}

interface Stats {
  totalMembers: number;
  totalPointsDistributed: number;
  totalPointsRedeemed: number;
  averagePoints: number;
  levelDistribution: {
    Bronze: number;
    Silver: number;
    Gold: number;
    Platinum: number;
  };
}

export const LoyaltyManager = () => {
  const [profiles, setProfiles] = useState<LoyaltyProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        setLoading(false);
        return;
      }
      
      // Charger les profils
      const profilesRes = await fetch('http://localhost:5000/api/loyalty/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Charger les stats
      const statsRes = await fetch('http://localhost:5000/api/loyalty/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profilesRes.ok && statsRes.ok) {
        const profilesData = await profilesRes.json();
        const statsData = await statsRes.json();
        setProfiles(profilesData);
        setStats(statsData);
      } else {
        console.error('Erreur API:', profilesRes.status, statsRes.status);
        toast.error('Erreur lors du chargement des données');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de se connecter au serveur');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'text-orange-400 bg-orange-500/20',
      'Silver': 'text-gray-400 bg-gray-500/20',
      'Gold': 'text-yellow-400 bg-yellow-500/20',
      'Platinum': 'text-purple-400 bg-purple-500/20'
    };
    return colors[level] || 'text-gray-400 bg-gray-500/20';
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = (profile.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (profile.userId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || profile.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-neutral-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-gray-400">Chargement des données de fidélité...</p>
      </div>
    );
  }

  // Affichage si aucune donnée
  if (!stats || profiles.length === 0) {
    return (
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Programme de Fidélité</h1>
          <p className="text-gray-400 mt-1">Gérez le programme de fidélité de vos clients</p>
        </div>
        <Card className="bg-gray-800/50 border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Aucun membre inscrit</h3>
          <p className="text-gray-400">
            Les clients seront automatiquement inscrits au programme lors de leur première commande
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Programme de Fidélité</h1>
        <p className="text-gray-400 mt-1">Gérez le programme de fidélité de vos clients</p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 p-6">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm opacity-90">Membres total</p>
              </div>
              <p className="text-4xl font-bold">{stats.totalMembers}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 p-6">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm opacity-90">Points distribués</p>
              </div>
              <p className="text-4xl font-bold">{stats.totalPointsDistributed.toLocaleString()}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0 p-6">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <p className="text-sm opacity-90">Points échangés</p>
              </div>
              <p className="text-4xl font-bold">{stats.totalPointsRedeemed.toLocaleString()}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-6">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm opacity-90">Moyenne pts/client</p>
              </div>
              <p className="text-4xl font-bold">{stats.averagePoints}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Distribution par niveau */}
      {stats && (
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Distribution par niveau</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.levelDistribution).map(([level, count]) => (
              <div key={level} className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  level === 'Bronze' ? 'bg-orange-500/20' :
                  level === 'Silver' ? 'bg-gray-500/20' :
                  level === 'Gold' ? 'bg-yellow-500/20' :
                  'bg-purple-500/20'
                }`}>
                  <span className={`text-2xl font-bold ${
                    level === 'Bronze' ? 'text-orange-400' :
                    level === 'Silver' ? 'text-gray-400' :
                    level === 'Gold' ? 'text-yellow-400' :
                    'text-purple-400'
                  }`}>{count}</span>
                </div>
                <p className="text-white font-semibold">{level}</p>
                <p className="text-gray-400 text-sm">
                  {stats.totalMembers > 0 ? Math.round((count / stats.totalMembers) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filtres et recherche */}
      <Card className="bg-gray-800 border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="search">Rechercher un membre</Label>
            <Input
              id="search"
              type="text"
              placeholder="Nom ou ID utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="levelFilter">Filtrer par niveau</Label>
            <select
              id="levelFilter"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md"
            >
              <option value="all">Tous les niveaux</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des membres */}
      <Card className="bg-gray-800 border-gray-700">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Membres ({filteredProfiles.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Membre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Niveau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Points actuels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total gagné
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total utilisé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Membre depuis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Réduction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredProfiles.map((profile) => (
                <tr key={profile.userId} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">{profile.userName}</div>
                      <div className="text-sm text-gray-400">{profile.userId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(profile.level)}`}>
                      {profile.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-white font-bold">{profile.points.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-green-400">{profile.totalPointsEarned.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-red-400">{profile.totalPointsSpent.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(profile.joinDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-emerald-400 font-semibold">{profile.levelInfo.discount}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProfiles.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Aucun membre trouvé
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
