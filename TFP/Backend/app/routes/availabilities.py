"""
Routes pour la gestion des disponibilités de réservation par table
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

availabilities_bp = Blueprint('availabilities', __name__)

@availabilities_bp.route('/api/availabilities', methods=['GET'])
def get_availabilities():
    """Récupérer toutes les disponibilités ou filtrer par date/table"""
    try:
        availabilities = load_data('availabilities.json')
        
        # Filtrer par date si demandé
        date_filter = request.args.get('date')
        if date_filter:
            availabilities = [a for a in availabilities if a.get('date') == date_filter]
        
        # Filtrer par table si demandé
        table_filter = request.args.get('tableId')
        if table_filter:
            availabilities = [a for a in availabilities if a.get('tableId') == table_filter]
        
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


@availabilities_bp.route('/api/availabilities', methods=['POST'])
def create_availability():
    """Créer une nouvelle disponibilité (gérant seulement)"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Vérifier que c'est un gérant
        if not user_data or user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        
        # Validation
        required_fields = ['tableId', 'date', 'timeStart', 'timeEnd']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Charger les tables pour obtenir les infos
        tables = load_data('tables.json')
        table = next((t for t in tables if t.get('id') == data['tableId']), None)
        
        if not table:
            return jsonify({'error': 'Table non trouvée'}), 404
        
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
        
        availabilities = load_data('availabilities.json')
        availabilities.append(new_availability)
        save_data('availabilities.json', availabilities)
        
        return jsonify(new_availability), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de la disponibilité: {str(e)}")
        return jsonify({'error': str(e)}), 500


@availabilities_bp.route('/api/availabilities/<availability_id>', methods=['DELETE'])
def delete_availability(availability_id):
    """Supprimer une disponibilité (gérant seulement)"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Vérifier que c'est un gérant
        if not user_data or user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        availabilities = load_data('availabilities.json')
        availability_index = next((i for i, a in enumerate(availabilities) if a['id'] == availability_id), None)
        
        if availability_index is None:
            return jsonify({'error': 'Disponibilité non trouvée'}), 404
        
        deleted = availabilities.pop(availability_index)
        save_data('availabilities.json', availabilities)
        
        return jsonify({'message': 'Disponibilité supprimée', 'availability': deleted}), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de la disponibilité: {str(e)}")
        return jsonify({'error': str(e)}), 500
