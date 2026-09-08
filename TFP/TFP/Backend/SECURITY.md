# Documentation Sécurité - Système d'Authentification TasteFoods

## 🔐 Vue d'ensemble

Le système d'authentification a été renforcé avec un chiffrement bcrypt pour les mots de passe et des règles de sécurité strictes.

---

## 📋 Exigences de Mot de Passe

### Règles de Complexité

Tous les mots de passe doivent respecter les critères suivants :

✅ **Minimum 8 caractères**
✅ **Au moins 1 majuscule** (A-Z)
✅ **Au moins 1 minuscule** (a-z)
✅ **Au moins 1 chiffre** (0-9)
✅ **Au moins 1 caractère spécial** (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Exemples Valides
- `SecurePass@123`
- `MyP@ssw0rd2024`
- `Admin@2024` ✅ (Mot de passe par défaut du gérant)

### Exemples Invalides
- `password` ❌ (pas de majuscule, chiffre, caractère spécial)
- `Pass123` ❌ (pas de caractère spécial, trop court)
- `PASSWORD@` ❌ (pas de minuscule, pas de chiffre)

---

## 🔒 Algorithme de Chiffrement

### Bcrypt avec Salt

**Algorithme** : bcrypt
**Rounds** : 12 (bon équilibre sécurité/performance)
**Salt** : Unique et généré automatiquement pour chaque mot de passe

### Avantages de bcrypt
- ✅ Résistant aux attaques par force brute
- ✅ Ralentit intentionnellement le processus de hachage
- ✅ Salt unique empêche les rainbow tables
- ✅ Coût computationnel ajustable (rounds)

### Exemple de Hash
```
Mot de passe: Admin@2024
Hash: $2b$12$13Sx5U1hVC77LjrFz7.OyuMbi6A9We7AQK5XaBuWEWi0eFfoVofoa
```

**Format du hash** : `$2b$[rounds]$[salt][hash]`
- `$2b$` : Version de bcrypt
- `12` : Nombre de rounds (2^12 = 4096 itérations)
- Les 22 caractères suivants : Salt
- Le reste : Hash du mot de passe

---

## 🛡️ Authentification

### 1. Client (Utilisateur final)

**Endpoints** :
- `POST /api/auth/register/client` - Inscription
- `POST /api/auth/login/client` - Connexion

**Processus d'inscription** :
```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "password": "SecurePass@123"
}
```

**Validations** :
1. Vérification de la force du mot de passe
2. Vérification que l'email n'existe pas déjà
3. Hachage bcrypt du mot de passe
4. Stockage du hash (jamais le mot de passe en clair)
5. Génération du token JWT
6. Retour du token et des données utilisateur

**Processus de connexion** :
```json
{
  "email": "jean@example.com",
  "password": "SecurePass@123"
}
```

**Validations** :
1. Recherche de l'utilisateur par email
2. Vérification du mot de passe avec bcrypt.checkpw()
3. Génération du token JWT (24h d'expiration)
4. Création de la session
5. Retour du token

---

### 2. Employé

**Endpoints** :
- `POST /api/auth/register/employee` - Création par gérant
- `POST /api/auth/login/employee` - Connexion

**Processus de création** (par gérant uniquement) :
```json
{
  "name": "Marie Cuisine",
  "email": "marie@restaurant.com",
  "phone": "+33612345678",
  "type": "cuisinier",
  "password": "StrongPass@2024"
}
```

**Validations** :
1. Vérification du token JWT du gérant
2. Validation du type d'employé
3. Vérification de la force du mot de passe
4. Génération automatique du code unique
5. Hachage bcrypt du mot de passe
6. Stockage sécurisé

**Processus de connexion** :
```json
{
  "code": "GER-2024-A001",
  "password": "Admin@2024"
}
```

**Validations** :
1. Validation du format du code
2. Recherche de l'employé par code
3. Vérification du mot de passe avec bcrypt
4. Vérification que le compte est actif
5. Génération du token JWT (12h d'expiration)
6. Retour du token avec permissions

---

## 🔑 Compte Admin par Défaut

### Identifiants Gérant

**Code** : `GER-2024-A001`
**Mot de passe** : `Admin@2024`
**Email** : `admin@restaurant.com`
**Type** : `gerant` (accès complet)

⚠️ **IMPORTANT** : Changer ce mot de passe en production !

---

## 🎯 Sécurité des Tokens JWT

### Configuration

**Algorithme** : HS256 (HMAC with SHA-256)
**Expiration** :
- Clients : 24 heures
- Employés : 12 heures

**Claims inclus** :
```json
{
  "user_id": "emp_001",
  "email": "admin@restaurant.com",
  "user_type": "employee",
  "role": "gerant",
  "exp": 1699999999,  // Timestamp d'expiration
  "iat": 1699956799,  // Timestamp de création
  "jti": "unique_id"  // JWT ID unique
}
```

### Stockage Frontend

**LocalStorage** :
- `auth_token` : Le token JWT
- `user_data` : Données utilisateur (sans mot de passe)

**Transmission** :
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚨 Protection contre les Attaques

### 1. Attaques par Force Brute

**Protections** :
- ✅ Bcrypt ralentit intentionnellement le hachage (12 rounds)
- ✅ Chaque tentative prend ~100-200ms
- ✅ Messages d'erreur génériques ("Email ou mot de passe incorrect")

**Recommandations futures** :
- [ ] Limitation du nombre de tentatives (rate limiting)
- [ ] Blocage temporaire après 5 tentatives échouées
- [ ] CAPTCHA après 3 tentatives

### 2. Injection SQL

**Protection** :
- ✅ Base de données JSON (pas de SQL)
- ✅ Validation stricte des entrées
- ✅ Pas d'exécution de code dynamique

### 3. Attaques XSS (Cross-Site Scripting)

**Protections** :
- ✅ React échappe automatiquement les données
- ✅ Pas d'utilisation de `dangerouslySetInnerHTML`
- ✅ Headers de sécurité HTTP

### 4. Attaques CSRF (Cross-Site Request Forgery)

**Protections** :
- ✅ Token JWT dans Authorization header (pas de cookies)
- ✅ CORS configuré avec origines spécifiques
- ✅ Validation de l'origine des requêtes

### 5. Man-in-the-Middle

**Protections actuelles** :
- ⚠️ HTTP en développement (localhost)

**Recommandations production** :
- [ ] **HTTPS obligatoire** avec certificat SSL/TLS
- [ ] Headers Strict-Transport-Security (HSTS)
- [ ] Certificate pinning pour l'app mobile

---

## 📊 Structure des Données

### users.json (Clients)
```json
{
  "users": [
    {
      "id": "user_abc123",
      "email": "client@example.com",
      "name": "Jean Dupont",
      "password_hash": "$2b$12$...",
      "user_type": "client",
      "loyalty_points": 0,
      "orders_count": 0,
      "created_at": "2024-11-13T10:30:00Z"
    }
  ]
}
```

**⚠️ Jamais stocké** :
- ❌ Mot de passe en clair
- ❌ Token JWT (seulement dans sessions.json temporairement)

### employees.json (Employés)
```json
{
  "employees": [
    {
      "id": "emp_001",
      "name": "Admin Principal",
      "email": "admin@restaurant.com",
      "code": "GER-2024-A001",
      "password_hash": "$2b$12$...",
      "type": "gerant",
      "phone": "+221 77 123 45 67",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "system"
    }
  ]
}
```

---

## 🧪 Tests de Sécurité

### 1. Test Mot de Passe Faible
```bash
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "weak"
  }'

# Résultat attendu: 400 Bad Request
# "Le mot de passe doit contenir au moins 8 caractères"
```

### 2. Test Mot de Passe Fort
```bash
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecureP@ss123"
  }'

# Résultat attendu: 201 Created avec token JWT
```

### 3. Test Connexion avec Mauvais Mot de Passe
```bash
curl -X POST http://localhost:5000/api/auth/login/client \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'

# Résultat attendu: 401 Unauthorized
# "Email ou mot de passe incorrect"
```

### 4. Test Connexion Gérant
```bash
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GER-2024-A001",
    "password": "Admin@2024"
  }'

# Résultat attendu: 200 OK avec token et permissions
```

---

## 📝 Checklist de Sécurité

### Backend
- [x] Bcrypt pour le hachage des mots de passe
- [x] Validation de la force des mots de passe
- [x] JWT avec expiration
- [x] Messages d'erreur génériques
- [x] CORS configuré
- [x] Pas de logs de mots de passe
- [ ] Rate limiting (TODO)
- [ ] Audit logs (TODO)
- [ ] HTTPS en production (TODO)

### Frontend
- [x] Mots de passe masqués (type="password")
- [x] Validation côté client
- [x] Confirmation de mot de passe à l'inscription
- [x] Token stocké en localStorage
- [x] Déconnexion supprime le token
- [ ] Indicateur de force du mot de passe (TODO)
- [ ] Auto-déconnexion après inactivité (TODO)

### Base de Données
- [x] Mots de passe hachés uniquement
- [x] Pas de données sensibles en clair
- [x] Fichiers JSON avec permissions appropriées
- [ ] Backup chiffré (TODO)
- [ ] Rotation des secrets JWT (TODO)

---

## 🔧 Configuration Production

### Variables d'Environnement Critiques

```bash
# Backend/.env
SECRET_KEY=génerer_une_clé_aléatoire_complexe_32_caractères_minimum
JWT_SECRET_KEY=génerer_une_autre_clé_différente_complexe
FLASK_ENV=production  # Pas "development" !
HTTPS_ONLY=true
SECURE_COOKIES=true
```

### Génération de Clés Sécurisées

```python
import secrets
print(secrets.token_urlsafe(32))
# Utiliser le résultat pour SECRET_KEY et JWT_SECRET_KEY
```

---

## 📞 Contacts Sécurité

En cas de découverte de vulnérabilité :
1. **NE PAS** divulguer publiquement
2. Contacter : security@tastefoods.com
3. Inclure : description détaillée, steps to reproduce, impact

---

## 📚 Références

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Bcrypt Documentation](https://github.com/pyca/bcrypt/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
