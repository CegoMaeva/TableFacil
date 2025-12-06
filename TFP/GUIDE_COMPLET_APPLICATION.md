# 📚 Guide Complet - Application TasteFoods Restaurant

**Date de création**: 18 Novembre 2025  
**Version**: 1.0  
**Stack**: React + TypeScript + Flask + JSON Database

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture de l'application](#architecture-de-lapplication)
3. [Identifiants de connexion](#identifiants-de-connexion)
4. [Structure des fichiers](#structure-des-fichiers)
5. [Fonctionnalités par rôle](#fonctionnalités-par-rôle)
6. [Endpoints API](#endpoints-api)
7. [Base de données](#base-de-données)
8. [Sécurité](#sécurité)
9. [Démarrage de l'application](#démarrage-de-lapplication)
10. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que TasteFoods?

TasteFoods est une application web complète de gestion de restaurant avec trois types d'utilisateurs:

- **👥 Clients**: Commander, réserver, consulter le menu, programme fidélité
- **👨‍💼 Gérant/Admin**: Gestion complète du restaurant
- **👨‍🍳 Employés**: Accès limité selon leur rôle (cuisinier, serveur, etc.)

### Technologies utilisées

**Frontend**:
- React 18.2.0 avec TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Router v7 (navigation)
- Recharts (graphiques)
- Sonner (notifications toast)

**Backend**:
- Flask 3.0.0 (Python)
- Flask-CORS (cross-origin)
- JWT (authentification)
- Bcrypt (chiffrement mots de passe)

**Base de données**:
- Fichiers JSON (développement)
- Structure simple et lisible

---

## 🏗️ Architecture de l'application

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                    http://localhost:5174                    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Client     │  │   Gérant     │  │   Employé    │    │
│  │   Layout     │  │   Layout     │  │   Layout     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│           │                │                 │             │
│           └────────────────┴─────────────────┘             │
│                          │                                  │
│                    ┌─────▼─────┐                           │
│                    │  API.ts   │                           │
│                    │  Service  │                           │
│                    └─────┬─────┘                           │
└──────────────────────────┼─────────────────────────────────┘
                           │
                      HTTP/JSON
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                         BACKEND                            │
│                    http://localhost:5000                   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Flask Application                     │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │   Auth   │  │  Orders  │  │ Recipes  │       │  │
│  │  │  Routes  │  │  Routes  │  │  Routes  │  ...  │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │                                                    │  │
│  │              JWT + Bcrypt Security                │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│                    ┌─────▼─────┐                         │
│                    │  JSON DB  │                         │
│                    │   Files   │                         │
│                    └───────────┘                         │
└────────────────────────────────────────────────────────────┘
```

---

## 🔑 Identifiants de connexion

### 1. GÉRANT / ADMINISTRATEUR

**Page de connexion**: Employé  
**Code**: `GER-2024-A001`  
**Mot de passe**: `Admin@2024`  
**Email**: admin@restaurant.com  
**Accès**: Complet (tous les modules)

**Fichier**: `Backend/data/employees.json`

---

### 2. CLIENTS DE TEST

#### Client 1 - Jean Dupont
**Page de connexion**: Client  
**Email**: `jean.dupont@example.com`  
**Mot de passe**: `Client@123`  
**Points fidélité**: 150  
**Commandes**: 5

#### Client 2 - Marie Martin
**Email**: `marie.martin@example.com`  
**Mot de passe**: `Client@123`  
**Points fidélité**: 320  
**Commandes**: 12

#### Client 3 - Pierre Dubois
**Email**: `pierre.dubois@example.com`  
**Mot de passe**: `Client@123`  
**Points fidélité**: 75  
**Commandes**: 3

**Fichier**: `Backend/data/users.json`

---

### 3. CRÉATION DE NOUVEAUX COMPTES

#### Pour créer un CLIENT:
1. Cliquez sur "S'inscrire" sur la page de connexion client
2. Remplissez le formulaire
3. Mot de passe requis: minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial

#### Pour créer un EMPLOYÉ:
1. Connectez-vous en tant que gérant
2. Allez dans "Gestion du Personnel"
3. Cliquez sur "Ajouter un employé"
4. Remplissez les informations
5. Le code est généré automatiquement (format: `TYPE-2024-XXXX`)

---

## 📁 Structure des fichiers

### Frontend (FontEnd/)

```
FontEnd/
├── src/
│   ├── components/
│   │   ├── ClientLayout/
│   │   │   └── index.tsx              # 🏠 Interface client principale
│   │   ├── ManagerLayout/
│   │   │   ├── index.tsx              # 📊 Dashboard gérant
│   │   │   ├── Analytics.tsx          # 📈 Statistiques et graphiques
│   │   │   ├── OrdersManagement.tsx   # 📦 Gestion des commandes
│   │   │   ├── ReservationsManagement.tsx  # 📅 Gestion des réservations
│   │   │   ├── MenuManagement.tsx     # 🍽️ Gestion du menu
│   │   │   ├── RecipeManagement.tsx   # 📝 Gestion des recettes
│   │   │   ├── InventoryManagement.tsx # 📦 Gestion des stocks
│   │   │   ├── StaffManagement.tsx    # 👥 Gestion du personnel
│   │   │   └── SystemSettings.tsx     # ⚙️ Paramètres système
│   │   ├── Navbar/
│   │   │   └── index.tsx              # 🧭 Navigation principale
│   │   └── Sidebar/
│   │       └── index.tsx              # 📑 Menu latéral gérant
│   ├── contexts/
│   │   ├── AuthContext.tsx            # 🔐 Gestion authentification globale
│   │   └── CartContext.tsx            # 🛒 Gestion panier (si activé)
│   ├── sections/
│   │   ├── LoginSection/
│   │   │   └── index.tsx              # 🔑 Page de connexion
│   │   ├── ForgotPassword/
│   │   │   └── index.tsx              # 🔄 Mot de passe oublié
│   │   ├── ResetPassword/
│   │   │   └── index.tsx              # 🔄 Réinitialisation mot de passe
│   │   ├── Header/
│   │   │   └── index.tsx              # 🎨 En-tête homepage
│   │   ├── HeroSection/
│   │   │   └── index.tsx              # 🎯 Section héro homepage
│   │   ├── MenuSection/
│   │   │   └── index.tsx              # 🍽️ Section menu homepage
│   │   └── ReservationSection/
│   │       └── index.tsx              # 📅 Section réservation homepage
│   ├── services/
│   │   └── api.ts                     # 🔌 Service API centralisé
│   └── App.tsx                        # 🚀 Point d'entrée application
```

### Backend (Backend/)

```
Backend/
├── app/
│   ├── __init__.py                    # 🏗️ Initialisation Flask
│   ├── models/
│   │   └── database.py                # 💾 Fonctions base de données
│   ├── routes/
│   │   ├── __init__.py                # 📋 Enregistrement des routes
│   │   ├── auth.py                    # 🔐 Authentification (LOGIN/REGISTER)
│   │   ├── employees.py               # 👥 Gestion employés (CRUD)
│   │   ├── orders.py                  # 📦 Gestion commandes (CRUD + Status)
│   │   ├── reservations.py            # 📅 Gestion réservations (CRUD + Status)
│   │   ├── recipes.py                 # 🍽️ Gestion recettes (CRUD)
│   │   ├── inventory.py               # 📦 Gestion inventaire (CRUD)
│   │   ├── analytics.py               # 📈 Statistiques et analytics
│   │   ├── loyalty.py                 # 🎁 Programme fidélité
│   │   ├── reviews.py                 # ⭐ Avis clients
│   │   └── password_reset.py          # 🔄 Réinitialisation mot de passe
│   └── utils/
│       ├── jwt_utils.py               # 🔑 Génération/Vérification JWT
│       ├── password_utils.py          # 🔒 Validation/Hachage mots de passe
│       ├── email_utils.py             # 📧 Envoi d'emails
│       └── code_generator.py          # 🔢 Génération codes employés
├── data/                              # 💾 BASE DE DONNÉES JSON
│   ├── users.json                     # 👥 Comptes clients
│   ├── employees.json                 # 👨‍💼 Comptes employés
│   ├── orders.json                    # 📦 Commandes
│   ├── reservations.json              # 📅 Réservations
│   ├── recipes.json                   # 🍽️ Menu/Recettes
│   ├── inventory.json                 # 📦 Inventaire
│   ├── loyalty.json                   # 🎁 Programme fidélité
│   ├── reviews.json                   # ⭐ Avis clients
│   └── sessions.json                  # 🔐 Sessions actives
└── run.py                             # ▶️ Point d'entrée backend
```

---

## 🎭 Fonctionnalités par rôle

### 👥 CLIENT

**Interface**: `FontEnd/src/components/ClientLayout/index.tsx`

#### Pages accessibles:
1. **🏠 Accueil** (`currentPage === 'accueil'`)
   - Vue d'ensemble du restaurant
   - Promotions et actualités

2. **🍽️ Menu** (`currentPage === 'menu'`)
   - **Fichier backend**: `Backend/app/routes/recipes.py`
   - **Endpoint**: `GET /api/recipes?available=true`
   - Affichage des plats disponibles
   - Filtrage par section (entrées, plats, desserts, boissons)
   - Prix en FCFA
   - Allergènes et descriptions

3. **📅 Réservations** (`currentPage === 'reservations'`)
   - **Fichier backend**: `Backend/app/routes/reservations.py`
   - **Endpoint**: `GET /api/reservations` (filtré par client)
   - Créer une nouvelle réservation
   - Voir ses réservations (passées et à venir)
   - Annuler une réservation

4. **📦 Mes Commandes** (`currentPage === 'commandes'`)
   - **Fichier backend**: `Backend/app/routes/orders.py`
   - **Endpoint**: `GET /api/orders` (filtré par client)
   - Historique des commandes
   - Statut en temps réel (En préparation, Prête, Livrée)
   - Suivre une commande en cours

5. **🎁 Fidélité** (`currentPage === 'fidelite'`)
   - **Fichier backend**: `Backend/app/routes/loyalty.py`
   - Points de fidélité
   - Récompenses disponibles
   - Historique des transactions

6. **⭐ Avis** (`currentPage === 'avis'`)
   - **Fichier backend**: `Backend/app/routes/reviews.py`
   - Laisser un avis
   - Voir tous les avis

7. **👤 Profil** (`currentPage === 'profil'`)
   - Informations personnelles
   - Adresses de livraison
   - Changer mot de passe

---

### 👨‍💼 GÉRANT / ADMINISTRATEUR

**Interface**: `FontEnd/src/components/ManagerLayout/index.tsx`

#### Modules accessibles:

1. **📊 Dashboard** (`activeModule === 'dashboard'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/Analytics.tsx`
   - **Backend**: `Backend/app/routes/analytics.py`
   - Vue d'ensemble avec KPIs
   - Graphiques des ventes
   - Commandes récentes
   - Réservations du jour

2. **📦 Gestion des Commandes** (`activeModule === 'orders'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/OrdersManagement.tsx`
   - **Backend**: `Backend/app/routes/orders.py`
   - **Endpoints principaux**:
     - `GET /api/orders` - Liste toutes les commandes
     - `PATCH /api/orders/:id/status` - Changer le statut
     - `DELETE /api/orders/:id` - Annuler
   - Workflow: pending → preparing → ready → served/delivered
   - Filtres par statut
   - Recherche par client/ID

3. **📅 Gestion des Réservations** (`activeModule === 'reservations'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/ReservationsManagement.tsx`
   - **Backend**: `Backend/app/routes/reservations.py`
   - **Endpoints principaux**:
     - `GET /api/reservations` - Liste toutes les réservations
     - `PUT /api/reservations/:id` - Modifier
     - `PATCH /api/reservations/:id/status` - Confirmer/Annuler
     - `DELETE /api/reservations/:id` - Supprimer
   - Calendrier des réservations
   - Gestion des tables

4. **🍽️ Gestion du Menu** (`activeModule === 'menu'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/MenuManagement.tsx`
   - **Backend**: `Backend/app/routes/recipes.py`
   - **Endpoints**:
     - `GET /api/recipes` - Liste recettes
     - `POST /api/recipes` - Créer
     - `PUT /api/recipes/:id` - Modifier
     - `DELETE /api/recipes/:id` - Supprimer
   - Ajouter/Modifier/Supprimer des plats
   - Disponibilité (activer/désactiver)
   - Photos, prix, descriptions

5. **📝 Gestion des Recettes** (`activeModule === 'recipes'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/RecipeManagement.tsx`
   - **Backend**: `Backend/app/routes/recipes.py`
   - Ingrédients détaillés
   - Instructions de préparation
   - Temps de cuisson
   - Coûts

6. **📦 Gestion de l'Inventaire** (`activeModule === 'inventory'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/InventoryManagement.tsx`
   - **Backend**: `Backend/app/routes/inventory.py`
   - **Endpoints**:
     - `GET /api/inventory` - Liste stocks
     - `POST /api/inventory` - Ajouter
     - `PUT /api/inventory/:id` - Modifier
     - `DELETE /api/inventory/:id` - Supprimer
   - Suivi des stocks
   - Alertes stock bas
   - Historique des mouvements

7. **👥 Gestion du Personnel** (`activeModule === 'staff'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/StaffManagement.tsx`
   - **Backend**: `Backend/app/routes/employees.py`
   - **Endpoints**:
     - `GET /api/employees` - Liste employés
     - `POST /api/auth/register/employee` - Créer employé
     - `PUT /api/employees/:id` - Modifier
     - `DELETE /api/employees/:id` - Supprimer
   - Types: gérant, cuisinier, serveur, livreur, caissier, autre
   - Codes uniques auto-générés
   - Activation/Désactivation

8. **⚙️ Paramètres Système** (`activeModule === 'settings'`)
   - **Fichier**: `FontEnd/src/components/ManagerLayout/SystemSettings.tsx`
   - Configuration générale
   - Horaires d'ouverture
   - Informations restaurant

---

## 🔌 Endpoints API

### Base URL: `http://127.0.0.1:5000`

### 🔐 Authentification (`Backend/app/routes/auth.py`)

| Méthode | Endpoint | Description | Body | Réponse |
|---------|----------|-------------|------|---------|
| POST | `/api/auth/login/client` | Connexion client | `{email, password}` | `{token, user}` |
| POST | `/api/auth/login/employee` | Connexion employé | `{code, password}` | `{token, user}` |
| POST | `/api/auth/register/client` | Inscription client | `{name, email, password}` | `{token, user}` |
| POST | `/api/auth/register/employee` | Créer employé (gérant) | `{name, email, phone, type, password}` | `{employee}` |
| POST | `/api/auth/logout` | Déconnexion | - | `{message}` |
| GET | `/api/auth/verify` | Vérifier token | Header: `Authorization: Bearer token` | `{valid, user}` |
| GET | `/api/auth/employee-types` | Liste types employés | - | `{types: []}` |

### 📦 Commandes (`Backend/app/routes/orders.py`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/api/orders` | Liste commandes | JWT | Query: `?client_id=xxx` |
| POST | `/api/orders` | Créer commande | JWT | `{items, type, address, total, notes}` |
| GET | `/api/orders/:id` | Détails commande | JWT | - |
| PUT | `/api/orders/:id` | Modifier commande | JWT | `{items, type, address, ...}` |
| DELETE | `/api/orders/:id` | Annuler commande | JWT | - |
| PATCH | `/api/orders/:id/status` | Changer statut | JWT (gérant) | `{status}` |
| GET | `/api/orders/stats` | Statistiques | JWT (gérant) | - |

**Statuts possibles**: `pending`, `preparing`, `ready`, `served`, `delivered`, `cancelled`

### 📅 Réservations (`Backend/app/routes/reservations.py`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/api/reservations` | Liste réservations | JWT | Query: `?date=YYYY-MM-DD&status=xxx` |
| POST | `/api/reservations` | Créer réservation | JWT | `{date, time, guests, name, email, phone, notes}` |
| GET | `/api/reservations/:id` | Détails réservation | JWT | - |
| PUT | `/api/reservations/:id` | Modifier réservation | JWT | `{date, time, guests, ...}` |
| DELETE | `/api/reservations/:id` | Supprimer réservation | JWT | - |
| PATCH | `/api/reservations/:id/status` | Changer statut | JWT (gérant) | `{status}` |

**Statuts possibles**: `pending`, `confirmed`, `cancelled`, `completed`

### 🍽️ Recettes/Menu (`Backend/app/routes/recipes.py`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/api/recipes` | Liste recettes | Public | Query: `?available=true&section=xxx` |
| POST | `/api/recipes` | Créer recette | JWT (gérant) | `{name, category, price, description, ...}` |
| GET | `/api/recipes/:id` | Détails recette | Public | - |
| PUT | `/api/recipes/:id` | Modifier recette | JWT (gérant) | `{name, price, ...}` |
| DELETE | `/api/recipes/:id` | Supprimer recette | JWT (gérant) | - |

### 📦 Inventaire (`Backend/app/routes/inventory.py`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/api/inventory` | Liste articles | JWT (gérant) | Query: `?category=xxx&low_stock=true` |
| POST | `/api/inventory` | Ajouter article | JWT (gérant) | `{name, category, quantity, unit, min_quantity}` |
| GET | `/api/inventory/:id` | Détails article | JWT (gérant) | - |
| PUT | `/api/inventory/:id` | Modifier article | JWT (gérant) | `{quantity, min_quantity, ...}` |
| DELETE | `/api/inventory/:id` | Supprimer article | JWT (gérant) | - |

### 👥 Employés (`Backend/app/routes/employees.py`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/api/employees` | Liste employés | JWT (gérant) | - |
| GET | `/api/employees/:id` | Détails employé | JWT (gérant) | - |
| PUT | `/api/employees/:id` | Modifier employé | JWT (gérant) | `{name, email, phone, type}` |
| DELETE | `/api/employees/:id` | Supprimer employé | JWT (gérant) | - |
| PATCH | `/api/employees/:id/status` | Activer/Désactiver | JWT (gérant) | `{is_active}` |

### 📈 Analytics (`Backend/app/routes/analytics.py`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/analytics/dashboard` | Stats dashboard | JWT (gérant) |
| GET | `/api/analytics/sales` | Stats ventes | JWT (gérant) |
| GET | `/api/analytics/orders` | Stats commandes | JWT (gérant) |
| GET | `/api/analytics/revenue` | Revenus | JWT (gérant) |

### 🎁 Fidélité (`Backend/app/routes/loyalty.py`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/loyalty/:user_id` | Points client | JWT |
| POST | `/api/loyalty/earn` | Gagner points | JWT |
| POST | `/api/loyalty/redeem` | Utiliser points | JWT |

### ⭐ Avis (`Backend/app/routes/reviews.py`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/reviews` | Liste avis | Public |
| POST | `/api/reviews` | Créer avis | JWT |
| PUT | `/api/reviews/:id` | Modifier avis | JWT |
| DELETE | `/api/reviews/:id` | Supprimer avis | JWT |

---

## 💾 Base de données (Fichiers JSON)

### 📍 Localisation: `Backend/data/`

### 1. `users.json` - Comptes clients

```json
{
  "users": [
    {
      "id": "usr_unique_id",
      "email": "client@example.com",
      "name": "Jean Dupont",
      "password_hash": "$2b$12$...",
      "user_type": "client",
      "phone": "+221 XX XXX XX XX",
      "loyalty_points": 150,
      "orders_count": 5,
      "total_spent": 50000,
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2025-11-18T08:00:00Z"
    }
  ]
}
```

**Champs importants**:
- `password_hash`: Mot de passe chiffré avec bcrypt (jamais en clair)
- `loyalty_points`: Points de fidélité cumulés
- `orders_count`: Nombre de commandes passées

### 2. `employees.json` - Comptes employés

```json
{
  "employees": [
    {
      "id": "emp_001",
      "code": "GER-2024-A001",
      "name": "Admin Principal",
      "email": "admin@restaurant.com",
      "password_hash": "$2b$12$...",
      "type": "gerant",
      "phone": "+221 77 123 45 67",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "system",
      "last_login": "2025-11-18T09:00:00Z"
    }
  ]
}
```

**Types d'employés**: `gerant`, `cuisinier`, `serveur`, `livreur`, `caissier`, `autre`

### 3. `orders.json` - Commandes

```json
{
  "orders": [
    {
      "id": "ORD-20251118123456",
      "clientId": "usr_abc123",
      "clientName": "Jean Dupont",
      "items": [
        {
          "id": "rec_001",
          "name": "Thiéboudienne",
          "price": 3500,
          "quantity": 2,
          "category": "Plats"
        }
      ],
      "total": 7000,
      "type": "delivery",
      "address": "Dakar, Plateau",
      "phone": "+221 77 XXX XX XX",
      "notes": "Pas épicé",
      "status": "preparing",
      "paymentStatus": "pending",
      "paymentMethod": "cash",
      "createdAt": "2025-11-18T12:34:56Z",
      "updatedAt": "2025-11-18T12:40:00Z"
    }
  ]
}
```

**Status workflow**:
- `pending` → Nouvelle commande
- `preparing` → En préparation
- `ready` → Prête
- `served` → Servie (sur place)
- `delivered` → Livrée
- `cancelled` → Annulée

### 4. `reservations.json` - Réservations

```json
{
  "reservations": [
    {
      "id": "res_001",
      "clientId": "usr_abc123",
      "name": "Jean Dupont",
      "email": "jean@example.com",
      "phone": "+221 77 XXX XX XX",
      "date": "2025-11-25",
      "time": "19:30",
      "guests": 4,
      "table": "T12",
      "notes": "Anniversaire",
      "status": "confirmed",
      "createdAt": "2025-11-18T10:00:00Z",
      "confirmedAt": "2025-11-18T10:05:00Z"
    }
  ]
}
```

**Status**: `pending`, `confirmed`, `cancelled`, `completed`

### 5. `recipes.json` - Menu/Recettes

```json
{
  "recipes": [
    {
      "id": "rec_001",
      "name": "Thiéboudienne",
      "category": "Plats",
      "section": "plats",
      "price": "3500",
      "description": "Riz au poisson, légumes variés",
      "allergens": "Poisson",
      "image": "/images/thiebu.jpg",
      "available": true,
      "preparationTime": 30,
      "difficulty": "medium",
      "ingredients": [
        {"name": "Riz", "quantity": "500g"},
        {"name": "Poisson", "quantity": "300g"}
      ],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Sections**: `entrees`, `plats`, `desserts`, `boissons`

### 6. `inventory.json` - Inventaire

```json
{
  "inventory": [
    {
      "id": "inv_001",
      "name": "Riz",
      "category": "Céréales",
      "quantity": 50,
      "unit": "kg",
      "min_quantity": 20,
      "supplier": "Fournisseur A",
      "lastRestocked": "2025-11-15T00:00:00Z",
      "cost": 500
    }
  ]
}
```

### 7. `sessions.json` - Sessions actives (JWT)

```json
{
  "sessions": [
    {
      "token": "eyJhbGc...",
      "user_id": "usr_abc123",
      "user_type": "client",
      "created_at": "2025-11-18T10:00:00Z",
      "expires_at": "2025-11-19T10:00:00Z"
    }
  ]
}
```

### 8. `loyalty.json` - Programme fidélité

```json
{
  "transactions": [
    {
      "id": "loy_001",
      "user_id": "usr_abc123",
      "type": "earn",
      "points": 50,
      "description": "Commande #ORD-123",
      "date": "2025-11-18T12:00:00Z"
    }
  ]
}
```

### 9. `reviews.json` - Avis clients

```json
{
  "reviews": [
    {
      "id": "rev_001",
      "user_id": "usr_abc123",
      "user_name": "Jean Dupont",
      "rating": 5,
      "comment": "Excellent restaurant!",
      "date": "2025-11-18T14:00:00Z"
    }
  ]
}
```

---

## 🔒 Sécurité

### Fichier principal: `Backend/SECURITY.md`

### Authentification JWT

**Fichier**: `Backend/app/utils/jwt_utils.py`

**Fonctions**:
- `generate_token(payload, expiration_hours)` - Créer un token
- `verify_token(token)` - Vérifier et décoder un token

**Expiration**:
- Clients: 24 heures
- Employés: 12 heures

### Mots de passe

**Fichier**: `Backend/app/utils/password_utils.py`

**Algorithme**: Bcrypt avec 12 rounds

**Règles de validation**:
- Minimum 8 caractères
- 1 majuscule
- 1 minuscule
- 1 chiffre
- 1 caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Fonctions**:
- `validate_password(password)` - Vérifier la force
- `hash_password(password)` - Hacher avec bcrypt
- `check_password(password, hash)` - Vérifier un mot de passe

### Protection des endpoints

Tous les endpoints protégés vérifient le token JWT:

```python
from app.utils.jwt_utils import verify_token

@bp.route('/protected')
def protected_route():
    token = request.headers.get('Authorization').replace('Bearer ', '')
    payload = verify_token(token)
    
    if isinstance(payload, tuple):  # Erreur
        return payload
    
    # payload contient les données utilisateur
    user_id = payload.get('user_id')
```

### CORS

**Fichier**: `Backend/app/__init__.py`

```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174"],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## ▶️ Démarrage de l'application

### Prérequis

- **Python 3.12+** installé
- **Node.js 18+** installé
- **npm** ou **yarn**

### Installation

#### 1. Backend

```powershell
cd "Backend"

# Installer les dépendances
pip install -r requirements.txt

# Démarrer le serveur
python run.py
```

**Serveur démarre sur**: `http://127.0.0.1:5000`

#### 2. Frontend

```powershell
cd "FontEnd"

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

**Application disponible sur**: `http://localhost:5174`

### Vérification

1. Backend: Ouvrir `http://127.0.0.1:5000` (devrait afficher un message d'erreur JSON normal)
2. Frontend: Ouvrir `http://localhost:5174` (page de connexion)

---

## 🔧 Dépannage

### Problème: Port déjà utilisé

**Backend (5000)**:
```powershell
# Trouver le processus
netstat -ano | findstr :5000

# Tuer le processus (remplacer PID)
taskkill /PID <PID> /F
```

**Frontend (5174)**:
Vite changera automatiquement le port (5175, 5176, etc.)

### Problème: Module Python introuvable

```powershell
pip install -r requirements.txt --force-reinstall
```

### Problème: Erreur CORS

Vérifier que le frontend utilise le bon port dans `services/api.ts`:

```typescript
const API_BASE_URL = 'http://127.0.0.1:5000';
```

### Problème: JWT Token invalide

1. Vider le localStorage du navigateur (F12 → Application → Local Storage)
2. Se reconnecter

### Problème: Mot de passe oublié

**Pour un client**: Utiliser la fonction "Mot de passe oublié" (si email configuré)

**Pour le gérant**: Modifier directement `Backend/data/employees.json`:
1. Générer un nouveau hash:
```python
import bcrypt
password = "Admin@2024"
hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
print(hash.decode('utf-8'))
```
2. Remplacer le `password_hash` dans le fichier

### Problème: Base de données corrompue

Les fichiers JSON de backup sont dans `Backend/data/`:
- Copier le fichier problématique
- Restaurer depuis un backup
- Ou réinitialiser avec `[]` ou `{"users": []}` selon le format

---

## 📊 Fichiers de configuration importants

### `Backend/requirements.txt`
Liste des dépendances Python

### `FontEnd/package.json`
Liste des dépendances Node.js

### `FontEnd/vite.config.ts`
Configuration Vite (serveur de dev)

### `FontEnd/tailwind.config.js`
Configuration TailwindCSS

### `Backend/run.py`
Point d'entrée backend avec configuration Flask

---

## 📞 Support et Documentation supplémentaire

### Guides disponibles:
- `SECURITY.md` - Sécurité complète
- `API_DOCUMENTATION.md` - Documentation API détaillée
- `EMPLOYEE_MANAGEMENT_GUIDE.md` - Guide gestion employés
- `TESTING_GUIDE.md` - Guide de test
- `TEST_CREDENTIALS.md` - Identifiants de test
- `PASSWORD_RESET_GUIDE.md` - Réinitialisation mot de passe
- `MIGRATION_GUIDE.md` - Migration vers production

---

## 🎓 Formation rapide

### Pour un nouvel utilisateur client:

1. Ouvrir `http://localhost:5174`
2. Cliquer sur "S'inscrire"
3. Remplir le formulaire avec un mot de passe fort
4. Explorer le menu
5. Passer une commande de test
6. Faire une réservation

### Pour un nouveau gérant:

1. Se connecter avec `GER-2024-A001` / `Admin@2024`
2. Visiter chaque module du dashboard
3. Créer un employé test
4. Modifier une commande test
5. Confirmer une réservation test
6. Explorer les statistiques

---

## 🚀 Prochaines étapes / Améliorations futures

### Fonctionnalités à développer:
- [ ] Système de paiement en ligne (PayPal, Stripe)
- [ ] Notifications push en temps réel
- [ ] Application mobile (React Native)
- [ ] Chat en direct avec le restaurant
- [ ] Système de livraison avec tracking GPS
- [ ] Intégration avec imprimante de tickets
- [ ] Rapports Excel/PDF export
- [ ] Multi-langue (FR/EN/AR)
- [ ] Mode sombre complet
- [ ] Scan de QR code pour menu

### Améliorations techniques:
- [ ] Migration vers PostgreSQL/MongoDB
- [ ] API rate limiting
- [ ] Logs centralisés
- [ ] Tests automatisés (Jest, Pytest)
- [ ] CI/CD Pipeline
- [ ] Docker containerization
- [ ] Déploiement cloud (AWS, Heroku, etc.)

---

**Document créé le**: 18 Novembre 2025  
**Dernière mise à jour**: 18 Novembre 2025  
**Version**: 1.0

**Développé pour**: TasteFoods Restaurant Management System
