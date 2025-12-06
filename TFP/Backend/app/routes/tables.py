"""
Routes pour la gestion des tables et du plan du restaurant
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime, timedelta
import uuid

tables_bp = Blueprint('tables', __name__)

@tables_bp.route('/api/tables', methods=['GET'])
def get_all_tables():
    """Récupérer toutes les tables du restaurant"""
    try:
        tables = load_data('tables.json')
        
        # Mettre à jour le statut des tables en fonction des réservations
        reservations = load_data('reservations.json')
        
        # Obtenir la date et l'heure actuelles
        date_filter = request.args.get('date')
        time_filter = request.args.get('time')
        
        if date_filter and time_filter:
            # Filtrer les réservations pour la date et l'heure spécifiées
            for table in tables:
                table_reservations = [
                    r for r in reservations 
                    if r.get('table') == table['id'] 
                    and r.get('date') == date_filter
                    and r.get('status') in ['En attente', 'Confirmée']
                ]
                
                # Trouver toutes les réservations qui chevauchent l'heure demandée
                matching_reservations = []
                if table_reservations:
                    # Parse l'heure demandée
                    try:
                        time_parts = time_filter.split(':')
                        filter_minutes = int(time_parts[0]) * 60 + int(time_parts[1])
                        
                        for res in table_reservations:
                            res_time = res.get('time', '')
                            if res_time:
                                res_parts = res_time.split(':')
                                res_minutes = int(res_parts[0]) * 60 + int(res_parts[1])
                                
                                # Chevauchement si moins de 2h d'écart (120 minutes)
                                if abs(res_minutes - filter_minutes) < 120:
                                    matching_reservations.append(res)
                    except (ValueError, IndexError):
                        # Si erreur de parsing, on prend toutes les réservations du jour
                        matching_reservations = table_reservations
                
                # Mettre à jour le statut de la table
                if matching_reservations:
                    table['status'] = 'reserved'
                    table['currentReservation'] = matching_reservations[0]  # Pour compatibilité
                    table['currentReservations'] = matching_reservations  # TOUTES les réservations
                    table['reservationCount'] = len(matching_reservations)
                else:
                    table['status'] = 'available'
                    table['currentReservation'] = None
                    table['currentReservations'] = []
                    table['reservationCount'] = 0
        
        # Filtrer par zone si demandé
        zone_filter = request.args.get('zone')
        if zone_filter:
            tables = [t for t in tables if t.get('zone') == zone_filter]
        
        return jsonify(tables), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des tables: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables/<table_id>', methods=['GET'])
def get_table(table_id):
    """Récupérer une table spécifique"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        tables = load_data('tables.json')
        table = next((t for t in tables if t['id'] == table_id), None)
        
        if not table:
            return jsonify({'error': 'Table non trouvée'}), 404
        
        return jsonify(table), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de la table: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables', methods=['POST'])
def create_table():
    """Créer une nouvelle table (Admin uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        
        # Validation
        required_fields = ['number', 'zone', 'capacity', 'position']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Générer un ID unique
        table_id = f"T{data['number'].zfill(2)}"
        
        # Créer la table
        new_table = {
            'id': table_id,
            'number': data['number'],
            'zone': data['zone'],
            'capacity': data['capacity'],
            'position': data['position'],
            'shape': data.get('shape', 'square'),
            'status': 'available',
            'currentReservation': None
        }
        
        tables = load_data('tables.json')
        
        # Vérifier si la table existe déjà
        if any(t['id'] == table_id for t in tables):
            return jsonify({'error': 'Cette table existe déjà'}), 400
        
        tables.append(new_table)
        save_data('tables.json', tables)
        
        return jsonify({'message': 'Table créée avec succès', 'table': new_table}), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de la table: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables/<table_id>', methods=['PUT'])
def update_table(table_id):
    """Modifier une table (Admin uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        tables = load_data('tables.json')
        table_index = next((i for i, t in enumerate(tables) if t['id'] == table_id), None)
        
        if table_index is None:
            return jsonify({'error': 'Table non trouvée'}), 404
        
        data = request.get_json()
        table = tables[table_index]
        
        # Mettre à jour les champs
        allowed_fields = ['number', 'zone', 'capacity', 'position', 'shape', 'status']
        for field in allowed_fields:
            if field in data:
                table[field] = data[field]
        
        tables[table_index] = table
        save_data('tables.json', tables)
        
        return jsonify({'message': 'Table mise à jour', 'table': table}), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de la table: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables/<table_id>', methods=['DELETE'])
def delete_table(table_id):
    """Supprimer une table (Admin uniquement)"""
    try:
        # Vérifier le token et les permissions
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        tables = load_data('tables.json')
        table_index = next((i for i, t in enumerate(tables) if t['id'] == table_id), None)
        
        if table_index is None:
            return jsonify({'error': 'Table non trouvée'}), 404
        
        deleted_table = tables.pop(table_index)
        save_data('tables.json', tables)
        
        return jsonify({'message': 'Table supprimée', 'table': deleted_table}), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de la table: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables/availability', methods=['GET'])
def check_availability():
    """Vérifier la disponibilité des tables pour une date, heure et nombre de personnes"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        # Paramètres
        date = request.args.get('date')
        time = request.args.get('time')
        guests = request.args.get('guests', type=int)
        zone = request.args.get('zone')
        
        if not date or not time or not guests:
            return jsonify({'error': 'Paramètres date, time et guests requis'}), 400
        
        tables = load_data('tables.json')
        reservations = load_data('reservations.json')
        
        # Filtrer par zone si spécifiée
        if zone:
            tables = [t for t in tables if t.get('zone') == zone]
        
        # Filtrer les tables par capacité (capacité >= nombre de personnes)
        suitable_tables = [t for t in tables if t.get('capacity', 0) >= guests]
        
        # Vérifier les réservations existantes pour cette date et heure
        reserved_table_ids = [
            r.get('table') for r in reservations
            if r.get('date') == date 
            and r.get('time') == time
            and r.get('status') in ['En attente', 'Confirmée']
        ]
        
        # Tables disponibles
        available_tables = [
            t for t in suitable_tables 
            if t.get('id') not in reserved_table_ids
        ]
        
        return jsonify({
            'date': date,
            'time': time,
            'guests': guests,
            'zone': zone,
            'availableTables': available_tables,
            'totalAvailable': len(available_tables)
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la vérification de disponibilité: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tables_bp.route('/api/tables/stats', methods=['GET'])
def get_table_stats():
    """Obtenir les statistiques des tables"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        tables = load_data('tables.json')
        
        # Statistiques par zone
        zones = {}
        for table in tables:
            zone = table.get('zone', 'Unknown')
            if zone not in zones:
                zones[zone] = {
                    'count': 0,
                    'totalCapacity': 0,
                    'tables': []
                }
            zones[zone]['count'] += 1
            zones[zone]['totalCapacity'] += table.get('capacity', 0)
            zones[zone]['tables'].append(table['id'])
        
        total_capacity = sum(t.get('capacity', 0) for t in tables)
        
        return jsonify({
            'totalTables': len(tables),
            'totalCapacity': total_capacity,
            'zones': zones
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {str(e)}")
        return jsonify({'error': str(e)}), 500
