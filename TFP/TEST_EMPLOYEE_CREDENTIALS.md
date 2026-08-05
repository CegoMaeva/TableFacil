# Identifiants de Test - Service Clientèle

## Employé Cuisinier
- **Email**: maevachoupo@gmail.com
- **Code**: CUI-2025-67BM
- **Mot de passe**: (utiliser le mot de passe configuré)

## Gérant
- **Email**: maevachoupo@gmail.com
- **Code**: GER-2024-A001
- **Mot de passe**: (utiliser le mot de passe configuré)

## Résolution des Erreurs

### Problèmes Résolus
1. **401 UNAUTHORIZED sur /api/orders**
   - ✅ Backend modifié pour autoriser `user_type == 'employee'`
   - ✅ Clé localStorage changée de `'token'` à `'auth_token'`

2. **500 INTERNAL SERVER ERROR sur /api/reservations**
   - ✅ Référence `user_id` corrigée (utilise `id` ou `user_id`)
   - ✅ Employés autorisés à voir toutes les réservations

### Changements Appliqués

#### Frontend
- `OrdersManagement.tsx`: `localStorage.getItem('auth_token')`
- `ReservationsManagement.tsx`: `localStorage.getItem('auth_token')`
- `ClientVerification.tsx`: `localStorage.getItem('auth_token')`
- `Tables.tsx`: `localStorage.getItem('auth_token')`

#### Backend
- `orders.py`: Ajout de `user_data.get('user_type') == 'employee'` pour accès complet
- `reservations.py`: 
  - Correction `user_id = user_data.get('id') or user_data.get('user_id')`
  - Condition: `if user_data.get('role') == 'client' and user_data.get('user_type') != 'employee'`

## Test Instructions

1. Redémarrez le frontend (Vite dev server déjà en cours)
2. Backend est déjà redémarré sur port 5000
3. Connectez-vous avec les identifiants employé ci-dessus
4. Vérifiez que l'interface service charge les données
5. Testez les actions:
   - Changement de statut de commande
   - Confirmation de réservation
   - Vérification de présence client
