# Intégration de la Section Analytics

## Vue d'ensemble
La section Analytics connecte maintenant le frontend React à l'API Backend Flask pour afficher des statistiques en temps réel.

## Endpoints API utilisés

### 1. Dashboard Stats - `/api/analytics/dashboard`
**Méthode:** GET  
**Authentification:** Bearer token (Gérant uniquement)  
**Description:** Statistiques du jour

**Réponse:**
```json
{
  "ordersToday": 25,
  "ordersVariation": 12.5,
  "reservationsToday": 8,
  "reservationsPending": 3,
  "revenueToday": 245000,
  "revenueFormatted": "245,000 FCFA",
  "averageBasket": 9800,
  "averageBasketFormatted": "9,800 FCFA",
  "activeClients": 123,
  "date": "2025-11-18"
}
```

### 2. Popular Items - `/api/analytics/popular-items`
**Méthode:** GET  
**Authentification:** Bearer token (Gérant uniquement)  
**Description:** Top 10 plats les plus commandés

**Réponse:**
```json
[
  {
    "name": "Thieboudienne",
    "orders": 156,
    "revenue": 390000
  },
  {
    "name": "Poulet Yassa",
    "orders": 142,
    "revenue": 355000
  }
]
```

### 3. Orders Analytics - `/api/analytics/orders?period={period}`
**Méthode:** GET  
**Authentification:** Bearer token (Gérant uniquement)  
**Paramètres:**
- `period` (query): "today", "week", "month", "year"

**Réponse:**
```json
{
  "totalOrders": 175,
  "totalRevenue": 1750000,
  "statusDistribution": {
    "pending": 12,
    "confirmed": 8,
    "preparing": 5,
    "delivered": 145,
    "cancelled": 5
  },
  "typeDistribution": {
    "delivery": 95,
    "takeaway": 45,
    "dine_in": 35
  },
  "typeRevenue": {
    "delivery": 950000,
    "takeaway": 450000,
    "dine_in": 350000
  },
  "dailyRevenue": {
    "2025-11-11": 245000,
    "2025-11-12": 198000,
    "2025-11-13": 312000,
    "2025-11-14": 275000,
    "2025-11-15": 289000,
    "2025-11-16": 321000,
    "2025-11-17": 298000,
    "2025-11-18": 245000
  },
  "period": "week"
}
```

### 4. Statistiques clients - `/api/analytics/customers`
**Méthode:** GET  
**Authentification:** Bearer token (Gérant uniquement)  
**Description:** Retourne les indicateurs clients (nouveaux, fidèles, inactifs, satisfaction) calculés à partir de `users.json`, `orders.json` et `reviews.json`.

**Réponse:**
```json
{
  "newClients": 12,
  "loyalClients": 48,
  "inactiveClients": 6,
  "satisfaction": 4.6
}
```

### 5. Employés performants - `/api/analytics/top-staff`
**Méthode:** GET  
**Authentification:** Bearer token (Gérant uniquement)  
**Description:** Classement des employés basé sur `data/staff_performance.json` (nombre de commandes gérées + note moyenne).

**Réponse:**
```json
[
  {
    "id": "staff_marie_dubois",
    "name": "Marie Dubois",
    "role": "Cuisinière",
    "ordersHandled": 156,
    "rating": 4.9
  },
  {
    "id": "staff_jean_martin",
    "name": "Jean Martin",
    "role": "Serveur",
    "ordersHandled": 142,
    "rating": 4.8
  }
]
```

## Composant Frontend - Analytics.tsx

### État (State)
```typescript
const [period, setPeriod] = useState('week');
const [loading, setLoading] = useState(true);
const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
const [ordersAnalytics, setOrdersAnalytics] = useState<any>(null);
```

### Fonction de chargement
```typescript
const loadAnalytics = async () => {
  // 1. Récupère le token depuis localStorage ('auth_token')
  // 2. Appelle les 3 endpoints en parallèle
  // 3. Met à jour les states avec les données reçues
  // 4. Gère les erreurs avec toast notifications
};
```

### useEffect
```typescript
useEffect(() => {
  loadAnalytics();
}, [period]); // Se déclenche à chaque changement de période
```

### Transformation des données

#### KPIs
Les KPIs sont directement extraits de `dashboardStats`:
- **Revenus totaux**: `dashboardStats.revenueToday`
- **Commandes**: `dashboardStats.ordersToday`
- **Clients**: `dashboardStats.activeClients`
- **Panier moyen**: `dashboardStats.averageBasket`
- **Variation**: `dashboardStats.ordersVariation` (%)

#### Graphiques

**1. Ventes hebdomadaires (Bar Chart)**
```typescript
const salesData = Object.entries(ordersAnalytics?.dailyRevenue || {})
  .map(([date, revenue]) => ({
    day: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
    ventes: revenue,
    commandes: 0
  }));
```

**2. Plats populaires (Pie Chart)**
```typescript
const dishesData = popularItems.slice(0, 5).map((item, index) => ({
  name: item.name,
  value: item.orders,
  color: ['bg-orange-500', 'bg-yellow-500', ...][index],
  sales: item.revenue
}));
```

## Authentification

### Token Storage
Le token JWT est stocké dans `localStorage` sous la clé `auth_token`:
```typescript
const token = localStorage.getItem('auth_token');
```

### Headers
```typescript
headers: { 
  'Authorization': `Bearer ${token}` 
}
```

### Permissions
Tous les endpoints analytics nécessitent:
1. Token JWT valide
2. Utilisateur avec rôle `gerant`

## Identifiants de test

### Compte Gérant
- **Code**: GER-2024-A001
- **Mot de passe**: Admin@2024

### Connexion
1. Aller sur la page de connexion employé
2. Entrer le code et mot de passe
3. Naviguer vers la section "Analyses"

## Gestion d'erreurs

### Frontend
- Toast notifications via `sonner` library
- Logs console pour debugging
- État de chargement pendant les requêtes
- Vérification du token avant chaque appel

### Backend
- Vérification du rôle gérant
- Validation du token JWT
- Gestion des exceptions Python
- Messages d'erreur descriptifs

## Fichiers modifiés

### Frontend
- `FontEnd/src/components/ManagerLayout/Analytics.tsx` - Composant principal
  - Ajout des imports (useState, useEffect, toast)
  - Création de la fonction loadAnalytics()
  - Connexion aux APIs
  - Transformation des données pour les graphiques

### Backend (déjà existant)
- `Backend/app/routes/analytics.py` - Routes API
  - `/api/analytics/dashboard`
  - `/api/analytics/orders`
  - `/api/analytics/popular-items`

## Données mock restantes

Certaines sections utilisent encore des données mock car les endpoints backend n'existent pas encore:

1. **Heures de pointe** - `peakHours` array
2. **Version simple des graphiques** (barres/colonnes) qui réutilisent les mêmes données mais restent statiques pour l'instant

Ces sections peuvent être connectées aux APIs futures si nécessaire.

## Tests

### Test manuel
1. Se connecter en tant que gérant (GER-2024-A001 / Admin@2024)
2. Naviguer vers "Analyses & Statistiques"
3. Vérifier l'affichage des KPIs
4. Changer la période (Aujourd'hui / Cette semaine / Ce mois / Cette année)
5. Observer la mise à jour des graphiques

### Logs à surveiller
- Console Frontend: Erreurs de fetch, réponses API
- Terminal Backend: Requêtes HTTP, erreurs Python
- Network tab: Status codes (200 OK, 401 Unauthorized, 403 Forbidden)

## Prochaines étapes (optionnel)

Pour améliorer la section Analytics:

1. **Ajouter plus d'endpoints**
   - Heures de pointe (peak hours analytics)
   - Statistiques des moyens de paiement
   - Performance par catégorie de menu
   - Analytics des zones de livraison
   - Statistiques des employés

2. **Graphiques additionnels**
   - Tendances mensuelles
   - Comparaison année/année
   - Heatmap des heures de pointe
   - Performance par employé

3. **Filtres avancés**
   - Plage de dates personnalisée
   - Filtrer par type de commande
   - Filtrer par statut
   - Filtrer par employé

4. **Export de données**
   - Export CSV
   - Export PDF
   - Impression des rapports

5. **Temps réel**
   - WebSocket pour mises à jour en direct
   - Actualisation automatique toutes les X minutes
   - Notifications pour événements importants

## Dépannage

### Erreur 401 Unauthorized
- Vérifier que le token est présent dans localStorage (`auth_token`)
- Vérifier que le token n'a pas expiré
- Se reconnecter si nécessaire

### Erreur 403 Forbidden
- Vérifier que l'utilisateur connecté est un gérant
- Le rôle doit être `gerant` dans le token JWT

### Pas de données affichées
- Vérifier que orders.json contient des commandes
- Vérifier que les dates dans orders.json sont au bon format (ISO 8601)
- Consulter la console et les logs backend

### Graphiques vides
- Vérifier que `dailyRevenue` contient des données
- Vérifier la transformation des données (Object.entries)
- Vérifier que recharts est installé et importé

## Conclusion

La section Analytics est maintenant fonctionnelle avec des données réelles provenant du backend. Les KPIs, graphiques de ventes et plats populaires sont dynamiques et se mettent à jour selon la période sélectionnée.
