# Guide de Gestion des Employés - TasteFoods

## 📋 Vue d'ensemble

Ce système permet au gérant de créer, modifier et gérer tous les employés du restaurant. Chaque employé reçoit un **code unique** généré automatiquement selon son type, et peut se connecter avec ce code pour accéder à son interface spécifique.

---

## 🎯 Types d'Employés et Codes

### Codes Générés Automatiquement

Le système génère automatiquement des codes uniques pour chaque type d'employé :

| Type | Préfixe | Format | Exemple |
|------|---------|--------|---------|
| **Gérant** | GER | GER-YYYY-A### | GER-2024-A001 |
| **Cuisinier** | CUI | CUI-YYYY-C### | CUI-2024-C001 |
| **Serveur** | SRV | SRV-YYYY-S### | SRV-2024-S001 |
| **Caissier** | CAI | CAI-YYYY-K### | CAI-2024-K001 |
| **Livreur** | LIV | LIV-YYYY-L### | LIV-2024-L001 |
| **Entretien** | ENT | ENT-YYYY-M### | ENT-2024-M001 |
| **Service Client** | CLI | CLI-YYYY-SC### | CLI-2024-SC001 |

**Format** : `PRÉFIXE-ANNÉE-LETTRE###`
- **PRÉFIXE** : Code du type d'employé
- **ANNÉE** : Année d'embauche (YYYY)
- **LETTRE** : Première lettre du type (unique)
- **###** : Numéro séquentiel sur 3 chiffres (001-999)

---

## 🔐 Processus de Création d'un Employé

### Par le Gérant

1. **Se connecter en tant que Gérant**
   - Code : `GER-2024-A001`
   - Mot de passe : `Admin@2024`

2. **Accéder à "Gestion du Personnel"**
   - Menu Manager → Staff Management

3. **Cliquer sur "Ajouter un employé"**

4. **Remplir le formulaire**

#### Informations Obligatoires

**Informations personnelles**
- Nom complet
- Email (unique)
- Téléphone
- Adresse

**Informations professionnelles**
- Type/Rôle (Cuisinier, Serveur, etc.)
- Date d'embauche
- Horaires de travail
- Salaire mensuel (FCFA)
- Statut (Actif / Vacation / Absent)

**Documents** (optionnels mais recommandés)
- CV (Curriculum Vitae)
- Casier judiciaire

5. **Mot de passe**
   - Vous pouvez fournir un mot de passe personnalisé
   - OU laisser vide pour génération automatique

6. **Validation**
   - Le système génère automatiquement le code unique
   - Un mot de passe fort est généré si non fourni
   - Les informations de connexion sont affichées **une seule fois**

### Exemple de Création

```json
{
  "name": "Marie Dubois",
  "email": "marie@restaurant.com",
  "phone": "+221 77 123 45 67",
  "type": "cuisinier",
  "address": "Dakar, Senegal",
  "schedule": "Lun-Ven 10h-18h",
  "salary": 250000,
  "dateHired": "2024-11-13"
}
```

**Résultat**
```
✅ Employé créé avec succès!

Code de connexion: CUI-2024-C001
Mot de passe: Secure@Pass123

⚠️ Notez bien ces informations, le mot de passe ne sera plus affiché.
```

---

## 🔑 Connexion des Employés

### Interface de Connexion

Les employés se connectent via le formulaire "Connexion Employé" :

**Champs requis**
- **Code** : Le code unique généré (ex: CUI-2024-C001)
- **Mot de passe** : Le mot de passe fourni lors de la création

### Redirection Automatique

Après connexion réussie, chaque type d'employé est redirigé vers son interface spécifique :

| Type | Route de Redirection | Interface |
|------|---------------------|-----------|
| Gérant | `/manager` | Tableau de bord complet + gestion |
| Cuisinier | `/kitchen` | Interface cuisine + commandes |
| Serveur | `/waiter` | Interface service + tables |
| Caissier | `/cashier` | Interface caisse + paiements |
| Livreur | `/delivery` | Interface livraison + courses |
| Entretien | `/maintenance` | Interface entretien + planning |
| Service Client | `/customer-service` | Interface SAV + support |

---

## 🛠️ API Endpoints

### Authentification Employé

**POST** `/api/auth/login/employee`

**Body**
```json
{
  "code": "CUI-2024-C001",
  "password": "Secure@Pass123"
}
```

**Réponse Succès (200)**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "emp_abc123",
    "name": "Marie Dubois",
    "email": "marie@restaurant.com",
    "code": "CUI-2024-C001",
    "type": "cuisinier",
    "role": "cuisinier",
    "user_type": "employee",
    "permissions": [
      "view_orders",
      "update_order_status",
      "manage_kitchen"
    ]
  }
}
```

---

### Gestion des Employés (Gérant uniquement)

#### Récupérer tous les employés

**GET** `/api/employees/`

**Headers**
```
Authorization: Bearer <token_gerant>
```

**Réponse**
```json
{
  "success": true,
  "employees": [
    {
      "id": "emp_001",
      "name": "Marie Dubois",
      "email": "marie@restaurant.com",
      "code": "CUI-2024-C001",
      "type": "cuisinier",
      "phone": "+221 77 123 45 67",
      "address": "Dakar, Senegal",
      "schedule": "Lun-Ven 10h-18h",
      "salary": 250000,
      "status": "active",
      "is_active": true,
      "dateHired": "2024-11-13",
      "created_at": "2024-11-13T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### Créer un nouvel employé

**POST** `/api/employees/`

**Headers**
```
Authorization: Bearer <token_gerant>
```

**Body**
```json
{
  "name": "Jean Martin",
  "email": "jean@restaurant.com",
  "phone": "+221 77 234 56 78",
  "type": "serveur",
  "address": "Dakar, Senegal",
  "schedule": "Mar-Sam 12h-22h",
  "salary": 180000,
  "dateHired": "2024-11-13",
  "password": "SecurePass@2024"
}
```

**Réponse (201)**
```json
{
  "success": true,
  "message": "Employé créé avec succès",
  "employee": {
    "id": "emp_xyz789",
    "name": "Jean Martin",
    "email": "jean@restaurant.com",
    "code": "SRV-2024-S001",
    "type": "serveur",
    "is_active": true,
    "generated_password": "AutoGen@Pass456"
  },
  "credentials": {
    "code": "SRV-2024-S001",
    "password": "SecurePass@2024",
    "login_url": "/login/employee"
  }
}
```

---

#### Mettre à jour un employé

**PUT** `/api/employees/{employee_id}`

**Body** (tous les champs optionnels)
```json
{
  "name": "Jean Martin Updated",
  "salary": 200000,
  "status": "vacation",
  "password": "NewPassword@2024"
}
```

**Réponse (200)**
```json
{
  "success": true,
  "message": "Employé mis à jour avec succès",
  "employee": { /* ... */ },
  "updated_fields": ["name", "salary", "status", "password"]
}
```

---

#### Supprimer (désactiver) un employé

**DELETE** `/api/employees/{employee_id}`

**Réponse (200)**
```json
{
  "success": true,
  "message": "Employé désactivé avec succès"
}
```

⚠️ **Note** : Les employés ne sont jamais supprimés définitivement, seulement désactivés (`is_active: false`)

---

#### Réactiver un employé

**POST** `/api/employees/{employee_id}/reactivate`

**Réponse (200)**
```json
{
  "success": true,
  "message": "Employé réactivé avec succès"
}
```

---

#### Statistiques

**GET** `/api/employees/stats`

**Réponse**
```json
{
  "success": true,
  "stats": {
    "total": 15,
    "active": 12,
    "inactive": 3,
    "on_vacation": 2,
    "absent": 1,
    "by_type": {
      "gerant": 1,
      "cuisinier": 3,
      "serveur": 4,
      "caissier": 2,
      "livreur": 3,
      "entretien": 1,
      "service_client": 1
    },
    "total_salary": 2850000
  }
}
```

---

#### Recherche

**GET** `/api/employees/search?q=marie&type=cuisinier&status=active`

**Paramètres**
- `q` : Recherche textuelle (nom, email, code)
- `type` : Filtrer par type d'employé
- `status` : Filtrer par statut (active, inactive, vacation, absent)

---

## 🔒 Permissions et Sécurité

### Niveaux d'Accès

**Gérant (gerant)**
- ✅ Créer, modifier, supprimer des employés
- ✅ Voir tous les employés et statistiques
- ✅ Accès complet à toutes les fonctionnalités
- ✅ Générer codes et mots de passe

**Autres Employés**
- ❌ Ne peuvent pas gérer d'autres employés
- ✅ Peuvent voir leur propre profil
- ✅ Peuvent modifier leur mot de passe
- ✅ Accès limité à leur interface métier

### Middleware de Vérification

```python
@require_manager_auth
def protected_route():
    # Uniquement accessible aux gérants
    pass
```

**Vérifications**
1. Token JWT valide
2. `user_type` = `"employee"`
3. `role` = `"gerant"`

### Erreurs d'Accès

```json
// Token manquant
{ "error": "Token manquant", "status": 401 }

// Non autorisé
{ "error": "Accès réservé aux gérants", "status": 403 }

// Token invalide
{ "error": "Token invalide", "status": 401 }
```

---

## 📱 Frontend - Interface Manager

### Composant StaffManagement

**Localisation** : `FontEnd/src/components/ManagerLayout/StaffManagement.tsx`

**Fonctionnalités**
- ✅ Liste de tous les employés avec filtres
- ✅ Recherche par nom/email
- ✅ Filtrage par type (Cuisinier, Serveur, etc.)
- ✅ Statistiques en temps réel
- ✅ Formulaire de création/modification
- ✅ Upload de documents (CV, Casier)
- ✅ Suppression (désactivation) d'employés
- ✅ Affichage des codes uniques

### Usage dans le Code

```typescript
import { 
  getAllEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee 
} from '../../services/api';

// Récupérer tous les employés
const employees = await getAllEmployees();

// Créer un employé
const result = await createEmployee({
  name: "Marie Dubois",
  email: "marie@restaurant.com",
  phone: "+221 77 123 45 67",
  type: "cuisinier",
  salary: 250000
});

// Le code et mot de passe sont dans result.credentials
console.log(result.credentials.code); // CUI-2024-C001
```

---

## 🧪 Tests

### Test 1 : Créer un Cuisinier

**Étapes**
1. Se connecter en tant que gérant (GER-2024-A001 / Admin@2024)
2. Aller dans Staff Management
3. Cliquer "Ajouter un employé"
4. Remplir avec type "Cuisinier"
5. Soumettre

**Résultat Attendu**
- Code généré : CUI-2024-C00X
- Mot de passe affiché une fois
- Employé apparaît dans la liste

---

### Test 2 : Connexion Cuisinier

**Étapes**
1. Se déconnecter
2. Aller sur page de login
3. Choisir "Connexion Employé"
4. Entrer le code et mot de passe du cuisinier
5. Valider

**Résultat Attendu**
- Connexion réussie
- Redirection vers `/kitchen`
- Interface cuisine affichée

---

### Test 3 : Codes Uniques

**Créer plusieurs employés du même type**

```bash
curl -X POST http://localhost:5000/api/employees/ \
  -H "Authorization: Bearer <token_gerant>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Employé 1",
    "email": "emp1@restaurant.com",
    "phone": "77 111 11 11",
    "type": "serveur"
  }'

# Code généré : SRV-2024-S001

curl -X POST http://localhost:5000/api/employees/ \
  -H "Authorization: Bearer <token_gerant>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Employé 2",
    "email": "emp2@restaurant.com",
    "phone": "77 222 22 22",
    "type": "serveur"
  }'

# Code généré : SRV-2024-S002 (incrémenté)
```

---

## 📊 Schéma de Données

### Structure Employee (JSON)

```json
{
  "id": "emp_abc123",
  "name": "Marie Dubois",
  "email": "marie@restaurant.com",
  "phone": "+221 77 123 45 67",
  "type": "cuisinier",
  "code": "CUI-2024-C001",
  "password_hash": "$2b$12$...",
  "address": "Dakar, Senegal",
  "schedule": "Lun-Ven 10h-18h",
  "salary": 250000,
  "dateHired": "2024-11-13",
  "status": "active",
  "cvFile": "marie_cv.pdf",
  "casierFile": "marie_casier.pdf",
  "is_active": true,
  "created_at": "2024-11-13T10:00:00Z",
  "created_by": "emp_001",
  "updated_at": "2024-11-13T10:00:00Z"
}
```

### Fichier employees.json

```json
{
  "employees": [
    {
      "id": "emp_001",
      "name": "Admin Principal",
      "email": "admin@restaurant.com",
      "type": "gerant",
      "code": "GER-2024-A001",
      "password_hash": "$2b$12$...",
      "phone": "+221 77 123 45 67",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 🚀 Déploiement

### Prérequis Backend

```bash
cd Backend
pip install -r requirements.txt
python run.py
```

### Prérequis Frontend

```bash
cd FontEnd
npm install
npm run dev
```

### Variables d'Environnement

```env
# Backend/.env
SECRET_KEY=votre_secret_key_secure
JWT_SECRET_KEY=votre_jwt_secret_key_secure
FLASK_ENV=development
```

---

## 🔍 Dépannage

### Erreur : "Token manquant"
**Solution** : Vérifier que le token JWT est envoyé dans le header `Authorization: Bearer <token>`

### Erreur : "Accès réservé aux gérants"
**Solution** : Seuls les utilisateurs avec `role: gerant` peuvent créer des employés

### Erreur : "Cet email est déjà utilisé"
**Solution** : Chaque email doit être unique dans le système

### Erreur : "Code employé déjà utilisé"
**Solution** : Très rare, contactez le support (bug dans la génération)

### Problème : Mot de passe non affiché
**Solution** : Le mot de passe généré n'est affiché qu'une seule fois. Si perdu, le gérant doit réinitialiser via l'option "Modifier" → "Nouveau mot de passe"

---

## 📞 Support

Pour toute question ou problème :
- Email : support@tastefoods.com
- Documentation complète : `/docs`
- Guide de sécurité : `SECURITY.md`

---

## 📝 Changelog

### Version 1.0 (13 Nov 2024)
- ✅ Système de génération de codes uniques
- ✅ Création d'employés par gérant
- ✅ Connexion employés avec code + mot de passe
- ✅ Redirection automatique vers interfaces métier
- ✅ CRUD complet pour employés
- ✅ Statistiques et recherche
- ✅ Soft delete (désactivation)
- ✅ Interface frontend complète
