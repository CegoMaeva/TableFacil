# API de Gestion des Réservations

## Vue d'ensemble
L'API de réservations permet de gérer toutes les réservations de tables du restaurant avec une authentification JWT.

## Base URL
```
http://localhost:5000/api/reservations
```

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Obtenir le Total des Réservations

**GET** `/api/reservations/total`

Retourne le nombre total de réservations avec des statistiques par statut.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse (200):**
```json
{
  "total": 15,
  "en_attente": 3,
  "confirmee": 8,
  "terminee": 3,
  "annulee": 1
}
```

---

### 2. Lister Toutes les Réservations

**GET** `/api/reservations`

Récupère toutes les réservations. Les clients ne voient que leurs propres réservations.

**Headers:**
```
Authorization: Bearer <token>
```

**Paramètres de requête (optionnels):**
- `status` - Filtrer par statut (En attente, Confirmée, Terminée, Annulée)
- `date` - Filtrer par date (format: YYYY-MM-DD)

**Exemple:**
```
GET /api/reservations?status=Confirmée&date=2025-11-25
```

**Réponse (200):**
```json
[
  {
    "id": "RES-A1B2C3D4",
    "clientId": "user_001",
    "customer": "Jean Dupont",
    "phone": "+221 77 123 45 67",
    "email": "jean.dupont@example.com",
    "date": "2025-11-25",
    "time": "19:30",
    "guests": 4,
    "table": "T12",
    "zone": "Standard",
    "status": "Confirmée",
    "notes": "Allergique aux arachides",
    "occasion": "Anniversaire",
    "createdAt": "2025-11-20T10:30:00",
    "updatedAt": "2025-11-20T10:30:00",
    "createdBy": "Jean Dupont"
  }
]
```

---

### 3. Obtenir une Réservation Spécifique

**GET** `/api/reservations/{id}`

Récupère les détails d'une réservation spécifique.

**Headers:**
```
Authorization: Bearer <token>
```

**Paramètres:**
- `id` (path) - ID de la réservation

**Réponse (200):**
```json
{
  "id": "RES-A1B2C3D4",
  "clientId": "user_001",
  "customer": "Jean Dupont",
  "phone": "+221 77 123 45 67",
  "email": "jean.dupont@example.com",
  "date": "2025-11-25",
  "time": "19:30",
  "guests": 4,
  "table": "T12",
  "zone": "Standard",
  "status": "Confirmée",
  "notes": "Allergique aux arachides",
  "occasion": "Anniversaire",
  "createdAt": "2025-11-20T10:30:00",
  "updatedAt": "2025-11-20T10:30:00",
  "createdBy": "Jean Dupont"
}
```

**Erreurs:**
- `404` - Réservation non trouvée
- `403` - Accès non autorisé

---

### 4. Créer une Nouvelle Réservation

**POST** `/api/reservations`

Crée une nouvelle réservation.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Corps de la requête:**
```json
{
  "customer": "Sophie Bernard",
  "phone": "+221 77 456 78 90",
  "email": "sophie.bernard@example.com",
  "date": "2025-11-28",
  "time": "20:30",
  "guests": 3,
  "zone": "VIP",
  "table": "T10",
  "notes": "Vue sur la mer si possible",
  "occasion": "Anniversaire de mariage"
}
```

**Champs obligatoires:**
- `customer` (string) - Nom du client
- `phone` (string) - Numéro de téléphone
- `email` (string) - Email du client
- `date` (string) - Date de la réservation (YYYY-MM-DD)
- `time` (string) - Heure de la réservation (HH:MM)
- `guests` (integer) - Nombre de personnes (1-20)
- `zone` (string) - Zone souhaitée (Standard, VIP, Terrasse)

**Champs optionnels:**
- `table` (string) - Numéro de table (attribué par le système si vide)
- `notes` (string) - Notes ou demandes spéciales
- `occasion` (string) - Occasion spéciale (Anniversaire, Dîner d'affaires, etc.)
- `status` (string) - Statut initial (par défaut: "En attente")

**Réponse (201):**
```json
{
  "message": "Réservation créée avec succès",
  "reservation": {
    "id": "RES-Q7R8S9T0",
    "clientId": "user_004",
    "customer": "Sophie Bernard",
    "phone": "+221 77 456 78 90",
    "email": "sophie.bernard@example.com",
    "date": "2025-11-28",
    "time": "20:30",
    "guests": 3,
    "table": "T10",
    "zone": "VIP",
    "status": "En attente",
    "notes": "Vue sur la mer si possible",
    "occasion": "Anniversaire de mariage",
    "createdAt": "2025-11-22T15:45:00.123456",
    "updatedAt": "2025-11-22T15:45:00.123456",
    "createdBy": "Sophie Bernard"
  }
}
```

**Erreurs:**
- `400` - Champ requis manquant ou valeur invalide
- `401` - Token manquant ou invalide

**Validations:**
- Le nombre de personnes doit être entre 1 et 20
- La zone doit être "Standard", "VIP" ou "Terrasse"
- La date doit être au format YYYY-MM-DD
- L'heure doit être au format HH:MM

---

### 5. Modifier une Réservation

**PUT** `/api/reservations/{id}`

Met à jour une réservation existante.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Paramètres:**
- `id` (path) - ID de la réservation

**Corps de la requête (tous les champs sont optionnels):**
```json
{
  "date": "2025-11-29",
  "time": "21:00",
  "guests": 4,
  "zone": "Terrasse",
  "notes": "Table pour 4 près de la fenêtre"
}
```

**Permissions:**
- **Clients** peuvent modifier: date, time, guests, phone, email, zone, notes, occasion
- **Managers/Gérants** peuvent modifier tous les champs incluant: customer, status, table

**Réponse (200):**
```json
{
  "id": "RES-Q7R8S9T0",
  "clientId": "user_004",
  "customer": "Sophie Bernard",
  "phone": "+221 77 456 78 90",
  "email": "sophie.bernard@example.com",
  "date": "2025-11-29",
  "time": "21:00",
  "guests": 4,
  "table": "T10",
  "zone": "Terrasse",
  "status": "En attente",
  "notes": "Table pour 4 près de la fenêtre",
  "occasion": "Anniversaire de mariage",
  "createdAt": "2025-11-22T15:45:00",
  "updatedAt": "2025-11-22T16:00:00.654321",
  "createdBy": "Sophie Bernard"
}
```

**Erreurs:**
- `404` - Réservation non trouvée
- `403` - Accès non autorisé

---

### 6. Modifier le Statut d'une Réservation

**PATCH** `/api/reservations/{id}/status`

Met à jour uniquement le statut d'une réservation. **Réservé aux managers/gérants**.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Paramètres:**
- `id` (path) - ID de la réservation

**Corps de la requête:**
```json
{
  "status": "Confirmée"
}
```

**Statuts valides:**
- `En attente` - Nouvelle réservation en attente de confirmation
- `Confirmée` - Réservation confirmée par le restaurant
- `Annulée` - Réservation annulée
- `Terminée` - Service terminé

**Réponse (200):**
```json
{
  "id": "RES-Q7R8S9T0",
  "status": "Confirmée",
  "updatedAt": "2025-11-22T16:30:00.123456",
  ...
}
```

**Erreurs:**
- `400` - Statut invalide
- `403` - Accès non autorisé (uniquement managers/gérants)
- `404` - Réservation non trouvée

---

### 7. Annuler/Supprimer une Réservation

**DELETE** `/api/reservations/{id}`

Annule ou supprime une réservation.

**Headers:**
```
Authorization: Bearer <token>
```

**Paramètres:**
- `id` (path) - ID de la réservation

**Comportement:**
- **Clients**: Change le statut en "Annulée" (soft delete)
- **Managers/Gérants**: Supprime complètement la réservation (hard delete)

**Réponse (200):**
```json
{
  "message": "Réservation annulée",
  "reservation": {
    "id": "RES-Q7R8S9T0",
    "status": "Annulée",
    ...
  }
}
```

**Erreurs:**
- `404` - Réservation non trouvée
- `403` - Accès non autorisé

---

### 8. Obtenir les Horaires Disponibles

**GET** `/api/reservations/available-times`

Récupère les créneaux horaires disponibles pour une date donnée.

**Paramètres de requête:**
- `date` (requis) - Date pour vérifier la disponibilité (YYYY-MM-DD)

**Exemple:**
```
GET /api/reservations/available-times?date=2025-11-28
```

**Réponse (200):**
```json
{
  "date": "2025-11-28",
  "availableTimes": [
    "12:00",
    "12:30",
    "13:30",
    "14:00",
    "19:00",
    "19:30",
    "21:00",
    "21:30"
  ]
}
```

**Notes:**
- Les horaires retournés sont les créneaux où il reste de la disponibilité
- Les horaires d'ouverture sont: 12:00-14:00 (déjeuner) et 19:00-21:30 (dîner)
- Un créneau est considéré disponible s'il n'y a pas de réservation avec statut "En attente", "Confirmée" ou "Terminée"

**Erreurs:**
- `400` - Paramètre date manquant

---

## Modèle de Données

### Objet Reservation

```typescript
{
  id: string;              // ID unique (format: RES-XXXXXXXX)
  clientId: string;        // ID du client qui a créé la réservation
  customer: string;        // Nom du client
  phone: string;           // Téléphone du client
  email: string;           // Email du client
  date: string;            // Date de la réservation (YYYY-MM-DD)
  time: string;            // Heure de la réservation (HH:MM)
  guests: number;          // Nombre de personnes (1-20)
  table: string;           // Numéro de table attribué
  zone: string;            // Zone: "Standard" | "VIP" | "Terrasse"
  status: string;          // "En attente" | "Confirmée" | "Annulée" | "Terminée"
  notes: string;           // Notes ou demandes spéciales
  occasion: string | null; // Occasion spéciale (optionnel)
  createdAt: string;       // Date/heure de création (ISO 8601)
  updatedAt: string;       // Date/heure de dernière modification (ISO 8601)
  createdBy: string;       // Nom de l'utilisateur qui a créé la réservation
}
```

---

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Requête invalide (champ manquant ou valeur incorrecte) |
| 401  | Non authentifié (token manquant ou invalide) |
| 403  | Accès interdit (permissions insuffisantes) |
| 404  | Ressource non trouvée |
| 500  | Erreur serveur interne |

---

## Exemples d'Utilisation

### Exemple 1: Créer une réservation (Client)

```bash
curl -X POST http://localhost:5000/api/reservations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "Ahmed Diallo",
    "phone": "+221 77 567 89 01",
    "email": "ahmed.diallo@example.com",
    "date": "2025-12-01",
    "time": "19:00",
    "guests": 5,
    "zone": "Standard",
    "notes": "Table près de l'\''entrée si possible",
    "occasion": "Réunion familiale"
  }'
```

### Exemple 2: Confirmer une réservation (Manager)

```bash
curl -X PATCH http://localhost:5000/api/reservations/RES-A1B2C3D4/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Confirmée"
  }'
```

### Exemple 3: Vérifier la disponibilité

```bash
curl -X GET "http://localhost:5000/api/reservations/available-times?date=2025-12-01" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Exemple 4: Lister les réservations confirmées

```bash
curl -X GET "http://localhost:5000/api/reservations?status=Confirmée" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Notes Importantes

1. **Authentification**: Toutes les requêtes nécessitent un token JWT valide
2. **Permissions**: Les clients ne peuvent voir et modifier que leurs propres réservations
3. **Validation**: Les zones doivent être exactement "Standard", "VIP" ou "Terrasse" (sensible à la casse)
4. **Formats de date**: Toujours utiliser le format ISO (YYYY-MM-DD pour les dates, HH:MM pour les heures)
5. **Statuts**: Les statuts français doivent être utilisés avec les accents appropriés
6. **ID unique**: Les ID de réservation sont générés automatiquement au format RES-XXXXXXXX

---

## Support et Contact

Pour toute question ou problème avec l'API, contactez l'équipe de développement.
