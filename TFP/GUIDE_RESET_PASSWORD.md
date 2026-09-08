# 🔐 Guide - Réinitialisation de mot de passe par Email

## ✅ Système déjà implémenté !

Le système de réinitialisation de mot de passe par email est **complètement fonctionnel**. Voici comment l'utiliser :

---

## 🎯 Fonctionnement pour les employés

### 1️⃣ **Sur la page de connexion**
- L'employé clique sur **"Mot de passe oublié ?"** sous le formulaire de connexion employé
- Il est redirigé vers `/forgot-password`

### 2️⃣ **Page "Mot de passe oublié"**
- L'employé entre son **code employé** (ex: `CUI-2025-67BM`)
- Clique sur **"Envoyer le lien de réinitialisation"**
- Le système cherche l'employé dans la base de données
- Si trouvé, un email est envoyé à l'adresse email enregistrée

### 3️⃣ **Email reçu**
L'employé reçoit un email contenant :
- Un bouton **"Réinitialiser mon mot de passe"**
- Un lien alternatif au cas où le bouton ne fonctionne pas
- Validité : **1 heure**

### 4️⃣ **Page de réinitialisation**
- En cliquant sur le lien, l'employé arrive sur `/reset-password?token=xxxx`
- Il entre son **nouveau mot de passe** (2 fois pour confirmation)
- Le système valide la force du mot de passe
- Une fois validé, le mot de passe est changé
- Un email de confirmation est envoyé

### 5️⃣ **Connexion**
- L'employé peut maintenant se connecter avec son nouveau mot de passe

---

## 📁 Fichiers impliqués

### **Backend**

#### `password_reset.py` (Routes)
- **POST `/api/password/request-reset`** - Demande de réinitialisation
- **POST `/api/password/verify-token`** - Vérification du token
- **POST `/api/password/reset-password`** - Réinitialisation effective
- **POST `/api/password/change-password`** - Changement (employé connecté)

#### `email_utils.py` (Envoi d'emails)
- `send_password_reset_email()` - Envoie le lien de réinitialisation
- `send_password_changed_confirmation()` - Confirmation après changement

### **Frontend**

#### `ForgotPassword/index.tsx`
- Formulaire de demande de réinitialisation
- Entrée du code employé
- Affichage du message de succès

#### `ResetPassword/index.tsx`
- Formulaire de nouveau mot de passe
- Validation du token
- Confirmation visuelle

#### `LoginSection/index.tsx`
- Contient le lien "Mot de passe oublié ?"
- Visible uniquement pour les employés

#### `services/api.ts`
- `requestPasswordReset()` - Appel API pour demander la réinitialisation
- `verifyResetToken()` - Vérification du token
- `resetPassword()` - Réinitialisation du mot de passe

---

## ⚙️ Configuration Email

### Mode Développement (actuel)
Sans configuration SMTP, les emails sont **simulés** :
- Affichés dans la console du backend
- Permet de tester sans serveur email
- Le lien de réinitialisation est affiché dans les logs

### Mode Production

Pour activer l'envoi réel d'emails, configurer ces variables d'environnement :

```bash
# Dans .env ou variables système
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre.email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_app
SMTP_FROM_EMAIL=noreply@restaurant.com
SMTP_FROM_NAME=Restaurant Management
```

#### Exemple avec Gmail :
1. Activer la validation en 2 étapes sur votre compte Google
2. Générer un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `SMTP_PASSWORD`

---

## 🔒 Sécurité

### Token de réinitialisation
- **UUID aléatoire** (impossible à deviner)
- **Durée de vie : 1 heure**
- **Usage unique** (supprimé après utilisation)
- Stocké en mémoire (reset_tokens dict)

### Validation du mot de passe
Le nouveau mot de passe doit respecter :
- ✅ Minimum **8 caractères**
- ✅ Au moins **1 majuscule**
- ✅ Au moins **1 minuscule**
- ✅ Au moins **1 chiffre**
- ✅ Au moins **1 caractère spécial** (!@#$%^&*...)

### Vérifications
- ✅ Le code employé doit exister
- ✅ Le compte doit être actif (`is_active = true`)
- ✅ L'employé doit avoir un email enregistré
- ✅ Le token doit être valide et non expiré

---

## 📧 Templates d'email

### Email de réinitialisation
```
Sujet : Réinitialisation de votre mot de passe

Bonjour [Nom],

Vous avez demandé à réinitialiser votre mot de passe.

[Bouton : Réinitialiser mon mot de passe]

⚠️ Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
```

### Email de confirmation
```
Sujet : Votre mot de passe a été modifié

Bonjour [Nom],

✅ Votre mot de passe a été modifié avec succès.

⚠️ Si vous n'êtes pas à l'origine de ce changement, 
contactez immédiatement votre gestionnaire.
```

---

## 🧪 Test en mode développement

### 1. Démarrer le backend
```bash
cd Backend
python run.py
```

### 2. Démarrer le frontend
```bash
cd FontEnd
npm run dev
```

### 3. Tester le flux
1. Aller sur `http://localhost:5174`
2. Cliquer sur **"Employé"** puis **"Mot de passe oublié ?"**
3. Entrer un code employé existant (ex: `GER-2024-A001`)
4. Regarder la **console du backend** pour voir l'email simulé
5. Copier le lien affiché dans la console
6. Coller dans le navigateur
7. Entrer un nouveau mot de passe
8. Se connecter avec le nouveau mot de passe

---

## 🚀 Flux complet (Diagramme)

```
┌─────────────────┐
│ Page de login   │
│   Employé       │
└────────┬────────┘
         │ Clic "Mot de passe oublié ?"
         ▼
┌─────────────────────────┐
│ /forgot-password        │
│ - Entre code employé    │
│ - Clique "Envoyer"      │
└──────────┬──────────────┘
           │
           │ POST /api/password/request-reset
           ▼
┌─────────────────────────┐
│ Backend                 │
│ - Trouve employé        │
│ - Génère token UUID     │
│ - Envoie email          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Email envoyé            │
│ - Lien avec token       │
│ - Valide 1h             │
└──────────┬──────────────┘
           │
           │ Clic sur le lien
           ▼
┌─────────────────────────┐
│ /reset-password?token=  │
│ - Vérifie token         │
│ - Entre nouveau password│
│ - Confirme password     │
└──────────┬──────────────┘
           │
           │ POST /api/password/reset-password
           ▼
┌─────────────────────────┐
│ Backend                 │
│ - Valide token          │
│ - Valide password       │
│ - Hash nouveau password │
│ - Sauvegarde            │
│ - Supprime token        │
│ - Envoie confirmation   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Succès !                │
│ "Connectez-vous"        │
└─────────────────────────┘
```

---

## 🔧 Personnalisation

### Changer la durée du token
Dans `password_reset.py` ligne 53 :
```python
expiry = datetime.utcnow() + timedelta(hours=1)  # Modifier ici
```

### Changer l'URL du frontend
Dans `password_reset.py` ligne 16 :
```python
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
```

### Personnaliser les templates email
Modifier les templates HTML/texte dans `email_utils.py` :
- `send_password_reset_email()` - lignes 23-91
- `send_password_changed_confirmation()` - lignes 114-173

---

## ❓ FAQ

**Q : Que se passe-t-il si l'employé n'a pas d'email enregistré ?**  
R : Erreur retournée : "Aucun email enregistré pour cet employé"

**Q : Combien de fois peut-on utiliser un token ?**  
R : Une seule fois. Il est supprimé après utilisation.

**Q : Que se passe-t-il après 1 heure ?**  
R : Le token expire et est refusé. L'employé doit refaire une demande.

**Q : Peut-on avoir plusieurs tokens actifs ?**  
R : Oui, chaque demande génère un nouveau token. Tous restent valides pendant 1h.

**Q : L'email fonctionne sans configuration SMTP ?**  
R : En mode dev, l'email est affiché dans la console. En prod, configurez SMTP.

**Q : Comment tester avec un vrai email ?**  
R : Configurez les variables SMTP avec vos identifiants Gmail (voir section Configuration).

---

## ✅ Checklist de mise en production

- [ ] Configurer les variables SMTP dans `.env`
- [ ] Tester l'envoi d'email réel
- [ ] Vérifier que tous les employés ont un email valide
- [ ] Définir `FRONTEND_URL` sur l'URL de production
- [ ] Mettre en place un système de rate limiting (limitation des demandes)
- [ ] Utiliser Redis ou une BDD pour stocker les tokens (au lieu de la mémoire)
- [ ] Ajouter des logs de sécurité
- [ ] Mettre en place un monitoring des emails envoyés

---

## 🎉 Conclusion

Le système est **prêt à l'emploi** ! Les employés peuvent dès maintenant :
1. ✅ Demander une réinitialisation depuis la page de login
2. ✅ Recevoir un email avec un lien sécurisé
3. ✅ Créer un nouveau mot de passe
4. ✅ Se connecter immédiatement

En mode développement, les emails sont affichés dans la console backend.  
Pour la production, configurez simplement les variables SMTP.
