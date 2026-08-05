# Guide du Système de Fidélité - TFP Restaurant

## 📋 Vue d'Ensemble

Le système de fidélité TFP permet aux clients de gagner des points à chaque achat et de bénéficier de récompenses exclusives. Le système est entièrement intégré côté client et gestionnaire.

---

## 🎯 Fonctionnalités Principales

### Pour les Clients
- **Carte de fidélité digitale** avec niveau et points
- **Progression visuelle** vers le prochain niveau
- **Historique des transactions** (gains et dépenses de points)
- **Catalogue de récompenses** échangeables
- **Avantages automatiques** selon le niveau

### Pour les Gestionnaires
- **Tableau de bord statistiques** du programme
- **Liste complète des membres** avec recherche et filtres
- **Distribution par niveaux** avec visualisation
- **Statistiques globales** (total membres, points distribués/utilisés)

---

## 💎 Système de Niveaux

### Bronze (0-499 points)
- **Réduction**: 0%
- **Couleur**: Orange (#f97316)
- Niveau de départ pour tous les nouveaux membres

### Silver (500-999 points)
- **Réduction**: 5%
- **Couleur**: Gris (#94a3b8)
- Avantages: Accès prioritaire aux réservations

### Gold (1000-1999 points)
- **Réduction**: 10%
- **Couleur**: Jaune (#fbbf24)
- Avantages: Offres spéciales + accès prioritaire

### Platinum (2000+ points)
- **Réduction**: 15%
- **Couleur**: Cyan (#06b6d4)
- Avantages: Tous les avantages + cadeaux d'anniversaire

---

## 💰 Système de Points

### Calcul des Points
```
1 point = 100 FCFA dépensés
1 point = 10 FCFA de valeur à l'échange
```

**Exemple**: Un achat de 5,000 FCFA = 50 points gagnés

### Comment Gagner des Points
1. **Commandes en ligne** - Automatique après paiement
2. **Réservations avec dépôt** - Points sur le montant du dépôt
3. **Bonus spéciaux** - Ajoutés manuellement par le gestionnaire

### Utilisation des Points
Les points peuvent être échangés contre:
- Réductions sur les commandes
- Plats gratuits
- Desserts offerts
- Récompenses exclusives

---

## 🎁 Catalogue de Récompenses

### Réductions
| Points | Récompense | Valeur |
|--------|-----------|--------|
| 50 | Réduction 500 FCFA | 500 FCFA |
| 100 | Réduction 1000 FCFA | 1,000 FCFA |
| 250 | Réduction 2500 FCFA | 2,500 FCFA |
| 500 | Réduction 5000 FCFA | 5,000 FCFA |

### Plats & Desserts
| Points | Récompense | Description |
|--------|-----------|-------------|
| 300 | Plat Offert | Un plat au choix du menu |
| 150 | Dessert Gratuit | Un dessert au choix |

---

## 🔧 API Backend

### Base URL
```
http://localhost:5000/api/loyalty
```

### Endpoints Disponibles

#### 1. Obtenir le Profil Utilisateur
```http
GET /api/loyalty/profile
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "userId": "user123",
  "level": "Gold",
  "currentPoints": 1250,
  "totalEarned": 2500,
  "totalSpent": 1250,
  "discountPercent": 10,
  "nextLevel": "Platinum",
  "pointsToNextLevel": 750,
  "memberSince": "2024-01-15T10:30:00Z",
  "transactions": [
    {
      "id": "trans1",
      "type": "earn",
      "amount": 150,
      "description": "Commande #12345",
      "date": "2024-11-10T14:20:00Z"
    }
  ]
}
```

#### 2. Ajouter des Points (Après Commande)
```http
POST /api/loyalty/add-points
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "orderId": "order123"
}
```

**Réponse:**
```json
{
  "success": true,
  "pointsAdded": 50,
  "newTotal": 1300,
  "newLevel": "Gold"
}
```

#### 3. Échanger des Points
```http
POST /api/loyalty/redeem
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 100,
  "rewardId": "discount_1000"
}
```

**Réponse:**
```json
{
  "success": true,
  "pointsRedeemed": 100,
  "remainingPoints": 1200,
  "reward": {
    "id": "discount_1000",
    "name": "Réduction 1000 FCFA",
    "code": "LOYAL-ABC123"
  }
}
```

#### 4. Liste de Tous les Profils (Gestionnaire)
```http
GET /api/loyalty/all
Authorization: Bearer {admin_token}
```

**Réponse:**
```json
[
  {
    "userId": "user123",
    "userName": "Jean Dupont",
    "level": "Gold",
    "currentPoints": 1250,
    "totalEarned": 2500,
    "totalSpent": 1250,
    "memberSince": "2024-01-15T10:30:00Z"
  }
]
```

#### 5. Statistiques du Programme (Gestionnaire)
```http
GET /api/loyalty/stats
Authorization: Bearer {admin_token}
```

**Réponse:**
```json
{
  "totalMembers": 152,
  "totalPointsDistributed": 125000,
  "totalPointsRedeemed": 45000,
  "averagePointsPerMember": 822,
  "levelDistribution": {
    "Bronze": 45,
    "Silver": 62,
    "Gold": 35,
    "Platinum": 10
  }
}
```

---

## 💻 Intégration Frontend

### Composants Créés

#### 1. LoyaltyClient.tsx (Client)
**Localisation**: `FontEnd/src/components/ClientLayout/LoyaltyClient.tsx`

**Fonctionnalités**:
- Carte de fidélité animée avec gradient selon le niveau
- Affichage des points actuels, gagnés et dépensés
- Barre de progression vers le prochain niveau
- Historique des transactions avec codes couleur
- Modal d'échange de récompenses
- Section des avantages du programme

**Hooks utilisés**:
```tsx
const [profile, setProfile] = useState<LoyaltyProfile | null>(null);
const [showRedeemModal, setShowRedeemModal] = useState(false);
const [loading, setLoading] = useState(true);
```

#### 2. LoyaltyManager.tsx (Gestionnaire)
**Localisation**: `FontEnd/src/components/ManagerLayout/LoyaltyManager.tsx`

**Fonctionnalités**:
- 4 cartes statistiques avec gradients (membres, points distribués, points utilisés, moyenne)
- Distribution par niveaux avec pourcentages
- Tableau de membres avec:
  - Recherche par nom/ID
  - Filtres par niveau
  - Tri par points décroissant
  - Badges de niveau colorés
  - Points actuels, totaux gagnés/dépensés
  - Date d'adhésion
  - Pourcentage de réduction

**États**:
```tsx
const [profiles, setProfiles] = useState<LoyaltyProfile[]>([]);
const [stats, setStats] = useState<LoyaltyStats | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [levelFilter, setLevelFilter] = useState('all');
```

### Intégration dans les Layouts

#### ClientLayout (index.tsx)
```tsx
import { LoyaltyClient } from './LoyaltyClient';

// Dans renderContent()
case 'fidelite':
  return <LoyaltyClient />;
```

#### ManagerLayout (index.tsx)
```tsx
import { LoyaltyManager } from './LoyaltyManager';

// Dans menuItems
{
  id: 'fidelite',
  label: 'Fidélité',
  icon: (/* Icône étoile */)
}

// Dans renderContent()
case 'fidelite':
  return <LoyaltyManager />;
```

---

## 🎨 Design & UX

### Palette de Couleurs par Niveau
```css
Bronze:   from-orange-500 to-amber-600
Silver:   from-gray-400 to-slate-500
Gold:     from-yellow-400 to-amber-500
Platinum: from-cyan-400 to-blue-500
```

### Animations
- **Entrée des cartes**: `animate-in` avec délais échelonnés
- **Hover**: Transformation et élévation des cartes
- **Transitions**: Couleurs de fond fluides sur hover

### Icônes
- **Points gagnés**: Cercle vert avec flèche montante
- **Points dépensés**: Cercle rouge avec flèche descendante
- **Niveaux**: Étoiles colorées selon le niveau
- **Avantages**: SVG personnalisés (argent, cadeau, étoile, badge)

---

## 📊 Fichier de Données

**Localisation**: `Backend/data/loyalty.json`

**Structure**:
```json
{
  "user123": {
    "userId": "user123",
    "currentPoints": 1250,
    "totalEarned": 2500,
    "totalSpent": 1250,
    "memberSince": "2024-01-15T10:30:00Z",
    "transactions": [
      {
        "id": "trans1",
        "type": "earn",
        "amount": 150,
        "description": "Commande #12345",
        "orderId": "order123",
        "date": "2024-11-10T14:20:00Z"
      },
      {
        "id": "trans2",
        "type": "redeem",
        "amount": 100,
        "description": "Réduction 1000 FCFA",
        "rewardId": "discount_1000",
        "date": "2024-11-08T16:45:00Z"
      }
    ]
  }
}
```

---

## 🔐 Sécurité

### Authentification
- Tous les endpoints nécessitent un JWT valide
- Le token est vérifié via `@jwt_required()`
- L'identité utilisateur est extraite de `get_jwt_identity()`

### Autorisation
- **Endpoints client**: Accès uniquement à son propre profil
- **Endpoints gestionnaire**: Vérification du rôle 'manager'
- Validation `clientId` pour empêcher l'accès aux données d'autres utilisateurs

### Validation des Données
```python
# Vérification des points suffisants
if profile['currentPoints'] < points:
    return jsonify({'error': 'Points insuffisants'}), 400

# Vérification du montant positif
if amount <= 0:
    return jsonify({'error': 'Montant invalide'}), 400
```

---

## 🚀 Utilisation

### Côté Client

#### 1. Consulter son Profil
1. Se connecter à l'application
2. Cliquer sur l'onglet **"Fidélité"** dans la navigation
3. Voir sa carte de fidélité avec niveau et points
4. Consulter la progression vers le prochain niveau

#### 2. Voir l'Historique
1. Dans la section **"Historique des Transactions"**
2. Transactions récentes affichées avec:
   - Type (gagné/dépensé)
   - Montant en points
   - Description
   - Date

#### 3. Échanger des Points
1. Cliquer sur **"Échanger mes points"**
2. Sélectionner une récompense dans le modal
3. Confirmer l'échange
4. Recevoir un code de confirmation

### Côté Gestionnaire

#### 1. Voir les Statistiques
1. Se connecter en tant que gestionnaire
2. Aller dans **"Fidélité"**
3. Voir les 4 cartes de statistiques:
   - Total membres
   - Total points distribués (vert)
   - Total points utilisés (rouge)
   - Moyenne par membre (violet)

#### 2. Consulter les Membres
1. Tableau de tous les membres affiché
2. **Rechercher**: Taper un nom ou ID dans la barre
3. **Filtrer**: Choisir un niveau (All/Bronze/Silver/Gold/Platinum)
4. **Trier**: Automatiquement par points décroissant

#### 3. Analyser la Distribution
1. Voir la section **"Distribution par Niveaux"**
2. Nombres et pourcentages pour chaque niveau
3. Cercles colorés pour identification rapide

---

## 🔄 Intégration Automatique avec les Commandes

### À Implémenter (Future)
Pour automatiser l'ajout de points après chaque commande:

#### Dans Backend/app/routes/orders.py
```python
from routes.loyalty import add_points_internal

# Après paiement réussi
@orders_bp.route('/orders/pay', methods=['POST'])
def pay_order():
    # ... traitement paiement ...
    
    if payment_successful:
        # Ajouter points de fidélité
        add_points_internal(
            user_id=order['userId'],
            amount=order['total'],
            order_id=order['id']
        )
```

#### Nouvelle fonction dans loyalty.py
```python
def add_points_internal(user_id, amount, order_id):
    """Fonction interne pour ajouter des points depuis d'autres modules"""
    points = calculate_points_from_amount(amount)
    
    # Charger le profil
    loyalty_data = load_loyalty_data()
    profile = loyalty_data.get(user_id, create_new_profile(user_id))
    
    # Ajouter points
    profile['currentPoints'] += points
    profile['totalEarned'] += points
    
    # Ajouter transaction
    transaction = {
        'id': f"trans_{int(time.time())}",
        'type': 'earn',
        'amount': points,
        'description': f"Commande #{order_id}",
        'orderId': order_id,
        'date': datetime.now().isoformat()
    }
    profile['transactions'].append(transaction)
    
    # Sauvegarder
    loyalty_data[user_id] = profile
    save_loyalty_data(loyalty_data)
    
    return points
```

---

## 📈 Métriques de Succès

### KPIs à Suivre
1. **Taux d'adoption**: % de clients inscrits au programme
2. **Fréquence d'utilisation**: Moyenne de transactions par mois
3. **Taux d'échange**: % de points utilisés vs gagnés
4. **Distribution**: Répartition des membres par niveau
5. **Valeur moyenne**: Montant moyen dépensé par niveau

### Rapports Disponibles
- Distribution par niveaux (implémenté)
- Total points en circulation (implémenté)
- Moyenne par membre (implémenté)

### Rapports à Ajouter (Future)
- Évolution mensuelle des inscriptions
- Récompenses les plus populaires
- Taux de rétention par niveau
- Valeur vie client (LTV) par niveau

---

## 🐛 Dépannage

### Problème: Profil ne s'affiche pas
**Causes possibles**:
1. Token JWT expiré ou invalide
2. Fichier `loyalty.json` corrompu
3. Backend non démarré

**Solutions**:
```bash
# 1. Vérifier le backend
cd Backend
python run.py

# 2. Vérifier le fichier de données
cat data/loyalty.json

# 3. Se reconnecter pour obtenir un nouveau token
```

### Problème: Points non ajoutés après commande
**Causes possibles**:
1. Fonction d'ajout automatique non implémentée
2. Erreur dans le calcul des points
3. Permissions insuffisantes

**Solutions**:
1. Implémenter `add_points_internal()` (voir section Intégration)
2. Vérifier les logs du backend
3. Ajouter manuellement via l'API

### Problème: Statistiques incorrectes
**Solutions**:
```python
# Recalculer manuellement dans loyalty.py
@loyalty_bp.route('/loyalty/recalculate', methods=['POST'])
@jwt_required()
def recalculate_stats():
    # Recharger tous les profils
    # Recalculer les totaux
    # Sauvegarder
```

---

## 📝 TODO & Améliorations Futures

### Court Terme
- [ ] Intégration automatique avec les commandes
- [ ] Notifications par email pour les niveaux atteints
- [ ] Codes promo générés automatiquement

### Moyen Terme
- [ ] Bonus d'anniversaire automatique
- [ ] Programme de parrainage
- [ ] Récompenses saisonnières
- [ ] Historique détaillé avec filtres par date

### Long Terme
- [ ] Application mobile native
- [ ] Carte physique NFC
- [ ] Partenariats avec autres restaurants
- [ ] Programme VIP Platinum+

---

## 📞 Support

Pour toute question ou problème:
1. Vérifier cette documentation
2. Consulter les logs du backend
3. Contacter l'équipe technique

---

## 📄 Licence & Crédits

**Projet**: TFP Restaurant Management System  
**Module**: Loyalty System  
**Version**: 1.0.0  
**Date**: Novembre 2024  

**Technologies**:
- Backend: Flask 3.0.0, JWT, Python 3.x
- Frontend: React 18.2.0, TypeScript, Tailwind CSS
- UI: Sonner (toasts), Custom components

---

*Ce guide sera mis à jour au fur et à mesure de l'évolution du système de fidélité.*
