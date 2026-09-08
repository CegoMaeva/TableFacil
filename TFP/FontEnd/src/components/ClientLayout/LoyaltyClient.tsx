import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  amount?: number;
  reward?: string;
  orderId?: string;
  date: string;
  description: string;
}

interface LoyaltyProfile {
  userId: string;
  userName: string;
  points: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  level: string;
  joinDate: string;
  transactions: Transaction[];
  levelInfo: {
    min_points: number;
    max_points: number;
    discount: number;
    color: string;
  };
  nextLevel?: {
    name: string;
    requiredPoints: number;
    pointsToGo: number;
  };
}

export const LoyaltyClient = () => {
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<{ name: string; points: number } | null>(null);

  const rewards = [
    { name: '500 FCFA de réduction', points: 50, discount: 500 },
    { name: '1000 FCFA de réduction', points: 100, discount: 1000 },
    { name: '2500 FCFA de réduction', points: 250, discount: 2500 },
    { name: '5000 FCFA de réduction', points: 500, discount: 5000 },
    { name: 'Plat gratuit', points: 300, discount: 0 },
    { name: 'Dessert gratuit', points: 150, discount: 0 },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/loyalty/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger votre profil de fidélité');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedReward || !profile) return;

    if (profile.points < selectedReward.points) {
      toast.error('Points insuffisants');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/loyalty/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: selectedReward.points,
          rewardName: selectedReward.name
        })
      });

      if (response.ok) {
        await fetchProfile();
        setShowRedeemModal(false);
        setSelectedReward(null);
        toast.success(`Récompense échangée ! ${selectedReward.name}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de l\'échange');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'échange');
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'from-orange-600 to-orange-700',
      'Silver': 'from-gray-400 to-gray-500',
      'Gold': 'from-yellow-500 to-yellow-600',
      'Platinum': 'from-purple-500 to-purple-600'
    };
    return colors[level] || 'from-gray-600 to-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400">Impossible de charger votre profil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Programme Fidélité
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Gagnez des points à chaque commande et profitez d'avantages exclusifs
          </p>
        </div>

        {/* Carte de fidélité */}
        <Card className={`bg-gradient-to-br ${getLevelColor(profile.level)} border-0 p-8 mb-8`}>
          <div className="text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm opacity-90">Membre depuis</p>
                <p className="text-lg font-semibold">{new Date(profile.joinDate).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Statut</p>
                <p className="text-2xl font-bold">{profile.level}</p>
                <p className="text-xs opacity-75">{profile.levelInfo.discount}% de réduction</p>
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-6xl font-bold">{profile.points}</p>
              <p className="text-xl opacity-90">Points disponibles</p>
              <p className="text-sm opacity-75 mt-2">
                {profile.totalPointsEarned} gagnés • {profile.totalPointsSpent} utilisés
              </p>
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowRedeemModal(true)}
                className="flex-1 bg-white text-gray-900 hover:bg-gray-100 font-semibold"
              >
                Utiliser mes points
              </Button>
              <Button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur">
                Historique
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progression vers le prochain niveau */}
          <div className="lg:col-span-2">
            {profile.nextLevel && (
              <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Progression vers {profile.nextLevel.name}
                </h3>
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{profile.points} points</span>
                    <span>{profile.nextLevel.requiredPoints} points</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(profile.points / profile.nextLevel.requiredPoints) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-3">
                  Plus que {profile.nextLevel.pointsToGo} points pour atteindre le niveau {profile.nextLevel.name} !
                </p>
              </Card>
            )}

            {/* Historique des transactions */}
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Dernières transactions</h3>
              <div className="space-y-3">
                {profile.transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'earn' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {transaction.type === 'earn' ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{transaction.description}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      transaction.type === 'earn' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'earn' ? '+' : ''}{transaction.points}
                    </span>
                  </div>
                ))}
                {profile.transactions.length === 0 && (
                  <p className="text-gray-400 text-center py-4">Aucune transaction pour le moment</p>
                )}
              </div>
            </Card>
          </div>

          {/* Avantages */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Vos avantages</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">1 point = 10 FCFA</h4>
                    <p className="text-gray-400 text-sm">1 point / 100 FCFA dépensés</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Réduction {profile.levelInfo.discount}%</h4>
                    <p className="text-gray-400 text-sm">Sur toutes vos commandes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Récompenses</h4>
                    <p className="text-gray-400 text-sm">Plats gratuits et plus</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Accès prioritaire</h4>
                    <p className="text-gray-400 text-sm">Nouveaux plats en avant-première</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal pour échanger des points */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Échanger vos points</h2>
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setSelectedReward(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm">Points disponibles</p>
                <p className="text-3xl font-bold text-white">{profile.points}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {rewards.map((reward) => (
                  <button
                    key={reward.name}
                    onClick={() => setSelectedReward(reward)}
                    disabled={profile.points < reward.points}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedReward?.name === reward.name
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : profile.points >= reward.points
                        ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                        : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-semibold">{reward.name}</h3>
                      {selectedReward?.name === reward.name && (
                        <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-emerald-400 font-bold">{reward.points} points</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleRedeem}
                  disabled={!selectedReward}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Échanger
                </Button>
                <Button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setSelectedReward(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
