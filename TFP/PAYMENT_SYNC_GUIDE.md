# Guide de Synchronisation des Paiements - Réservations & Commandes

## ✅ Modifications Effectuées

Le système de paiement PayPal pour les réservations a été synchronisé avec celui des commandes pour garantir une cohérence complète.

---

## 📋 Frontend - ReservationsClient.tsx

### Fonction `handlePaymentSuccess` mise à jour

**Avant :**n
```tsx
body: JSON.stringify({
  paymentMethod: paymentMethod || 'paypal',
  paymentDetails: details
})
```

**Après :**
```tsx
const paymentInfo = {
  paymentMethod: paymentMethod || 'paypal',
  paymentId: paymentData.id || paymentData.transactionId,
  paymentDetails: {
    orderId: paymentData.id,
    payerId: paymentData.payer?.payer_id,
    payerEmail: paymentData.payer?.email_address,
    payerName: paymentData.payer?.name?.given_name + ' ' + paymentData.payer?.name?.surname,
    status: paymentData.status,
    amount: paymentData.purchase_units?.[0]?.amount?.value,
    currency: paymentData.purchase_units?.[0]?.amount?.currency_code,
    captureId: paymentData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
    createTime: paymentData.create_time,
    updateTime: paymentData.update_time
  },
  notes: `Paiement via ${paymentMethod === 'paypal' ? 'PayPal' : 'Carte bancaire'} - ${paymentData.id || 'N/A'}`
};
```

### Avantages :
- ✅ Données complètes du paiement PayPal
- ✅ Informations du payeur (email, nom)
- ✅ ID de capture pour traçabilité
- ✅ Timestamps de création/mise à jour
- ✅ Notes automatiques avec référence de transaction

---

## 🔧 Backend - reservations.py

### Route `/api/reservations/<reservation_id>/pay-deposit`

**Avant :**
```python
data = request.get_json()
payment_method = data.get('paymentMethod')

# Simple mise à jour
reservations[reservation_index]['depositStatus'] = 'paid'
reservations[reservation_index]['paymentMethod'] = payment_method
```

**Après :**
```python
data = request.get_json()
payment_method = data.get('paymentMethod')
payment_id = data.get('paymentId')
payment_details = data.get('paymentDetails', {})
notes = data.get('notes', '')

# Mise à jour complète avec tous les détails
reservations[reservation_index]['depositStatus'] = 'paid'
reservations[reservation_index]['depositPaidAt'] = datetime.now().isoformat()
reservations[reservation_index]['paymentMethod'] = payment_method
reservations[reservation_index]['paymentId'] = payment_id
reservations[reservation_index]['paymentDetails'] = payment_details
if notes:
    reservations[reservation_index]['paymentNotes'] = notes

# Log pour audit
print(f"Paiement acompte réservation {reservation_id}:")
print(f"  - Méthode: {payment_method}")
print(f"  - Payment ID: {payment_id}")
print(f"  - Client: {user_data.get('username')}")
print(f"  - Montant: {reservation.get('depositAmount', 0)} FCFA")
```

### Avantages :
- ✅ Enregistrement de l'ID de transaction PayPal
- ✅ Stockage des détails complets du paiement
- ✅ Notes de paiement avec référence
- ✅ Logs d'audit dans la console
- ✅ Traçabilité complète pour remboursements

---

## 🔄 Flux de Paiement Complet

### 1. Client clique sur "Payer l'acompte"
```
ReservationsClient.tsx → handlePayDeposit()
↓
setSelectedReservation(reservation)
setShowPaymentModal(true)
```

### 2. Client choisit PayPal ou Carte
```
Modal affiche :
- PayPalPayment component (si paymentMethod === 'paypal')
- CardPayment component (si paymentMethod === 'card')
```

### 3. Paiement PayPal réussi
```
PayPalPayment.tsx → onSuccess(paymentData)
↓
paymentData contient :
{
  id: "PAYID-123ABC",
  status: "COMPLETED",
  payer: {
    payer_id: "ABC123",
    email_address: "client@example.com",
    name: { given_name: "John", surname: "Doe" }
  },
  purchase_units: [{
    amount: { value: "8.33", currency_code: "USD" },
    payments: {
      captures: [{ id: "CAP-123" }]
    }
  }],
  create_time: "2024-01-01T10:00:00Z",
  update_time: "2024-01-01T10:05:00Z"
}
```

### 4. Frontend envoie au backend
```
ReservationsClient.tsx → handlePaymentSuccess(paymentData)
↓
POST /api/reservations/{id}/pay-deposit
Body: {
  paymentMethod: "paypal",
  paymentId: "PAYID-123ABC",
  paymentDetails: { ... },
  notes: "Paiement via PayPal - PAYID-123ABC"
}
```

### 5. Backend enregistre
```
reservations.py → pay_deposit()
↓
Mise à jour de la réservation :
{
  ...reservation,
  depositStatus: "paid",
  depositPaidAt: "2024-01-01T10:05:00Z",
  paymentMethod: "paypal",
  paymentId: "PAYID-123ABC",
  paymentDetails: { orderId, payerId, payerEmail, ... },
  paymentNotes: "Paiement via PayPal - PAYID-123ABC"
}
```

### 6. Confirmation client
```
Backend → 200 OK
↓
Frontend → fetchReservations() (refresh)
↓
Alert : "Acompte payé avec succès! Votre réservation est en attente de validation."
```

---

## 📊 Structure des Données dans reservations.json

```json
{
  "id": "RES-123",
  "customer": "John Doe",
  "phone": "+225 07 12 34 56 78",
  "email": "john@example.com",
  "date": "2024-12-25",
  "time": "19:00",
  "guests": 4,
  "zone": "VIP",
  "status": "En attente",
  "depositAmount": 5000,
  "depositStatus": "paid",
  "depositPaidAt": "2024-01-01T10:05:00Z",
  "paymentMethod": "paypal",
  "paymentId": "PAYID-123ABC",
  "paymentDetails": {
    "orderId": "PAYID-123ABC",
    "payerId": "ABC123DEF456",
    "payerEmail": "john@example.com",
    "payerName": "John Doe",
    "status": "COMPLETED",
    "amount": "8.33",
    "currency": "USD",
    "captureId": "CAP-789XYZ",
    "createTime": "2024-01-01T10:00:00Z",
    "updateTime": "2024-01-01T10:05:00Z"
  },
  "paymentNotes": "Paiement via PayPal - PAYID-123ABC",
  "createdAt": "2024-01-01T09:00:00Z",
  "updatedAt": "2024-01-01T10:05:00Z"
}
```

---

## 🔐 Sécurité & Audit

### Informations traçables :
1. **paymentId** : ID unique de la transaction PayPal
2. **captureId** : ID de capture pour remboursements
3. **payerEmail** : Email du payeur (vérification)
4. **depositPaidAt** : Timestamp exact du paiement
5. **paymentDetails** : Objet complet pour support

### Logs serveur :
```
Paiement acompte réservation RES-123:
  - Méthode: paypal
  - Payment ID: PAYID-123ABC
  - Client: john_doe
  - Montant: 5000 FCFA
```

---

## 🎯 Cas d'Usage

### Remboursement automatique
Le manager peut utiliser `captureId` pour effectuer un remboursement PayPal :
```python
# Dans mark_attended() si attended = False
if reservation['paymentMethod'] == 'paypal':
    capture_id = reservation['paymentDetails'].get('captureId')
    # Appel API PayPal refund avec capture_id
```

### Support client
Toutes les informations nécessaires sont disponibles :
- ID transaction : `paymentId`
- Email payeur : `paymentDetails.payerEmail`
- Montant exact : `paymentDetails.amount` (USD) + `depositAmount` (FCFA)
- Date/heure : `depositPaidAt`

### Statistiques
```python
# Rapport des paiements
total_paypal = sum(r['depositAmount'] for r in reservations 
                   if r.get('paymentMethod') == 'paypal' 
                   and r.get('depositStatus') == 'paid')
```

---

## ✨ Amélioration Continue

### Prochaines étapes possibles :
1. **Webhook PayPal** : Confirmation asynchrone des paiements
2. **Remboursement automatique** : Si réservation rejetée
3. **Dashboard paiements** : Visualisation des transactions
4. **Export comptable** : CSV des paiements pour comptabilité
5. **Notifications email** : Confirmation de paiement automatique

---

## 🧪 Test du Système

### Pour tester le paiement PayPal :
1. Créer une réservation
2. Cliquer sur "Payer l'acompte"
3. Choisir "PayPal"
4. Se connecter avec compte PayPal sandbox
5. Vérifier dans `reservations.json` que tous les champs sont remplis

### Données attendues :
- ✅ `depositStatus` = "paid"
- ✅ `paymentId` présent
- ✅ `paymentDetails` contient orderId, payerId, etc.
- ✅ `paymentNotes` contient référence transaction
- ✅ Logs serveur affichent détails paiement

---

## 📝 Notes Importantes

1. **Conversion USD/FCFA** : Le montant est converti en USD pour PayPal (1 USD ≈ 600 FCFA)
2. **Status réservation** : Reste "En attente" même après paiement → Nécessite validation manager
3. **Compatibilité** : Système identique entre commandes et réservations
4. **Audit** : Tous les paiements sont tracés dans les logs et le fichier JSON

---

✅ **Le système de paiement PayPal est maintenant complètement synchronisé entre les réservations et les commandes !**
