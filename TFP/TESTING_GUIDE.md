# Guide de Test - Authentification TasteFoods

## 🚀 Serveurs en cours d'exécution

### Backend Flask
- **URL**: http://localhost:5000
- **Status**: ✅ En ligne
- **Endpoints**: 
  - POST `/api/auth/login/client`
  - POST `/api/auth/login/employee`
  - POST `/api/auth/register/employee`
  - GET `/api/auth/verify`

### Frontend React
- **URL**: http://localhost:5173
- **Status**: ✅ En ligne
- **Framework**: Vite + React + TypeScript

---

## 🧪 Tests à effectuer

### 1. Test Connexion Client (Email uniquement)

**Comment tester:**
1. Ouvrir http://localhost:5173
2. Sélectionner "Client"
3. Entrer n'importe quel email: `test@example.com`
4. Cliquer sur "Se connecter"

**Résultat attendu:**
- ✅ Connexion réussie
- ✅ Token JWT créé et stocké
- ✅ Redirection vers l'interface ClientLayout
- ✅ Nouvelle entrée dans `Backend/data/users.json`

---

### 2. Test Connexion Gérant (Code employé)

**Comment tester:**
1. Ouvrir http://localhost:5173
2. Sélectionner "Employé"
3. Entrer le code: `GER-2024-A001`
4. Cliquer sur "Se connecter"

**Résultat attendu:**
- ✅ Connexion réussie en tant que "Gérant"
- ✅ Token JWT créé (durée 12h pour employés)
- ✅ Redirection vers ManagerLayout (Dashboard)
- ✅ Affichage des permissions gérant

**Compte admin pré-créé:**
```json
{
  "id": "emp_admin001",
  "name": "Admin Principal",
  "email": "admin@tastefoods.com",
  "code": "GER-2024-A001",
  "type": "gerant"
}
```

---

### 3. Test Inscription Client

**Comment tester:**
1. Ouvrir http://localhost:5173
2. Cliquer sur l'onglet "Inscription"
3. Entrer:
   - Nom: "Jean Dupont"
   - Email: "jean@example.com"
4. Cliquer sur "Créer mon compte"

**Résultat attendu:**
- ✅ Compte créé automatiquement
- ✅ Connexion automatique après inscription
- ✅ Token JWT créé
- ✅ Redirection vers ClientLayout

---

### 4. Test Codes Employés Différents

**Codes à tester:**

| Type | Code à utiliser | Format |
|------|----------------|--------|
| Gérant | `GER-2024-A001` | GER-YEAR-LLNN ✅ |
| Cuisinier | À créer par gérant | CUI-YEAR-NNLL |
| Serveur | À créer par gérant | SRV-YEAR-LNLN |
| Caissier | À créer par gérant | CAI-YEAR-NNNN |
| Livreur | À créer par gérant | LIV-YEAR-NLNL |
| Entretien | À créer par gérant | ENT-YEAR-NNN |
| Service Client | À créer par gérant | CLI-YEAR-LLNN |

---

### 5. Test Création d'Employé (Par Gérant)

**Pré-requis:** Être connecté en tant que gérant

**Avec cURL:**
```bash
# Se connecter d'abord pour obtenir le token
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{"code": "GER-2024-A001"}'

# Copier le token reçu, puis créer un employé
curl -X POST http://localhost:5000/api/auth/register/employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "name": "Mario Rossi",
    "email": "mario@tastefoods.com",
    "phone": "+33612345678",
    "type": "cuisinier"
  }'
```

**Résultat attendu:**
- ✅ Employé créé avec code auto-généré (ex: `CUI-2024-45GH`)
- ✅ Nouvelle entrée dans `Backend/data/employees.json`
- ✅ Code unique validé selon le type

---

### 6. Test Déconnexion

**Comment tester:**
1. Se connecter (client ou employé)
2. Cliquer sur le bouton "Déconnexion"

**Résultat attendu:**
- ✅ Token supprimé du localStorage
- ✅ Redirection vers page de connexion
- ✅ Session invalide côté backend

---

### 7. Test Token JWT Expiration

**Durée des tokens:**
- Client: 24 heures
- Employé: 12 heures

**Comment tester:**
1. Se connecter
2. Vérifier le token dans localStorage
3. Décoder le JWT sur https://jwt.io
4. Vérifier les claims: `exp`, `iat`, `user_id`, `user_type`, `role`

---

## 🔍 Vérifications dans les Données

### Fichier: `Backend/data/users.json`
```json
{
  "users": [
    {
      "id": "user_abc123",
      "email": "test@example.com",
      "name": "Test User",
      "user_type": "client",
      "loyalty_points": 0,
      "orders_count": 0,
      "created_at": "2025-11-13T..."
    }
  ]
}
```

### Fichier: `Backend/data/employees.json`
```json
{
  "employees": [
    {
      "id": "emp_admin001",
      "name": "Admin Principal",
      "code": "GER-2024-A001",
      "type": "gerant",
      "is_active": true
    }
  ]
}
```

### Fichier: `Backend/data/sessions.json`
```json
{
  "sessions": [
    {
      "id": "session_xyz",
      "user_id": "user_abc123",
      "user_type": "client",
      "token": "eyJhbGc...",
      "created_at": "2025-11-13T...",
      "last_activity": "2025-11-13T..."
    }
  ]
}
```

---

## ✅ Checklist de Test

- [ ] **Client - Email connexion**: Entrer email → Connexion réussie
- [ ] **Client - Inscription**: Créer compte → Auto-login
- [ ] **Gérant - Code connexion**: `GER-2024-A001` → Dashboard manager
- [ ] **Token stockage**: Vérifier localStorage contient `auth_token` et `user_data`
- [ ] **Redirection**: Client → ClientLayout, Gérant → ManagerLayout
- [ ] **Déconnexion**: Bouton logout → Retour login + token supprimé
- [ ] **CORS**: Pas d'erreurs CORS dans la console navigateur
- [ ] **Données JSON**: Nouveaux utilisateurs/sessions dans les fichiers
- [ ] **Erreurs gestion**: Code invalide → Message d'erreur clair
- [ ] **Loading states**: Spinners pendant les requêtes

---

## 🐛 Débuggage

### Console Navigateur (F12)
- Vérifier les requêtes réseau (onglet Network)
- Vérifier les erreurs JavaScript (onglet Console)
- Vérifier le localStorage (onglet Application → Local Storage)

### Terminal Backend
- Voir les requêtes reçues en temps réel
- Erreurs Python affichées avec traceback

### Logs à surveiller
```python
# Backend logs les requêtes:
127.0.0.1 - - [13/Nov/2025 14:30:00] "POST /api/auth/login/client HTTP/1.1" 200 -
```

---

## 📊 Résultats Attendus

### ✅ Succès
- Backend répond en < 100ms
- Frontend affiche les bons layouts selon le rôle
- Tokens JWT valides et décodables
- Données persistées dans les fichiers JSON
- Pas d'erreurs CORS
- Interface fluide et responsive

### ❌ Problèmes Potentiels
- **CORS Error**: Vérifier FRONTEND_URL dans .env
- **Token Error**: Vérifier JWT_SECRET_KEY identique entre requêtes
- **404 Error**: Vérifier que le backend tourne bien sur port 5000
- **Connection Refused**: Vérifier que les deux serveurs sont démarrés

---

## 🎯 Prochaines Étapes

Une fois tous les tests passés:
1. Créer les interfaces spécifiques pour chaque type d'employé
2. Ajouter les endpoints de gestion (menu, commandes, etc.)
3. Implémenter les permissions par rôle
4. Ajouter refresh token automatique
5. Créer un panneau d'administration pour les gérants
