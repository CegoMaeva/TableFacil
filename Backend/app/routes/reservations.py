"""
Routes pour la gestion des réservations
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from app.utils.email_utils import send_reservation_confirmation
from datetime import datetime, timedelta
import uuid
from app.utils.email_utils import send_table_reserved_notification

reservations_bp = Blueprint('reservations', __name__)

@reservations_bp.route('/api/reservations/total', methods=['GET'])
def get_total_reservations():
    """Obtenir le nombre total de réservations"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        user_is_client = user_data.get('user_type') == 'client'
        user_id = user_data.get('id') or user_data.get('user_id')

        reservations = load_data('reservations.json')
        
        # Filtrer par client si c'est un client (employees et gérants voient tout)
        if user_is_client:
            reservations = [r for r in reservations if r.get('clientId') == user_id or r.get('userId') == user_id]
            # Cacher automatiquement les réservations annulées côté client
            reservations = [
                r for r in reservations
                if str(r.get('status', '')).lower() not in ['annulée', 'annulee', 'cancelled', 'canceled']
            ]
        
        # Statistiques par statut
        stats = {
            'total': len(reservations),
            'en_attente': len([r for r in reservations if r.get('status') == 'En attente']),
            'confirmee': len([r for r in reservations if r.get('status') == 'Confirmée']),
            'terminee': len([r for r in reservations if r.get('status') == 'Terminée']),
            'annulee': len([r for r in reservations if r.get('status') == 'Annulée'])
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Erreur lors du comptage des réservations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations', methods=['GET'])
def get_reservations():
    """Récupérer toutes les réservations ou filtrer par client/date/statut"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        user_id = user_data.get('id') or user_data.get('user_id')
        
        reservations = load_data('reservations.json')
        
        # Filtrer par client si c'est un client (employees et gérants voient tout)
        if user_data.get('user_type') == 'client':
            user_id = user_data.get('id') or user_data.get('user_id')
            reservations = [r for r in reservations if r.get('clientId') == user_id or r.get('userId') == user_id]
        
        # Filtrer par statut si demandé
        status_filter = request.args.get('status')
        if status_filter:
            reservations = [r for r in reservations if r.get('status') == status_filter]
        
        # Filtrer par date si demandé
        date_filter = request.args.get('date')
        if date_filter:
            reservations = [r for r in reservations if r.get('date') == date_filter]
        
        # Trier par date et heure
        reservations.sort(key=lambda x: f"{x.get('date', '')} {x.get('time', '')}", reverse=False)
        
        return jsonify(reservations), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des réservations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    """Récupérer une réservation spécifique"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        reservations = load_data('reservations.json')
        reservation = next((r for r in reservations if r['id'] == reservation_id), None)
        
        if not reservation:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        # Vérifier les permissions
        if user_data.get('user_type') == 'client' and reservation.get('clientId') != user_data.get('user_id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        return jsonify(reservation), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de la réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations', methods=['POST'])
def create_reservation():
    """Créer une nouvelle réservation avec vérification stricte de disponibilité"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        data = request.get_json()
        
        # Validation
        required_fields = ['customer', 'phone', 'email', 'date', 'time', 'guests', 'zone']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Validation du nombre de personnes
        if data['guests'] < 1 or data['guests'] > 20:
            return jsonify({'error': 'Le nombre de personnes doit être entre 1 et 20'}), 400
        
        # Validation de la zone
        valid_zones = ['Standard', 'VIP', 'Terrasse']
        if data['zone'] not in valid_zones:
            return jsonify({'error': f'Zone invalide. Choisissez parmi: {", ".join(valid_zones)}'}), 400
        
        # Trouver une table disponible (VÉRIFICATION STRICTE)
        tables = load_data('tables.json')
        reservations = load_data('reservations.json')
        
        # Filtrer les tables par zone et capacité
        suitable_tables = [
            t for t in tables 
            if t.get('zone') == data['zone'] 
            and t.get('capacity', 0) >= data['guests']
        ]
        
        if not suitable_tables:
            return jsonify({
                'error': f'Aucune table disponible dans la zone {data["zone"]} pour {data["guests"]} personnes'
            }), 400
        
        # Vérifier les tables déjà réservées pour cette date et heure (avec marge de 2h)
        reserved_table_ids = set()
        for r in reservations:
            if r.get('date') == data['date'] and r.get('status') in ['En attente', 'Confirmée']:
                # Calculer si les créneaux se chevauchent (2h par réservation)
                r_time = r.get('time', '00:00')
                new_time = data['time']
                # Conversion en minutes pour comparaison
                r_minutes = int(r_time.split(':')[0]) * 60 + int(r_time.split(':')[1])
                new_minutes = int(new_time.split(':')[0]) * 60 + int(new_time.split(':')[1])
                # Chevauchement si moins de 2h d'écart
                if abs(r_minutes - new_minutes) < 120:  # 120 minutes = 2h
                    reserved_table_ids.add(r.get('table'))

        # Bloquer tables selon disponibilités existantes (3h avant/après)
        availabilities = load_data('availabilities.json')
        try:
            req_dt = datetime.strptime(f"{data['date']} {data['time']}", "%Y-%m-%d %H:%M")
        except Exception:
            req_dt = None

        def time_overlap(av_start: str, av_end: str, center_dt: datetime, buffer_minutes: int = 180) -> bool:
            try:
                av_s = datetime.strptime(f"{data['date']} {av_start}", "%Y-%m-%d %H:%M")
                av_e = datetime.strptime(f"{data['date']} {av_end}", "%Y-%m-%d %H:%M")
                window_s = center_dt - timedelta(minutes=buffer_minutes)
                window_e = center_dt + timedelta(minutes=buffer_minutes)
                return not (av_e <= window_s or av_s >= window_e)
            except Exception:
                return False

        if req_dt:
            for a in availabilities:
                if a.get('date') == data['date'] and a.get('status') == 'reserved':
                    if time_overlap(a.get('timeStart'), a.get('timeEnd'), req_dt, 180):
                        reserved_table_ids.add(a.get('tableId'))
        
        # Tables disponibles
        available_tables = [
            t for t in suitable_tables 
            if t.get('id') not in reserved_table_ids
        ]

        # If client requested a specific table (from floor plan click), try to honor it
        requested_table_id = data.get('table') or data.get('tableId')
        if requested_table_id:
            requested = next((t for t in available_tables if t.get('id') == requested_table_id), None)
            if not requested:
                return jsonify({
                    'error': f'Table {requested_table_id} non disponible pour {data["date"]} à {data["time"]}'
                }), 400
            assigned_table = requested
        else:
            if not available_tables:
                return jsonify({
                    'error': f'Toutes les tables de la zone {data["zone"]} sont réservées pour {data["date"]} à {data["time"]}',
                    'suggestion': 'Essayez un autre horaire ou une autre zone'
                }), 400

            # Assigner la table avec la capacité la plus proche du nombre de personnes
            available_tables.sort(key=lambda t: t.get('capacity', 0))
            assigned_table = available_tables[0]
        
        # Calculer l'acompte (25% du prix moyen par personne)
        price_per_person = 15000  # 15000 FCFA par personne
        deposit_amount = int(data['guests'] * price_per_person * 0.25)  # 25% d'acompte
        
        # Générer un ID unique
        reservation_id = f"RES-{str(uuid.uuid4())[:8].upper()}"
        
        # Créer la réservation (statut initial: En attente de paiement)
        new_reservation = {
            'id': reservation_id,
            'clientId': user_data.get('user_id'),
            'customer': data['customer'],
            'phone': data['phone'],
            'email': data['email'],
            'date': data['date'],
            'time': data['time'],
            'guests': data['guests'],
            'table': assigned_table['id'],
            'zone': data['zone'],
            'status': 'En attente',  # Changera à "Confirmée" après paiement
            'depositAmount': deposit_amount,
            'depositStatus': 'pending',  # "pending" | "paid" | "refunded" | "forfeited"
            'depositPaidAt': None,
            'attended': None,  # True si présent, False si absent, None si pas encore passé
            'notes': data.get('notes', ''),
            'occasion': data.get('occasion'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'createdBy': user_data.get('name', '')
        }
        
        reservations.append(new_reservation)
        save_data('reservations.json', reservations)
        
        # Envoyer l'email de confirmation au client
        send_reservation_confirmation(
            to_email=data['email'],
            customer_name=data['customer'],
            reservation=new_reservation
        )
        
        return jsonify({
            'message': 'Réservation créée. Veuillez payer l\'acompte pour confirmer.',
            'reservation': new_reservation,
            'assignedTable': {
                'id': assigned_table['id'],
                'number': assigned_table['number'],
                'capacity': assigned_table['capacity']
            },
            'depositRequired': deposit_amount
        }), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de la réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>', methods=['PUT'])
def update_reservation(reservation_id):
    """Mettre à jour une réservation"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier les permissions
        if user_data.get('user_type') == 'client':
            if reservation.get('clientId') != user_data.get('user_id'):
                return jsonify({'error': 'Accès non autorisé'}), 403
            # Les clients ne peuvent modifier que certains champs
            allowed_fields = ['date', 'time', 'guests', 'phone', 'email', 'zone', 'notes', 'occasion']
        else:
            # Les managers peuvent modifier tous les champs
            allowed_fields = ['customer', 'date', 'time', 'guests', 'phone', 'email', 'status', 'table', 'zone', 'notes', 'occasion']
        
        data = request.get_json()
        
        # Mise à jour des champs
        for field in allowed_fields:
            if field in data:
                reservation[field] = data[field]
        
        reservation['updatedAt'] = datetime.now().isoformat()
        
        reservations[reservation_index] = reservation
        save_data('reservations.json', reservations)
        
        return jsonify(reservation), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de la réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/status', methods=['PATCH'])
def update_reservation_status(reservation_id):
    """Mettre à jour le statut d'une réservation"""
    try:
        # Vérifier le token et les permissions manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'serveur', 'service_client']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Statut requis'}), 400
        
        # Mapper les statuts anglais vers français et vice-versa
        status_mapping = {
            'pending': 'En attente',
            'confirmed': 'Confirmée',
            'cancelled': 'Annulée',
            'completed': 'Terminée',
            'en attente': 'En attente',
            'confirmée': 'Confirmée',
            'annulée': 'Annulée',
            'terminée': 'Terminée'
        }
        
        # Convertir le statut s'il existe dans le mapping, sinon le garder
        mapped_status = status_mapping.get(new_status.lower(), new_status)
        
        valid_statuses = ['En attente', 'Confirmée', 'Annulée', 'Terminée']
        if mapped_status not in valid_statuses:
            return jsonify({'error': f'Statut invalide. Statuts valides: {", ".join(valid_statuses)}'}), 400
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservations[reservation_index]['status'] = mapped_status
        reservations[reservation_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('reservations.json', reservations)
        
        return jsonify(reservations[reservation_index]), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du statut: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/cancel', methods=['POST'])
def cancel_reservation(reservation_id):
    """Annuler une réservation (change le statut à 'cancelled')"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier les permissions - le client peut annuler sa propre réservation
        user_id = user_data.get('id') or user_data.get('user_id')
        if user_data.get('user_type') == 'client' and reservation.get('clientId') != user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Marquer comme annulée
        reservation['status'] = 'Annulée'
        reservation['updatedAt'] = datetime.now().isoformat()
        reservations[reservation_index] = reservation
        save_data('reservations.json', reservations)
        
        return jsonify({'success': True, 'message': 'Réservation annulée avec succès', 'reservation': reservation}), 200
        
    except Exception as e:
        print(f"Erreur lors de l'annulation de la réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>', methods=['DELETE'])
def delete_reservation(reservation_id):
    """Supprimer/Annuler une réservation"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        user_id = user_data.get('id') or user_data.get('user_id')
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier les permissions
        if user_data.get('user_type') == 'client' and reservation.get('clientId') != user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Les clients ne peuvent annuler que les réservations futures
        if user_data.get('user_type') == 'client':
            reservation['status'] = 'Annulée'
            reservation['updatedAt'] = datetime.now().isoformat()
            reservations[reservation_index] = reservation
            save_data('reservations.json', reservations)
            return jsonify({'message': 'Réservation annulée', 'reservation': reservation}), 200
        
        # Les managers peuvent supprimer complètement
        deleted_reservation = reservations.pop(reservation_index)
        save_data('reservations.json', reservations)
        
        return jsonify({'message': 'Réservation supprimée', 'reservation': deleted_reservation}), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de la réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/available-times', methods=['GET'])
def get_available_times():
    """Récupérer les horaires disponibles pour une date donnée"""
    try:
        date = request.args.get('date')
        if not date:
            return jsonify({'error': 'Date requise'}), 400
        
        # Horaires d'ouverture du restaurant
        opening_times = [
            '12:00', '12:30', '13:00', '13:30', '14:00',
            '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
        ]
        
        # Charger les réservations pour cette date
        reservations = load_data('reservations.json')
        reserved_times = [
            r['time'] for r in reservations 
            if r.get('date') == date and r.get('status') in ['pending', 'confirmed', 'seated']
        ]
        
        # Filtrer les horaires disponibles (simple: un créneau = une table)
        # Dans une vraie app, on gérerait plusieurs tables
        available_times = [t for t in opening_times if t not in reserved_times]
        
        return jsonify({'date': date, 'availableTimes': available_times}), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des horaires: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/admin/availability', methods=['POST'])
def add_availability_slot():
    """Ajouter une disponibilité pour une table (gérant uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401

        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403

        data = request.get_json() or {}
        
        # Champs requis
        required = ['tableId', 'date', 'timeStart', 'timeEnd']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400

        # Charger les tables pour valider et obtenir les infos
        tables = load_data('tables.json')
        table = next((t for t in tables if t.get('id') == data['tableId']), None)
        
        if not table:
            return jsonify({'error': 'Table non trouvée'}), 404

        # Charger les disponibilités
        availabilities = load_data('availabilities.json')

        # Vérifier qu'il n'y a pas de chevauchement
        for avail in availabilities:
            if avail.get('tableId') == data['tableId'] and avail.get('date') == data['date']:
                if not (data['timeEnd'] <= avail.get('timeStart') or data['timeStart'] >= avail.get('timeEnd')):
                    return jsonify({'error': 'Cette table a déjà une disponibilité à cet horaire'}), 409

        # Créer la disponibilité
        availability_id = f"AVL-{str(uuid.uuid4())[:6].upper()}"
        
        new_availability = {
            'id': availability_id,
            'tableId': data['tableId'],
            'tableNumber': table.get('number'),
            'date': data['date'],
            'timeStart': data['timeStart'],
            'timeEnd': data['timeEnd'],
            'status': 'available',
            'capacity': table.get('capacity'),
            'zone': table.get('zone'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }

        availabilities.append(new_availability)
        save_data('availabilities.json', availabilities)

        return jsonify({'message': 'Disponibilité ajoutée', 'availability': new_availability}), 201

    except Exception as e:
        print(f"Erreur lors de l'ajout de disponibilité: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/admin/availability', methods=['GET'])
def list_availability_slots():
    """Lister les disponibilités"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401

        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin', 'service_client', 'client']:
            return jsonify({'error': 'Accès non autorisé'}), 403

        availabilities = load_data('availabilities.json') or []
        
        # Filtrer par date si demandé
        date_filter = request.args.get('date')
        if date_filter:
            availabilities = [a for a in availabilities if a.get('date') == date_filter]
        
        # Filtrer par statut si demandé
        status_filter = request.args.get('status')
        if status_filter:
            availabilities = [a for a in availabilities if a.get('status') == status_filter]
        
        # Trier par date et heure
        availabilities.sort(key=lambda x: (x.get('date', ''), x.get('timeStart', '')))
        
        return jsonify(availabilities), 200

    except Exception as e:
        print(f"Erreur lors de la récupération des disponibilités: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/admin/create', methods=['POST'])
def admin_create_reservation():
    """Permettre au gérant/service client de créer une réservation basée sur une disponibilité"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401

        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin', 'service_client']:
            return jsonify({'error': 'Accès non autorisé'}), 403

        data = request.get_json() or {}

        # Champs requis
        required_fields = ['customer', 'phone', 'availabilityId', 'guests']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400

        # Valider la disponibilité
        availabilities = load_data('availabilities.json')
        availability = next((a for a in availabilities if a.get('id') == data['availabilityId']), None)
        
        if not availability:
            return jsonify({'error': 'Disponibilité non trouvée'}), 404
        
        if availability.get('status') != 'available':
            return jsonify({'error': 'Cette disponibilité n\'est plus disponible'}), 409
        
        if availability.get('capacity', 0) < data['guests']:
            return jsonify({'error': f'Cette table ne peut accueillir que {availability.get("capacity")} personnes'}), 400

        # Rechercher le client par téléphone
        users = load_data('users.json').get('users', [])
        client_id = None
        if data.get('phone'):
            found = next((u for u in users if u.get('phone') == data.get('phone')), None)
            if found:
                client_id = found.get('id')

        # Créer la réservation
        price_per_person = 15000
        deposit_amount = int(data['guests'] * price_per_person * 0.25)

        reservation_id = f"RES-{str(uuid.uuid4())[:8].upper()}"

        new_reservation = {
            'id': reservation_id,
            'clientId': client_id,
            'customer': data['customer'],
            'phone': data['phone'],
            'email': data.get('email'),
            'date': availability.get('date'),
            'time': availability.get('timeStart'),
            'guests': data['guests'],
            'table': availability.get('tableId'),
            'tableNumber': availability.get('tableNumber'),
            'zone': availability.get('zone'),
            'status': data.get('auto_confirm') and 'Confirmée' or 'En attente',
            'depositAmount': deposit_amount,
            'depositStatus': data.get('auto_confirm') and 'paid' or 'pending',
            'depositPaidAt': data.get('auto_confirm') and datetime.now().isoformat() or None,
            'paymentMethod': data.get('payment_method'),
            'attended': None,
            'notes': data.get('notes', ''),
            'occasion': data.get('occasion'),
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'createdBy': '',
            'availabilityId': data['availabilityId']
        }

        # Mettre à jour le statut de la disponibilité
        for avail in availabilities:
            if avail.get('id') == data['availabilityId']:
                avail['status'] = 'reserved'
                avail['reservationId'] = reservation_id
                avail['updatedAt'] = datetime.now().isoformat()
                break

        # Sauvegarder
        reservations = load_data('reservations.json')
        reservations.append(new_reservation)
        
        save_data('reservations.json', reservations)
        save_data('availabilities.json', availabilities)

        return jsonify({
            'message': 'Réservation créée avec succès',
            'reservation': new_reservation
        }), 201

    except Exception as e:
        print(f"Erreur lors de la création de réservation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/pay-deposit', methods=['POST'])
def pay_deposit(reservation_id):
    """Confirmer le paiement de l'acompte"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        data = request.get_json()
        payment_method = data.get('paymentMethod')  # 'card' ou 'paypal'
        payment_id = data.get('paymentId')  # ID de transaction PayPal ou carte
        payment_details = data.get('paymentDetails', {})  # Détails complets du paiement
        notes = data.get('notes', '')
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier que c'est le bon client
        if reservation.get('clientId') != user_data.get('user_id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Vérifier que l'acompte n'est pas déjà payé
        if reservation.get('depositStatus') == 'paid':
            return jsonify({'error': 'Acompte déjà payé'}), 400
        
        # Mettre à jour le statut de paiement avec tous les détails (comme pour les commandes)
        reservations[reservation_index]['depositStatus'] = 'paid'
        reservations[reservation_index]['depositPaidAt'] = datetime.now().isoformat()
        reservations[reservation_index]['paymentMethod'] = payment_method
        reservations[reservation_index]['paymentId'] = payment_id
        reservations[reservation_index]['paymentDetails'] = payment_details
        if notes:
            reservations[reservation_index]['paymentNotes'] = notes
        
        # IMPORTANT : Le statut reste "En attente" jusqu'à validation manuelle du gérant
        # reservations[reservation_index]['status'] = 'Confirmée'  # ← Commenté
        reservations[reservation_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('reservations.json', reservations)
        
        # Ajouter les points de loyauté après paiement de l'acompte
        client_id = reservation.get('clientId')
        if client_id:
            loyalty_records = load_data('loyalty.json') or []
            user_loyalty = next((l for l in loyalty_records if l.get('userId') == client_id), None)
            
            # Calculer les points gagnés (1 point pour 100 FCFA de l'acompte)
            deposit_amount = reservation.get('depositAmount', 0)
            points_earned = int(deposit_amount / 100)
            
            if user_loyalty:
                # Ajouter les points à un client existant
                user_loyalty['points'] = user_loyalty.get('points', 0) + points_earned
                user_loyalty['totalSpent'] = user_loyalty.get('totalSpent', 0) + deposit_amount
                user_loyalty['reservationCount'] = user_loyalty.get('reservationCount', 0) + 1
                user_loyalty['lastReservationDate'] = datetime.now().isoformat()
                user_loyalty['lastReservationId'] = reservation_id
            else:
                # Créer un nouveau profil de loyauté
                user_loyalty = {
                    'id': str(uuid.uuid4()),
                    'userId': client_id,
                    'points': points_earned,
                    'totalSpent': deposit_amount,
                    'reservationCount': 1,
                    'orderCount': 0,
                    'createdAt': datetime.now().isoformat(),
                    'lastReservationDate': datetime.now().isoformat(),
                    'lastReservationId': reservation_id,
                    'level': 'Bronze'
                }
                loyalty_records.append(user_loyalty)
            
            # Déterminer le niveau basé sur les points
            points = user_loyalty.get('points', 0)
            if points >= 2000:
                user_loyalty['level'] = 'Platinum'
            elif points >= 1000:
                user_loyalty['level'] = 'Gold'
            elif points >= 500:
                user_loyalty['level'] = 'Silver'
            else:
                user_loyalty['level'] = 'Bronze'
            
            # Sauvegarder les données de loyauté
            loyalty_records = [l for l in loyalty_records if l.get('userId') != client_id]
            loyalty_records.append(user_loyalty)
            save_data('loyalty.json', loyalty_records)

        # --- Mark related availability as reserved or create a reserved block +/-3h ---
        reservation = reservations[reservation_index]
        availabilities = load_data('availabilities.json')
        linked_avail_id = reservation.get('availabilityId')
        availability_updated = False

        if linked_avail_id:
            for a in availabilities:
                if a.get('id') == linked_avail_id:
                    a['status'] = 'reserved'
                    a['reservationId'] = reservation_id
                    a['updatedAt'] = datetime.now().isoformat()
                    availability_updated = True
                    break
        else:
            # create a reserved availability spanning -3h / +3h around reservation time to block conflicts
            try:
                res_dt = datetime.strptime(f"{reservation.get('date')} {reservation.get('time')}", "%Y-%m-%d %H:%M")
                start_dt = (res_dt - timedelta(hours=3))
                end_dt = (res_dt + timedelta(hours=3))
                timeStart = start_dt.strftime("%H:%M")
                timeEnd = end_dt.strftime("%H:%M")
                new_av_id = f"AVL-{str(uuid.uuid4())[:6].upper()}"
                new_av = {
                    'id': new_av_id,
                    'tableId': reservation.get('table'),
                    'tableNumber': reservation.get('tableNumber') or reservation.get('table'),
                    'date': reservation.get('date'),
                    'timeStart': timeStart,
                    'timeEnd': timeEnd,
                    'status': 'reserved',
                    'capacity': reservation.get('guests'),
                    'zone': reservation.get('zone'),
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat(),
                    'reservationId': reservation_id
                }

                # check overlaps: if overlap exists, still create block but we'll notify service client
                availabilities.append(new_av)
                reservation['availabilityId'] = new_av_id
                availability_updated = True
            except Exception as e:
                print(f"Erreur création bloc disponibilité: {e}")

        # save availabilities (if changed)
        if availability_updated:
            save_data('availabilities.json', availabilities)
            # also save reservation change (availabilityId)
            reservations[reservation_index] = reservation
            save_data('reservations.json', reservations)

        # --- Send notification to service client / manager to mark the table ---
        # Try to read settings.json directly to get configured notification email
        try:
            import os, json
            settings_path = os.path.join('data', 'settings.json')
            if os.path.exists(settings_path):
                with open(settings_path, 'r', encoding='utf-8') as sf:
                    settings_obj = json.load(sf)
                    notify_email = settings_obj.get('notificationEmail')
            else:
                notify_email = None
        except Exception:
            notify_email = None

        if not notify_email:
            notify_email = 'manager@tablefacil.sn'

        try:
            send_table_reserved_notification(notify_email, reservation, reservation.get('tableNumber') or reservation.get('table'))
        except Exception as e:
            print(f"Erreur lors de l'envoi de notification réservation: {e}")
        
        # Log du paiement pour audit
        print(f"Paiement acompte réservation {reservation_id}:")
        print(f"  - Méthode: {payment_method}")
        print(f"  - Payment ID: {payment_id}")
        print(f"  - Client: {user_data.get('username')}")
        print(f"  - Montant: {reservation.get('depositAmount', 0)} FCFA")
        
        return jsonify({
            'message': 'Acompte payé avec succès. Votre réservation est en attente de validation par le restaurant.',
            'reservation': reservations[reservation_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du paiement de l'acompte: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/approve', methods=['PATCH'])
def approve_reservation(reservation_id):
    """Approuver une réservation (gérant uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin', 'service_client']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier que la réservation est en attente
        if reservation.get('status') not in ['En attente']:
            return jsonify({'error': f'Cette réservation a déjà été traitée (statut: {reservation.get("status")})'}), 400
        
        # Approuver la réservation
        reservations[reservation_index]['status'] = 'Confirmée'
        reservations[reservation_index]['approvedBy'] = user_data.get('username', user_data.get('name', ''))
        reservations[reservation_index]['approvedAt'] = datetime.now().isoformat()
        reservations[reservation_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('reservations.json', reservations)
        
        print(f"Réservation {reservation_id} approuvée par {user_data.get('username')}")
        
        return jsonify({
            'message': 'Réservation approuvée avec succès',
            'reservation': reservations[reservation_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de l'approbation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/reject', methods=['PATCH'])
def reject_reservation(reservation_id):
    """Rejeter une réservation (gérant uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin', 'service_client']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        reason = data.get('reason', 'Non spécifiée')
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier que la réservation peut être rejetée
        if reservation.get('status') not in ['En attente', 'Confirmée']:
            return jsonify({'error': f'Cette réservation ne peut pas être rejetée (statut: {reservation.get("status")})'}), 400
        
        # Rejeter la réservation
        reservations[reservation_index]['status'] = 'Annulée'
        reservations[reservation_index]['rejectedBy'] = user_data.get('username', user_data.get('name', ''))
        reservations[reservation_index]['rejectedAt'] = datetime.now().isoformat()
        reservations[reservation_index]['rejectionReason'] = reason
        reservations[reservation_index]['updatedAt'] = datetime.now().isoformat()
        
        # Si acompte payé, marquer pour remboursement
        if reservation.get('depositStatus') == 'paid':
            reservations[reservation_index]['depositStatus'] = 'refunded'
        
        save_data('reservations.json', reservations)
        
        print(f"Réservation {reservation_id} rejetée par {user_data.get('username')}: {reason}")
        
        return jsonify({
            'message': 'Réservation rejetée',
            'reservation': reservations[reservation_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du rejet: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reservations_bp.route('/api/reservations/<reservation_id>/mark-attended', methods=['PATCH'])
def mark_attended(reservation_id):
    """Marquer si le client s'est présenté (gérant uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin', 'service_client']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        attended = data.get('attended')  # True ou False
        
        if attended is None:
            return jsonify({'error': 'Champ attended requis (true/false)'}), 400
        
        reservations = load_data('reservations.json')
        reservation_index = next((i for i, r in enumerate(reservations) if r['id'] == reservation_id), None)
        
        if reservation_index is None:
            return jsonify({'error': 'Réservation non trouvée'}), 404
        
        reservation = reservations[reservation_index]
        
        # Vérifier que l'acompte est payé
        if reservation.get('depositStatus') != 'paid':
            return jsonify({'error': 'Acompte non payé'}), 400
        
        # Mettre à jour le statut
        reservations[reservation_index]['attended'] = attended
        reservations[reservation_index]['status'] = 'Terminée'
        reservations[reservation_index]['updatedAt'] = datetime.now().isoformat()
        
        # Gestion de l'acompte
        if attended:
            # Client présent → acompte remboursé (ou déduit de la facture)
            reservations[reservation_index]['depositStatus'] = 'refunded'
            message = 'Client marqué présent. Acompte remboursé/déduit de la facture.'
        else:
            # Client absent → acompte conservé
            reservations[reservation_index]['depositStatus'] = 'forfeited'
            message = 'Client marqué absent. Acompte conservé par le restaurant.'
        
        save_data('reservations.json', reservations)
        
        return jsonify({
            'message': message,
            'reservation': reservations[reservation_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur lors du marquage de présence: {str(e)}")
        return jsonify({'error': str(e)}), 500
