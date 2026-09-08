"""
Script de test pour l'API de réservations
Teste tous les endpoints avec des exemples concrets
"""

import requests
import json

BASE_URL = "http://localhost:5000"

# Configuration
print("=" * 60)
print("TEST API DE RÉSERVATIONS - TableFacil")
print("=" * 60)

# 1. Login pour obtenir un token
print("\n1. TEST: Login Client (Employé Gérant)")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login/employee",
    json={
        "code": "GER-2024-A001",
        "password": "Admin@2024"
    }
)
print(f"Status: {login_response.status_code}")
if login_response.status_code == 200:
    token = login_response.json().get('token')
    print(f"✓ Token obtenu: {token[:30]}...")
    headers = {"Authorization": f"Bearer {token}"}
else:
    print(f"✗ Erreur: {login_response.text}")
    exit(1)

# 2. Test: Obtenir le total des réservations
print("\n2. TEST: Obtenir le total des réservations")
response = requests.get(f"{BASE_URL}/api/reservations/total", headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    stats = response.json()
    print(f"✓ Total: {stats['total']}")
    print(f"  - En attente: {stats['en_attente']}")
    print(f"  - Confirmée: {stats['confirmee']}")
    print(f"  - Terminée: {stats['terminee']}")
    print(f"  - Annulée: {stats['annulee']}")
else:
    print(f"✗ Erreur: {response.text}")

# 3. Test: Lister toutes les réservations
print("\n3. TEST: Lister toutes les réservations")
response = requests.get(f"{BASE_URL}/api/reservations", headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    reservations = response.json()
    print(f"✓ {len(reservations)} réservation(s) trouvée(s)")
    for res in reservations[:3]:  # Afficher les 3 premières
        print(f"\n  ID: {res['id']}")
        print(f"  Client: {res['customer']}")
        print(f"  Date: {res['date']} à {res['time']}")
        print(f"  Personnes: {res['guests']}")
        print(f"  Zone: {res['zone']}")
        print(f"  Statut: {res['status']}")
else:
    print(f"✗ Erreur: {response.text}")

# 4. Test: Filtrer par statut
print("\n4. TEST: Filtrer les réservations confirmées")
response = requests.get(
    f"{BASE_URL}/api/reservations?status=Confirmée",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    confirmed = response.json()
    print(f"✓ {len(confirmed)} réservation(s) confirmée(s)")
else:
    print(f"✗ Erreur: {response.text}")

# 5. Test: Créer une nouvelle réservation
print("\n5. TEST: Créer une nouvelle réservation")
new_reservation = {
    "customer": "Test Automatique",
    "phone": "+221 77 999 88 77",
    "email": "test@example.com",
    "date": "2025-12-05",
    "time": "19:30",
    "guests": 3,
    "zone": "VIP",
    "notes": "Test automatique - peut être supprimé",
    "occasion": "Test API"
}
response = requests.post(
    f"{BASE_URL}/api/reservations",
    headers=headers,
    json=new_reservation
)
print(f"Status: {response.status_code}")
if response.status_code == 201:
    created = response.json()
    reservation_id = created['reservation']['id']
    print(f"✓ Réservation créée avec succès!")
    print(f"  ID: {reservation_id}")
    print(f"  Statut: {created['reservation']['status']}")
else:
    print(f"✗ Erreur: {response.text}")
    reservation_id = None

# 6. Test: Obtenir une réservation spécifique
if reservation_id:
    print(f"\n6. TEST: Obtenir la réservation {reservation_id}")
    response = requests.get(
        f"{BASE_URL}/api/reservations/{reservation_id}",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        reservation = response.json()
        print(f"✓ Réservation trouvée:")
        print(f"  Client: {reservation['customer']}")
        print(f"  Zone: {reservation['zone']}")
        print(f"  Date: {reservation['date']} à {reservation['time']}")
    else:
        print(f"✗ Erreur: {response.text}")

# 7. Test: Modifier une réservation
if reservation_id:
    print(f"\n7. TEST: Modifier la réservation {reservation_id}")
    update_data = {
        "guests": 4,
        "notes": "Modifié par test automatique - 4 personnes maintenant",
        "zone": "Terrasse"
    }
    response = requests.put(
        f"{BASE_URL}/api/reservations/{reservation_id}",
        headers=headers,
        json=update_data
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        updated = response.json()
        print(f"✓ Réservation mise à jour!")
        print(f"  Personnes: {updated['guests']}")
        print(f"  Zone: {updated['zone']}")
    else:
        print(f"✗ Erreur: {response.text}")

# 8. Test: Vérifier les horaires disponibles
print("\n8. TEST: Vérifier les horaires disponibles pour le 2025-12-05")
response = requests.get(
    f"{BASE_URL}/api/reservations/available-times?date=2025-12-05",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    available = response.json()
    print(f"✓ Date: {available['date']}")
    print(f"  Créneaux disponibles: {', '.join(available['availableTimes'][:5])}...")
else:
    print(f"✗ Erreur: {response.text}")

# 9. Test: Login Manager pour tester les permissions
print("\n9. TEST: Login Manager (pour tester changement de statut)")
manager_login = requests.post(
    f"{BASE_URL}/api/auth/login/employee",
    json={
        "code": "GER-2024-A001",
        "password": "Admin@2024"
    }
)
print(f"Status: {manager_login.status_code}")
if manager_login.status_code == 200:
    manager_token = manager_login.json().get('token')
    print(f"✓ Token manager obtenu")
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    
    # Test: Changer le statut d'une réservation
    if reservation_id:
        print(f"\n10. TEST: Confirmer la réservation {reservation_id} (Manager)")
        response = requests.patch(
            f"{BASE_URL}/api/reservations/{reservation_id}/status",
            headers=manager_headers,
            json={"status": "Confirmée"}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            updated = response.json()
            print(f"✓ Statut changé: {updated['status']}")
        else:
            print(f"✗ Erreur: {response.text}")
else:
    print(f"✗ Erreur: {manager_login.text}")

# 11. Test: Supprimer la réservation de test
if reservation_id:
    print(f"\n11. TEST: Supprimer la réservation de test {reservation_id}")
    response = requests.delete(
        f"{BASE_URL}/api/reservations/{reservation_id}",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✓ {result['message']}")
    else:
        print(f"✗ Erreur: {response.text}")

print("\n" + "=" * 60)
print("TESTS TERMINÉS")
print("=" * 60)
