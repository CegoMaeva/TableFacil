# Guide des Réservations avec Acompte

## 📋 Aperçu du Système

Le système de réservations a été complètement amélioré avec :
- ✅ Vérification stricte de disponibilité des tables (chevauchement 2h)
- 💰 Paiement d'acompte obligatoire (25% du montant estimé)
- 🔒 Marquage des tables réservées sur le plan en temps réel
- 📊 Gestion de la présence/absence avec remboursement automatique
- 🎨 Visualisation claire sur le plan du restaurant

---

## 🚀 Fonctionnalités Implémentées

### 1. **Création de Réservation avec Acompte**

#### Processus côté client :
1. **Formulaire de réservation** (ContactForm)
   - Client remplit : nom, email, téléphone, date, heure, nb personnes, zone
   - Soumission → API vérifie disponibilité

2. **Vérification stricte de disponibilité**
   - Backend vérifie les tables dans la zone demandée
   - Calcul du chevauchement d'horaire (±2h)
   - Si aucune table disponible → erreur avec suggestion

3. **Calcul de l'acompte**
   - Prix par personne : 15,000 FCFA
   - Acompte : 25% du total
   - Exemple : 4 personnes = 60,000 FCFA → Acompte : 15,000 FCFA

4. **Modal de paiement**
   - Choix : Carte bancaire ou PayPal
   - Formulaire de paiement sécurisé
   - Confirmation → Statut passe à "Confirmée"

#### API Backend :
```
POST /api/reservations
Body: { customer, phone, email, date, time, guests, zone, occasion?, notes? }

Response:
{
  "message": "Réservation créée. Veuillez payer l'acompte pour confirmer.",
  "reservation": {
    "id": "RES-XXX",
    "depositAmount": 15000,
    "depositStatus": "pending",
    "status": "En attente",
    ...
  },
  "assignedTable": { "id": "T12", "number": 12, "capacity": 4 }
}
```

---

### 2. **Paiement de l'Acompte**

#### Endpoint :
```
POST /api/reservations/{reservation_id}/pay-deposit
Body: { "paymentMethod": "card" | "paypal" }

Response:
{
  "message": "Acompte payé avec succès. Réservation confirmée!",
  "reservation": {
    "depositStatus": "paid",
    "depositPaidAt": "2025-11-22T...",
    "paymentMethod": "card",
    "status": "Confirmée"
  }
}
```

#### Effet :
- ✅ `depositStatus` → "paid"
- ✅ `status` → "Confirmée"
- ✅ Table apparaît **en rouge** sur le plan

---

### 3. **Gestion de la Présence/Absence**

#### Endpoint (Gérant uniquement) :
```
PATCH /api/reservations/{reservation_id}/mark-attended
Body: { "attended": true | false }
```

#### Scénarios :

##### ✅ Client PRÉSENT :
- `attended` → `true`
- `depositStatus` → "refunded"
- `status` → "Terminée"
- 💰 **Acompte remboursé** (ou déduit de la facture finale)

##### ❌ Client ABSENT :
- `attended` → `false`
- `depositStatus` → "forfeited"
- `status` → "Terminée"
- 🚫 **Acompte conservé** par le restaurant

---

### 4. **Visualisation sur le Plan**

#### RestaurantFloorPlanEditor :
- **Tables vertes** : Disponibles
- **Tables rouges** : Réservées (acompte payé)
- **Tables oranges** : Occupées

#### Filtre par Date/Heure :
```typescript
// Algorithme de détection des tables réservées
const tableReservation = reservations.find(r => {
  if (r.table !== table.id) return false;
  if (r.status !== 'Confirmée') return false;
  if (r.depositStatus !== 'paid') return false;

  // Chevauchement d'horaire (±2h)
  const rMinutes = parseTime(r.time);
  const selMinutes = parseTime(selectedTime);
  return Math.abs(rMinutes - selMinutes) < 120;
});
```

#### Clic sur une Table :
- Modal affiche :
  - Statut (Disponible/Réservée/Occupée)
  - Si réservée :
    - Nom du client
    - Téléphone
    - Heure
    - Nombre de personnes
    - Occasion
    - Notes
    - **Statut de l'acompte** (Payé/En attente)
    - **Montant de l'acompte**

---

## 🧪 Procédure de Test Complète

### Étape 1 : Créer une Réservation
1. Ouvrir http://localhost:5174/
2. **Se connecter** (ou utiliser le formulaire public de réservation)
3. Remplir le formulaire :
   - Nom : "Jean Test"
   - Email : test@example.com
   - Téléphone : +221 77 123 45 67
   - Date : **Aujourd'hui** (2025-11-22)
   - Heure : 20:00
   - Personnes : 4
   - Zone : Standard
4. Cliquer "Réserver ma table"

### Étape 2 : Payer l'Acompte
1. **Modal de paiement** s'ouvre automatiquement
2. Vérifier :
   - Montant affiché : **15,000 FCFA** (25% de 60,000 FCFA)
   - Message : "Remboursement garanti si présence"
3. Choisir **Carte bancaire** ou **PayPal**
4. Remplir le formulaire (mode démo, pas de vraie transaction)
5. Cliquer "Payer"
6. **Confirmation** : "✅ Acompte payé avec succès! Votre réservation est confirmée."

### Étape 3 : Vérifier le Plan
1. Se connecter en tant que **Gérant** :
   - Identifiant : `GER-2024-A001`
   - Mot de passe : `Admin@2024`
2. Aller dans **"Plan du Restaurant"**
3. Cliquer sur **"Éditeur"** (3ème bouton)
4. Sélectionner la date : **Aujourd'hui**
5. Sélectionner l'heure : **20:00**
6. **Vérifier** :
   - Statistiques : "Réservées : 1" (en rouge)
   - Table T12 (ou autre) apparaît **EN ROUGE**
   - Cliquer sur la table rouge
   - Modal affiche :
     - Client : Jean Test
     - Acompte : ✅ Payé - 15,000 FCFA

### Étape 4 : Gérer les Réservations
1. Aller dans **"Réservations"**
2. Trouver la réservation de Jean Test
3. **Vérifier l'affichage** :
   - Badge "✅ Confirmée"
   - Section acompte :
     - 💰 15,000 FCFA
     - ✅ Payé (💳 Carte / 🅿️ PayPal)
   - **Boutons de présence** :
     - ✅ Présent
     - ❌ Absent

### Étape 5 : Marquer la Présence
1. Cliquer **"✅ Présent"**
2. **Vérifier** :
   - Toast : "✅ Client marqué présent - Acompte remboursé"
   - Statut : "Terminée"
   - Badge acompte : "💰 Remboursé (client présent)"

### Étape 6 : Tester l'Absence
1. Créer une **nouvelle réservation**
2. Payer l'acompte
3. Dans Réservations, cliquer **"❌ Absent"**
4. **Vérifier** :
   - Toast : "❌ Client marqué absent - Acompte conservé"
   - Statut : "Terminée"
   - Badge acompte : "🚫 Conservé (client absent)"

---

## 📊 Flux de Données

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUX DE RÉSERVATION                         │
└─────────────────────────────────────────────────────────────────┘

1. CLIENT : Formulaire de réservation
   ↓
2. API : POST /api/reservations
   • Vérifie disponibilité (chevauchement ±2h)
   • Calcule acompte (25%)
   • Crée réservation (status: "En attente")
   ↓
3. FRONTEND : Modal de paiement
   • Choix : Carte / PayPal
   • Formulaire sécurisé
   ↓
4. API : POST /api/reservations/{id}/pay-deposit
   • depositStatus → "paid"
   • status → "Confirmée"
   ↓
5. PLAN : Table devient ROUGE
   • Synchronisation en temps réel
   • Affichage info réservation au clic
   ↓
6. GÉRANT : Jour de la réservation
   • Bouton "Présent" → depositStatus = "refunded"
   • Bouton "Absent" → depositStatus = "forfeited"
   ↓
7. FINAL : Statut "Terminée"
```

---

## 🔒 Règles de Disponibilité

### Algorithme de Vérification :
1. **Filtrer tables** :
   - Même zone que demandée
   - Capacité ≥ nombre de personnes

2. **Identifier tables réservées** :
   - Date identique
   - Horaire avec chevauchement < 2h
   - Statut "En attente" ou "Confirmée"

3. **Calculer disponibilité** :
   - Tables disponibles = Tables filtrées - Tables réservées

4. **Assigner table optimale** :
   - Trier par capacité croissante
   - Choisir la plus petite table suffisante

### Exemples :
```
Réservation à 19:30 → Bloque la table de 18:00 à 21:30
Réservation à 20:00 → Bloque la table de 18:30 à 22:00

❌ Impossible de réserver la même table à 19:00 (chevauchement)
✅ Possible de réserver la même table à 14:00 (pas de chevauchement)
```

---

## 💡 Messages Utilisateur

### Succès :
- ✅ "Acompte payé avec succès! Votre réservation est confirmée."
- ✅ "Client marqué présent - Acompte remboursé"

### Erreurs :
- ❌ "Aucune table disponible dans la zone Standard pour 4 personnes"
- ❌ "Toutes les tables de la zone VIP sont réservées pour 2025-11-22 à 20:00"
- ⚠️ "Essayez un autre horaire ou une autre zone"

### Avertissements :
- ⚠️ "Acompte en attente de paiement"
- 🚫 "Client marqué absent - Acompte conservé"

---

## 📁 Fichiers Modifiés

### Backend :
1. **`Backend/app/routes/reservations.py`** :
   - Vérification stricte disponibilité avec chevauchement 2h
   - Calcul automatique acompte (25%)
   - Endpoint `pay-deposit`
   - Endpoint `mark-attended`

2. **`Backend/data/reservations.json`** :
   - Nouveaux champs :
     - `depositAmount`: number
     - `depositStatus`: "pending" | "paid" | "refunded" | "forfeited"
     - `depositPaidAt`: string
     - `paymentMethod`: "card" | "paypal"
     - `attended`: boolean | null

### Frontend :
1. **`FontEnd/src/components/Payment/DepositPaymentModal.tsx`** (NOUVEAU) :
   - Modal de paiement avec choix carte/PayPal
   - Intégration CardPayment et PayPalPayment
   - Confirmation vers backend

2. **`FontEnd/src/sections/ReservationSection/components/ContactForm.tsx`** :
   - Gestion du modal de paiement après création réservation
   - Affichage montant acompte dans message de confirmation

3. **`FontEnd/src/components/ManagerLayout/ReservationsManagement.tsx`** :
   - Interface Reservation avec champs deposit
   - Fonction `handleMarkAttended()`
   - Affichage badge acompte (payé/remboursé/conservé)
   - Boutons "Présent" / "Absent"

4. **`FontEnd/src/components/ManagerLayout/RestaurantFloorPlanEditor.tsx`** :
   - Fonction `loadTablesWithReservations()` :
     - Charge tables + réservations
     - Calcule statut en temps réel
     - Détecte chevauchements d'horaire
   - Modal détails table :
     - Affichage info réservation
     - Statut acompte
     - Montant acompte

---

## 🎯 Résultat Final

### ✅ Ce qui fonctionne maintenant :
1. **Disponibilité respectée** : Impossible de réserver une table déjà prise
2. **Acompte obligatoire** : Pas de confirmation sans paiement
3. **Plan synchronisé** : Tables réservées visibles en temps réel (rouge)
4. **Gestion présence** : Remboursement ou conservation selon présence
5. **Transparence totale** : Client voit que l'acompte est remboursable

### 🚀 Avantages pour le restaurant :
- 🔒 Moins d'absences (acompte dissuasif)
- 💰 Compensation financière si absence
- 📊 Meilleure gestion des tables
- ⏱️ Respect des horaires de réservation

### ❤️ Avantages pour le client :
- ✅ Garantie de disponibilité de la table
- 💰 Acompte remboursé si présent
- 📱 Confirmation instantanée
- 🔍 Transparence totale du processus

---

## 🔧 Configuration

### Prix par personne :
```python
# Backend/app/routes/reservations.py (ligne ~120)
price_per_person = 15000  # 15,000 FCFA
deposit_amount = int(guests * price_per_person * 0.25)  # 25%
```

### Durée de réservation :
```python
# Backend/app/routes/reservations.py (ligne ~100)
if abs(r_minutes - new_minutes) < 120:  # 120 minutes = 2h
```

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier que le backend tourne sur http://localhost:5000
2. Vérifier que le frontend tourne sur http://localhost:5174
3. Consulter la console du navigateur (F12) pour les erreurs
4. Consulter les logs du backend dans le terminal

**Bon test ! 🎉**
