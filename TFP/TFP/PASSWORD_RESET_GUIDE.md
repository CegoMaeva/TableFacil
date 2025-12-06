# Guide de Réinitialisation de Mot de Passe

## ✅ Système Complètement Configuré

Le système de réinitialisation de mot de passe par email pour les employés est maintenant **entièrement fonctionnel**.

---

## 🎯 Fonctionnalités

### Pour les Employés

1. **Demande de réinitialisation**
   - Accès via le lien "Mot de passe oublié ?" sur la page de connexion
   - Saisie de l'email et optionnellement du code employé
   - Réception d'un email avec un lien de réinitialisation

2. **Réinitialisation sécurisée**
   - Lien valide pendant 1 heure
   - Création d'un nouveau mot de passe sécurisé
   - Validation en temps réel des critères de sécurité
   - Confirmation visuelle de chaque critère

3. **Sécurité renforcée**
   - Token unique et temporaire
   - Critères de mot de passe stricts :
     - Minimum 8 caractères
     - 1 majuscule
     - 1 minuscule
     - 1 chiffre
     - 1 caractère spécial (@$!%*?&)

---

## 🔧 Architecture Technique

### Backend (Flask)

**Fichier:** `Backend/app/routes/password_reset.py`

**Endpoints:**
- `POST /api/password/request-reset` - Demande de réinitialisation
- `POST /api/password/verify-token` - Vérification du token
- `POST /api/password/reset-password` - Réinitialisation du mot de passe

**Sécurité:**
- Tokens JWT avec expiration (1 heure)
- Hachage bcrypt des mots de passe
- Validation de la force du mot de passe
- Protection contre les attaques par force brute

### Frontend (React + TypeScript)

**Pages:**
- `/forgot-password` - Demande de réinitialisation
- `/reset-password?token=xxx` - Création du nouveau mot de passe

**Composants:**
- `ForgotPassword` - Formulaire de demande
- `ResetPassword` - Formulaire de nouveau mot de passe

---

## 📧 Configuration Email

**Fichier:** `Backend/app/utils/email_utils.py`

### Variables d'environnement requises

Créez un fichier `.env` dans le dossier `Backend/` :

```env
# Configuration Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre.email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_app
EMAIL_FROM=noreply@restaurant.com

# URL Frontend
FRONTEND_URL=http://localhost:5173
```

### Configuration Gmail (recommandé)

1. **Activer l'authentification à 2 facteurs** sur votre compte Gmail
2. **Créer un mot de passe d'application** :
   - Allez sur https://myaccount.google.com/security
   - Sélectionnez "Mots de passe des applications"
   - Générez un nouveau mot de passe pour "Mail"
   - Utilisez ce mot de passe dans `SMTP_PASSWORD`

3. **Configuration recommandée** :
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=votre.email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application (16 caractères)
   EMAIL_FROM=votre.email@gmail.com
   ```

---

## 🚀 Utilisation

### Pour un Employé

1. **Oublier son mot de passe**
   - Aller sur la page de connexion
   - Cliquer sur "Mot de passe oublié ?"

2. **Demander la réinitialisation**
   - Entrer son email professionnel
   - (Optionnel) Entrer son code employé pour plus de sécurité
   - Cliquer sur "Envoyer le lien de réinitialisation"

3. **Consulter ses emails**
   - Ouvrir l'email reçu
   - Cliquer sur le lien de réinitialisation
   - Le lien est valide pendant 1 heure

4. **Créer un nouveau mot de passe**
   - Entrer le nouveau mot de passe
   - Vérifier que tous les critères sont validés (✓ vert)
   - Confirmer le mot de passe
   - Cliquer sur "Réinitialiser le mot de passe"

5. **Se reconnecter**
   - Redirection automatique vers la page de connexion
   - Se connecter avec le nouveau mot de passe

### Pour un Gérant

Les gérants peuvent également :
- Créer des employés avec des mots de passe générés automatiquement
- Les employés reçoivent leurs identifiants par email
- Ils peuvent ensuite changer leur mot de passe via le processus de réinitialisation

---

## 🧪 Tests

### Test Backend

```bash
# Démarrer le serveur
cd Backend
python run.py

# Tester la demande de réinitialisation
curl -X POST http://localhost:5000/api/password/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "employe@restaurant.com", "code": "CUI-2024-C001"}'

# Vérifier un token
curl -X POST http://localhost:5000/api/password/verify-token \
  -H "Content-Type: application/json" \
  -d '{"token": "votre_token_jwt"}'

# Réinitialiser le mot de passe
curl -X POST http://localhost:5000/api/password/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "votre_token_jwt", "new_password": "NewPass@123"}'
```

### Test Frontend

1. Démarrer le frontend : `cd FontEnd && npm run dev`
2. Naviguer vers : http://localhost:5173
3. Cliquer sur connexion "Employé"
4. Cliquer sur "Mot de passe oublié ?"
5. Tester le flux complet

---

## 📊 Flux de Données

```
┌──────────────┐
│   Employé    │
└──────┬───────┘
       │ 1. Demande réinitialisation
       ▼
┌──────────────────────┐
│  /forgot-password    │
│  - Email             │
│  - Code (optionnel)  │
└──────┬───────────────┘
       │ 2. POST /api/password/request-reset
       ▼
┌──────────────────────┐
│  Backend Flask       │
│  - Génère token JWT  │
│  - Envoie email      │
└──────┬───────────────┘
       │ 3. Email avec lien
       ▼
┌──────────────────────┐
│  Email de l'employé  │
│  Lien: /reset-       │
│  password?token=xxx  │
└──────┬───────────────┘
       │ 4. Clic sur le lien
       ▼
┌──────────────────────┐
│  /reset-password     │
│  - Nouveau password  │
│  - Confirmation      │
└──────┬───────────────┘
       │ 5. POST /api/password/reset-password
       ▼
┌──────────────────────┐
│  Backend Flask       │
│  - Vérifie token     │
│  - Change password   │
│  - Envoie confirmat. │
└──────┬───────────────┘
       │ 6. Redirection
       ▼
┌──────────────────────┐
│  Page de connexion   │
│  Connexion avec      │
│  nouveau password    │
└──────────────────────┘
```

---

## 🔒 Sécurité

### Mesures Implémentées

1. **Tokens JWT**
   - Expiration après 1 heure
   - Signature avec SECRET_KEY
   - Token unique par demande

2. **Validation du Mot de Passe**
   - Minimum 8 caractères
   - Complexité requise (maj, min, chiffre, spécial)
   - Hachage bcrypt avant stockage

3. **Protection des Données**
   - Pas de divulgation d'informations (même réponse si email invalide)
   - Logs sécurisés
   - HTTPS recommandé en production

4. **Limitation**
   - Token à usage unique recommandé (à implémenter en production)
   - Délai entre demandes recommandé (à implémenter en production)

---

## 🐛 Dépannage

### L'email n'arrive pas

1. **Vérifier la configuration SMTP** dans `.env`
2. **Vérifier les logs** du serveur Flask
3. **Vérifier le dossier spam** de la boîte email
4. **Tester avec Gmail** (plus simple pour débuter)
5. **Vérifier les ports** : 587 (TLS) ou 465 (SSL)

### Le token est invalide

1. **Vérifier l'expiration** (1 heure max)
2. **Vérifier le SECRET_KEY** du backend
3. **Vérifier que le token est complet** dans l'URL

### Le mot de passe est refusé

1. **Vérifier tous les critères** :
   - ✓ Au moins 8 caractères
   - ✓ Une majuscule
   - ✓ Une minuscule
   - ✓ Un chiffre
   - ✓ Un caractère spécial

---

## 📝 Exemple d'Email Envoyé

```
Objet: Réinitialisation de votre mot de passe - TableFacil

Bonjour Jean Dupont,

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte employé.

Code employé: CUI-2024-C001
Email: jean.dupont@restaurant.com

Pour réinitialiser votre mot de passe, cliquez sur le lien ci-dessous :

http://localhost:5173/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
Votre mot de passe actuel reste inchangé.

Cordialement,
L'équipe TableFacil
```

---

## ✨ Améliorations Futures

### Court terme
- [ ] Limitation du nombre de tentatives par IP
- [ ] Token à usage unique (invalidation après utilisation)
- [ ] Historique des changements de mot de passe
- [ ] Notification par SMS en plus de l'email

### Long terme
- [ ] Authentification à deux facteurs (2FA)
- [ ] Biométrie (empreinte, reconnaissance faciale)
- [ ] Questions de sécurité personnalisées
- [ ] Intégration avec Active Directory / LDAP

---

## 📞 Support

Pour toute question ou problème :
- Consulter les logs du serveur Flask
- Vérifier la configuration des variables d'environnement
- Tester avec les identifiants de démo fournis

**Note importante** : Ne jamais partager les mots de passe ou tokens en clair par email ou message.
