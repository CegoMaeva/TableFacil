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
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Programme Fidélité</h1>
          <p className="text-gray-400 text-lg">Gagnez des points à chaque commande et profitez d'avantages exclusifs</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Points Card */}
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm font-medium">Récompenses disponibles</p>
                <p className="text-4xl font-bold text-white mt-2">{profile.points}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-sm">{profile.totalPointsEarned} gagnés • {profile.totalPointsSpent} utilisés</p>
          </Card>

          {/* Level Card */}
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm font-medium">Niveau</p>
                <p className="text-4xl font-bold text-white mt-2">{profile.level}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-sm">Membre privilégié • {profile.levelInfo.discount}% de réduction</p>
          </Card>

          {/* Member Since Card */}
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm font-medium">Membre depuis</p>
                <p className="text-2xl font-bold text-white mt-2">{new Date(profile.joinDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-sm">Client depuis {new Date(profile.joinDate).getFullYear()}</p>
          </Card>
        </div>

        {/* Historique des Points */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Historique des Points</h2>
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="space-y-3">
              {profile.transactions.slice(0, 8).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      transaction.type === 'earn' ? 'bg-emerald-500/20' : 'bg-gray-600/30'
                    }`}>
                      {transaction.type === 'earn' ? (
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{transaction.description}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold flex-shrink-0 ${
                    transaction.type === 'earn' ? 'text-emerald-400' : 'text-gray-400'
                  }`}>
                    {transaction.type === 'earn' ? '+' : '−'}{transaction.points}
                  </span>
                </div>
              ))}
              {profile.transactions.length === 0 && (
                <p className="text-gray-400 text-center py-8">Aucune transaction pour le moment</p>
              )}
            </div>
          </Card>
        </div>

        {/* Utiliser mes Points / Rewards Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Utiliser mes Points</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <Card key={reward.name} className="bg-gray-800 border-gray-700 p-6 flex flex-col">
                <div className="flex-1 mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">{reward.name}</h3>
                  <p className="text-emerald-400 font-bold text-2xl">{reward.points} points</p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedReward(reward);
                    setShowRedeemModal(true);
                  }}
                  disabled={profile.points < reward.points}
                  className={`w-full font-semibold transition-all ${
                    profile.points >= reward.points
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  Échanger
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Modal pour échanger des points */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Confirmer l'échange</h2>
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

              {selectedReward && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Récompense sélectionnée</p>
                  <p className="text-xl font-bold text-white mb-2">{selectedReward.name}</p>
                  <p className="text-emerald-400 font-bold text-lg">{selectedReward.points} points</p>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm">Points disponibles</p>
                <p className="text-3xl font-bold text-white">{profile.points}</p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleRedeem}
                  disabled={!selectedReward}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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
