"""
Scheduler pour tâches de maintenance automatiques.
Nettoie les conversations plus anciennes que 3 jours.
"""
import threading
import time
from datetime import datetime, timedelta
from app.utils.conversation_manager import clean_old_conversations
from app.models.database import load_data, save_data


def run_conversation_cleanup():
    """Nettoie les conversations périodiquement (toutes les 24h)."""
    while True:
        try:
            print(f"[{datetime.now().isoformat()}] Nettoyage automatique des conversations...")
            deleted_count = clean_old_conversations()
            print(f"[{datetime.now().isoformat()}] Nettoyage terminé: {deleted_count} conversation(s) supprimée(s)")
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Erreur nettoyage: {e}")
        
        # Attendre 24 heures avant le prochain nettoyage
        time.sleep(24 * 60 * 60)


def _parse_reservation_datetime(reservation):
    """Parse la date/heure d'une reservation en datetime UTC naive."""
    date_str = reservation.get('date')
    time_str = reservation.get('time') or '00:00'
    if not date_str:
        return None
    try:
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    except Exception:
        return None


def _send_reservation_reminders():
    """Envoie (log) des rappels 24h et 4h avant la reservation et marque comme envoyés."""
    try:
        reservations = load_data('reservations.json') or []
        now = datetime.utcnow()
        updated = False

        for res in reservations:
            status = str(res.get('status', '')).lower()
            if status.startswith('annul') or status.startswith('cancel'):
                continue

            res_dt = _parse_reservation_datetime(res)
            if not res_dt:
                continue

            hours_left = (res_dt - now).total_seconds() / 3600

            # Rappel 24h (fenêtre 23-25h) pour éviter les doublons
            if 23 <= hours_left <= 25 and not res.get('reminder_24h_sent'):
                print(f"[REMINDER 24H] Reservation {res.get('id')} pour {res.get('name', 'client')} dans ~24h")
                res['reminder_24h_sent'] = True
                updated = True

            # Rappel 4h (fenêtre 3.5-4.5h)
            if 3.5 <= hours_left <= 4.5 and not res.get('reminder_4h_sent'):
                print(f"[REMINDER 4H] Reservation {res.get('id')} pour {res.get('name', 'client')} dans ~4h")
                res['reminder_4h_sent'] = True
                updated = True

        if updated:
            save_data('reservations.json', reservations)
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Erreur rappel reservation: {e}")


def run_reservation_reminders():
    """Vérifie périodiquement les réservations pour envoyer des rappels."""
    while True:
        _send_reservation_reminders()
        # Vérification toutes les 15 minutes pour attraper les créneaux 24h/4h
        time.sleep(15 * 60)


def start_background_tasks():
    """Démarre les tâches de fond en arrière-plan."""
    # Lancer le nettoyage des conversations dans un thread séparé
    cleanup_thread = threading.Thread(target=run_conversation_cleanup, daemon=True)
    cleanup_thread.start()
    print("✓ Scheduler de nettoyage des conversations démarré (toutes les 24h)")

    # Lancer les rappels de reservation (toutes les 15 minutes)
    reminder_thread = threading.Thread(target=run_reservation_reminders, daemon=True)
    reminder_thread.start()
    print("✓ Scheduler de rappels réservation démarré (24h et 4h avant)")
