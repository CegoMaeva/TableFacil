# 🔑 Identifiants de Test - TasteFoods

## Comptes Disponibles

### 👨‍💼 Gérant (Administrateur)

**Code Employé** : `GER-2024-A001`
**Mot de passe** : `Admin@2024`
**Email** : admin@restaurant.com
**Permissions** : Accès complet (gestion du personnel, menu, inventaire, analytics)

---

### 👤 Client Existant

**Email** : `maevachoupo@gmail.com`
**Mot de passe** : `SecurePass@123`
**Points fidélité** : 0
**Commandes** : 0

---

## 📝 Créer un Nouveau Compte

### Option 1 : Inscription Client via Interface

1. Ouvrir http://localhost:5173
2. Cliquer sur "Inscription"
3. Remplir :
   - Nom complet
   - Email
   - Mot de passe (min. 8 caractères avec majuscule, minuscule, chiffre, caractère spécial)
   - Confirmer le mot de passe
4. Cliquer "Créer mon compte"

### Option 2 : Inscription Client via API

```bash
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau Client",
    "email": "nouveau@example.com",
    "password": "MonMotDePasse@123",
    "phone": "+33612345678"
  }'
```

---

## 👥 Créer un Nouvel Employé

**Prérequis** : Être connecté en tant que gérant

### Via API

```bash
# 1. Se connecter en tant que gérant pour obtenir le token
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GER-2024-A001",
    "password": "Admin@2024"
  }'

# 2. Copier le token reçu et créer l'employé
curl -X POST http://localhost:5000/api/auth/register/employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "name": "Chef Mario",
    "email": "mario@restaurant.com",
    "phone": "+33612345678",
    "type": "cuisinier",
    "password": "Chef@2024Pass"
  }'
```

---

## 🔐 Règles de Mot de Passe

Tous les mots de passe doivent respecter :

- ✅ **Minimum 8 caractères**
- ✅ **Au moins 1 majuscule** (A-Z)
- ✅ **Au moins 1 minuscule** (a-z)
- ✅ **Au moins 1 chiffre** (0-9)
- ✅ **Au moins 1 caractère spécial** (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Exemples Valides

- `Admin@2024` ✅
- `SecurePass@123` ✅
- `MyP@ssw0rd2024` ✅
- `Chef@2024Pass` ✅

### Exemples Invalides

- `password` ❌ (pas de majuscule, chiffre, caractère spécial)
- `Password123` ❌ (pas de caractère spécial)
- `Pass@12` ❌ (moins de 8 caractères)

---

## 🧪 Tests de Connexion

### Test 1 : Connexion Gérant

**Interface Web** :
1. Aller sur http://localhost:5173
2. Sélectionner "Employé"
3. Code : `GER-2024-A001`
4. Mot de passe : `Admin@2024`
5. Cliquer "Se connecter"
6. ✅ Vous devriez accéder au Dashboard Manager

**API** :
```bash
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GER-2024-A001",
    "password": "Admin@2024"
  }'
```

---

### Test 2 : Connexion Client

**Interface Web** :
1. Aller sur http://localhost:5173
2. Sélectionner "Client"
3. Email : `maevachoupo@gmail.com`
4. Mot de passe : `SecurePass@123`
5. Cliquer "Se connecter"
6. ✅ Vous devriez accéder à l'Interface Client

**API** :
```bash
curl -X POST http://localhost:5000/api/auth/login/client \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maevachoupo@gmail.com",
    "password": "SecurePass@123"
  }'
```

---

## 🔄 Réinitialisation de Mot de Passe

### Changer le Mot de Passe d'un Utilisateur Existant

**Pour l'instant** : Modification manuelle dans le fichier JSON

1. Générer un nouveau hash bcrypt :

```python
import bcrypt

new_password = "NouveauMotDePasse@2024"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(new_password.encode('utf-8'), salt)
print(hashed.decode('utf-8'))
```

2. Copier le hash généré
3. Remplacer `password_hash` dans `users.json` ou `employees.json`

**À implémenter** : Route `/api/auth/reset-password` avec email de réinitialisation

---

## 📋 Structure des Fichiers JSON

### users.json (Clients)

```json
{
  "users": [
    {
      "id": "user_05846aa631ec",
      "email": "maevachoupo@gmail.com",
      "name": "maevachoupo",
      "password_hash": "$2b$12$...",
      "user_type": "client",
      "loyalty_points": 0,
      "orders_count": 0,
      "created_at": "2025-11-13T19:03:51.654058Z",
      "updated_at": "2025-11-13T19:03:51.654058Z"
    }
  ]
}
```

### employees.json (Employés)

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
      "created_at": "2024-01-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

---

## ⚠️ Notes Importantes

1. **Ne jamais commiter** les mots de passe réels en production
2. **Changer immédiatement** le mot de passe admin par défaut en production
3. Le `password_hash` est **irréversible** - impossible de récupérer le mot de passe original
4. Les tokens JWT expirent après :
   - **24 heures** pour les clients
   - **12 heures** pour les employés

---

## 🚀 Prochaines Fonctionnalités

- [ ] Réinitialisation de mot de passe par email
- [ ] Changement de mot de passe depuis le profil
- [ ] Double authentification (2FA)
- [ ] Historique des connexions
- [ ] Verrouillage après tentatives échouées
