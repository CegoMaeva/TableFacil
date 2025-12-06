# 🔐 Guide de Migration - Ajout des Mots de Passe

## ✅ Ce qui a été modifié

### Backend
   
1. **Nouveau package** : `bcrypt==4.1.2`
   - Algorithme de hachage sécurisé
   - 12 rounds de salting

2. **Nouveau fichier** : `app/utils/password_utils.py`
   - `hash_password()` - Hache un mot de passe
   - `verify_password()` - Vérifie un mot de passe
   - `validate_password_strength()` - Validation des règles
   - `generate_secure_password()` - Génère un mot de passe fort

3. **Routes modifiées** : `app/routes/auth.py`
   - `POST /api/auth/login/client` - Exige maintenant `password`
   - `POST /api/auth/login/employee` - Exige maintenant `password`
   - `POST /api/auth/register/employee` - Exige `password` validé
   - `POST /api/auth/register/client` - **NOUVELLE ROUTE**

4. **Données modifiées** :
   - `employees.json` - Ajout du champ `password_hash` pour l'admin
   - Format: `$2b$12$...` (bcrypt hash)

### Frontend

1. **Service API** : `src/services/api.ts`
   - `loginClient(email, password)` - Ajout du paramètre password
   - `loginEmployee(code, password)` - Ajout du paramètre password

2. **Interface de connexion** : `src/sections/LoginSection/index.tsx`
   - Ajout de champs password pour client et employé
   - Ajout de confirmation de password à l'inscription
   - Validation côté client
   - Messages d'aide pour les exigences

---

## 📋 Règles de Mot de Passe

**Minimum 8 caractères** avec au moins :
- 1 majuscule (A-Z)
- 1 minuscule (a-z)
- 1 chiffre (0-9)
- 1 caractère spécial (!@#$%^&*...)

**Exemples valides** :
- `Admin@2024` ✅
- `SecurePass@123` ✅
- `MyP@ssw0rd2024` ✅

---

## 🔑 Identifiants de Test

### Gérant (Admin)
```
Code: GER-2024-A001
Mot de passe: Admin@2024
```

### Client (À créer via inscription)
```
Email: votreemail@example.com
Mot de passe: (doit respecter les règles)
```

---

## 🧪 Tests à Effectuer

### 1. Test Connexion Gérant
```bash
curl -X POST http://localhost:5000/api/auth/login/employee \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GER-2024-A001",
    "password": "Admin@2024"
  }'
```

**Résultat attendu** : Token JWT + données utilisateur

### 2. Test Inscription Client
```bash
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "password": "SecurePass@123"
  }'
```

**Résultat attendu** : Compte créé + token JWT

### 3. Test Connexion Client
```bash
curl -X POST http://localhost:5000/api/auth/login/client \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jean@example.com",
    "password": "SecurePass@123"
  }'
```

**Résultat attendu** : Token JWT + données utilisateur

### 4. Test Mot de Passe Invalide
```bash
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "faible"
  }'
```

**Résultat attendu** : Erreur 400 avec message explicite

---

## 🔄 Migration des Données Existantes

### Si vous avez des utilisateurs sans mot de passe

**Option 1 : Réinitialisation obligatoire**
```python
# Script à exécuter pour tous les utilisateurs existants
import bcrypt
import json

# Générer un mot de passe temporaire
temp_password = "TempPass@2024"
password_hash = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt(12))

# Mettre à jour users.json et employees.json
# Envoyer email de réinitialisation aux utilisateurs
```

**Option 2 : Demande de création à la prochaine connexion**
- Vérifier si `password_hash` existe
- Si non, rediriger vers page de création de mot de passe
- Valider et sauvegarder le nouveau mot de passe

---

## 📝 Checklist Post-Migration

### Backend
- [x] Bcrypt installé et configuré
- [x] Routes d'authentification mises à jour
- [x] Validation des mots de passe en place
- [x] Compte admin avec mot de passe haché
- [x] Messages d'erreur génériques (sécurité)

### Frontend
- [x] Champs password ajoutés
- [x] Validation côté client
- [x] Confirmation de mot de passe à l'inscription
- [x] Messages d'aide pour l'utilisateur
- [x] API service mis à jour

### Tests
- [ ] Connexion gérant avec nouveau mot de passe
- [ ] Inscription client avec validation
- [ ] Connexion client avec mot de passe
- [ ] Rejet des mots de passe faibles
- [ ] Création d'employé par gérant

---

## ⚠️ Points d'Attention

1. **Mot de passe admin par défaut**
   - Changer `Admin@2024` en production
   - Ne jamais commiter le vrai mot de passe

2. **Aucun rollback possible**
   - Les anciens systèmes sans mot de passe ne fonctionneront plus
   - Prévoir une migration douce en production

3. **Performance**
   - Bcrypt est intentionnellement lent (~100-200ms par hash)
   - Normal pour la sécurité

4. **HTTPS en production**
   - Les mots de passe transitent en clair sur HTTP
   - OBLIGATOIRE d'utiliser HTTPS en production

---

## 🚀 Déploiement Production

### 1. Variables d'environnement
```bash
SECRET_KEY=<générer_clé_complexe_32+_caractères>
JWT_SECRET_KEY=<générer_autre_clé_différente>
FLASK_ENV=production
```

### 2. Générer des clés sécurisées
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 3. Changer le mot de passe admin
```python
import bcrypt
new_password = "VotreMotDePasseTrèsSecurisé@2024!"
hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(12))
print(hash.decode('utf-8'))
# Copier dans employees.json
```

### 4. Activer HTTPS
- Obtenir certificat SSL/TLS (Let's Encrypt gratuit)
- Configurer Flask avec SSL
- Rediriger HTTP → HTTPS

---

## 📚 Documentation Complète

Voir `SECURITY.md` pour :
- Détails sur l'algorithme bcrypt
- Protection contre les attaques
- Tests de sécurité complets
- Checklist de sécurité production
- Références OWASP

---

## ✅ Résumé

**Avant** :
- Client : Email uniquement (pas sécurisé)
- Employé : Code uniquement (pas sécurisé)

**Après** :
- Client : Email + Mot de passe fort
- Employé : Code + Mot de passe fort
- Hachage bcrypt avec 12 rounds
- Validation stricte des mots de passe
- Messages d'erreur sécurisés

**Sécurité renforcée** : ✅✅✅
