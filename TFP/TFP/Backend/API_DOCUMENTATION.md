# TasteFoods Backend API - Documentation

## 🚀 Démarrage

Le backend Flask tourne sur **http://localhost:5000**

### Installer les dépendances
```bash
cd Backend
pip install -r requirements.txt
```

### Démarrer le serveur
```bash
python run.py
```

---

## 📋 Endpoints disponibles

### 1. **POST** `/api/auth/login/client`
Connexion client avec email uniquement (pas de mot de passe)

**Body:**
```json
{
  "email": "client@example.com",
  "name": "Jean Dupont" // Optionnel
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "client@example.com",
    "name": "Jean Dupont",
    "role": "client",
    "user_type": "client",
    "loyalty_points": 0
  }
}
```

---

### 2. **POST** `/api/auth/login/employee`
Connexion employé avec code unique

**Body:**
```json
{
  "code": "GER-2024-A001"
}
```

**Codes par type d'employé:**
- Gérant: `GER-2024-A001` (format: LLNN)
- Cuisinier: `CUI-2024-12AB` (format: NNLL)
- Serveur: `SRV-2024-A1B2` (format: LNLN)
- Caissier: `CAI-2024-1234` (format: NNNN)
- Livreur: `LIV-2024-1A2B` (format: NLNL)
- Entretien: `ENT-2024-123` (format: NNN)
- Service Client: `CLI-2024-AB12` (format: LLNN)

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie en tant que Gérant",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "emp_abc123",
    "name": "Admin Principal",
    "email": "admin@tastefoods.com",
    "role": "gerant",
    "user_type": "employee",
    "type": "gerant",
    "code": "GER-2024-A001",
    "permissions": [
      "full_access",
      "manage_staff",
      "manage_menu",
      "view_analytics"
    ]
  }
}
```

---

### 3. **POST** `/api/auth/register/employee`
Créer un nouvel employé (réservé aux gérants)

**Headers:**
```
Authorization: Bearer <token_gerant>
```

**Body:**
```json
{
  "name": "Pierre Martin",
  "email": "pierre.martin@tastefoods.com",
  "phone": "+33612345678",
  "type": "cuisinier",
  "code": "CUI-2024-45GH" // Optionnel, généré automatiquement si non fourni
}
```

**Types valides:** `gerant`, `cuisinier`, `serveur`, `caissier`, `livreur`, `entretien`, `service_client`

**Response:**
```json
{
  "success": true,
  "message": "Employé créé avec succès",
  "employee": {
    "id": "emp_xyz789",
    "name": "Pierre Martin",
    "email": "pierre.martin@tastefoods.com",
    "type": "cuisinier",
    "code": "CUI-2024-45GH",
    "permissions": [
      "view_orders",
      "update_order_status",
      "manage_menu"
    ]
  }
}
```

---

### 4. **POST** `/api/auth/logout`
Déconnexion

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

### 5. **GET** `/api/auth/verify`
Vérifier la validité du token

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_abc123",
    "email": "client@example.com",
    "name": "Jean Dupont",
    "role": "client"
  }
}
```

---

### 6. **GET** `/api/auth/employee-types`
Liste des types d'employés disponibles

**Response:**
```json
{
  "types": {
    "gerant": {
      "name": "Gérant",
      "code_prefix": "GER",
      "code_format": "GER-YEAR-LLNN",
      "permissions": ["full_access", "manage_staff", "manage_menu", "view_analytics", "manage_inventory", "manage_settings"]
    },
    "cuisinier": {
      "name": "Cuisinier",
      "code_prefix": "CUI",
      "code_format": "CUI-YEAR-NNLL",
      "permissions": ["view_orders", "update_order_status", "manage_menu"]
    }
    // ... autres types
  }
}
```

---

### 7. **GET** `/api/auth/generate-code/<type>`
Générer un nouveau code pour un type d'employé (réservé aux gérants)

**Headers:**
```
Authorization: Bearer <token_gerant>
```

**Exemple:** `GET /api/auth/generate-code/cuisinier`

**Response:**
```json
{
  "success": true,
  "code": "CUI-2024-78MN",
  "type": "cuisinier",
  "info": {
    "name": "Cuisinier",
    "code_prefix": "CUI",
    "code_format": "CUI-YEAR-NNLL"
  }
}
```

---

## 🧪 Tests avec cURL

### Test connexion client
```bash
curl -X POST http://localhost:5000/api/auth/login/client \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

### Test connexion gérant (avec le compte admin par défaut)
```bash
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{"code": "GER-2024-A001"}'
```

### Test création d'un cuisinier
```bash
curl -X POST http://localhost:5000/api/auth/register/employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_GERANT>" \
  -d '{
    "name": "Chef Mario",
    "email": "mario@tastefoods.com",
    "phone": "+33612345678",
    "type": "cuisinier"
  }'
```

---

## 🔐 Permissions par type d'employé

| Type | Permissions |
|------|-------------|
| **Gérant** | Accès complet: gestion du personnel, menu, inventaire, analytics, paramètres |
| **Cuisinier** | Voir/modifier commandes, gérer le menu |
| **Serveur** | Voir/modifier commandes, gérer réservations |
| **Caissier** | Traiter paiements, voir commandes |
| **Livreur** | Voir commandes de livraison, mettre à jour statuts |
| **Entretien** | Voir planning, gérer tâches de nettoyage |
| **Service Client** | Gérer réservations, voir commandes clients |

---

## 📦 Structure de la base de données JSON

### `data/users.json` (Clients)
```json
{
  "users": [
    {
      "id": "user_abc123",
      "email": "client@example.com",
      "name": "Jean Dupont",
      "user_type": "client",
      "loyalty_points": 150,
      "orders_count": 12,
      "phone": "+33612345678",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### `data/employees.json` (Employés)
```json
{
  "employees": [
    {
      "id": "emp_abc123",
      "name": "Admin Principal",
      "email": "admin@tastefoods.com",
      "phone": "+33612345678",
      "type": "gerant",
      "code": "GER-2024-A001",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "system"
    }
  ]
}
```

### `data/sessions.json` (Sessions actives)
```json
{
  "sessions": [
    {
      "id": "session_xyz789",
      "user_id": "user_abc123",
      "user_type": "client",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "created_at": "2024-01-15T14:30:00Z",
      "last_activity": "2024-01-15T15:45:00Z"
    }
  ]
}
```

---

## 🔄 Intégration avec le Frontend React

Le frontend doit:

1. **Stocker le token JWT** dans `localStorage` ou `sessionStorage`
2. **Envoyer le token** dans les headers: `Authorization: Bearer <token>`
3. **Rediriger** selon le type d'utilisateur:
   - Client → `ClientLayout`
   - Employé → Interface selon son type (Dashboard gérant, etc.)
4. **Gérer l'expiration** des tokens (24h pour clients, 12h pour employés)

### Exemple fetch en React:
```javascript
const loginClient = async (email) => {
  const response = await fetch('http://localhost:5000/api/auth/login/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Rediriger vers ClientLayout
  }
};
```

---

## ⚠️ Notes importantes

- **Email client**: Pas de mot de passe requis, connexion directe avec l'email
- **Code employé**: Validation du format avant authentification
- **Token JWT**: Expire après 24h (clients) ou 12h (employés)
- **CORS**: Configuré pour accepter `http://localhost:5174`
- **Sécurité**: Les secrets sont dans `.env` (ne pas commiter)

---

## 🎯 Prochaines étapes

1. ✅ Backend Flask fonctionnel
2. 🔄 Tester tous les endpoints
3. 📱 Connecter le frontend React
4. 🎨 Créer une page de connexion unifiée avec switch Client/Employé
5. 🔐 Implémenter le stockage du token côté frontend
6. 🚀 Ajouter les routes protégées (menu, commandes, etc.)
