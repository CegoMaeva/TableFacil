"""
Routes pour la gestion des livraisons et preuves de livraison
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid
import base64
import os

deliveries_bp = Blueprint('deliveries', __name__)

DATA_DIR = 'app/data/deliveries'

# Ensure deliveries data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def init_deliveries_file():
    """Initialize deliveries.json if it doesn't exist"""
    try:
        load_data('deliveries.json')
    except:
        save_data('deliveries.json', [])

@deliveries_bp.route('/api/deliveries/<delivery_id>/proofs', methods=['POST'])
def upload_proof(delivery_id):
    """Upload photo/signature proof for a delivery"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Only drivers can upload proofs
        if not user_data or user_data.get('type') != 'livreur':
            return jsonify({'error': 'Accès réservé aux livreurs'}), 403
        
        data = request.get_json() or {}
        proof_type = data.get('type')  # 'photo', 'signature', 'qrcode'
        proof_data = data.get('data')  # base64 or text
        
        if not proof_type or not proof_data:
            return jsonify({'error': 'Type et data requis'}), 400
        
        # Load or create deliveries tracking file
        init_deliveries_file()
        deliveries = load_data('deliveries.json')
        
        # Find or create delivery record
        delivery = next((d for d in deliveries if d['id'] == delivery_id), None)
        if not delivery:
            delivery = {
                'id': delivery_id,
                'driver_id': user_data.get('user_id'),
                'proofs': [],
                'location': None,
                'created_at': datetime.now().isoformat()
            }
            deliveries.append(delivery)
        
        # Add proof
        proof = {
            'id': f"PROOF-{str(uuid.uuid4())[:8].upper()}",
            'type': proof_type,
            'data': proof_data[:100] if len(proof_data) > 100 else proof_data,  # Store truncated for reference
            'timestamp': datetime.now().isoformat()
        }
        delivery['proofs'].append(proof)
        delivery['updated_at'] = datetime.now().isoformat()
        
        save_data('deliveries.json', deliveries)
        
        return jsonify({'message': 'Preuve enregistrée', 'proof': proof}), 201
    
    except Exception as e:
        print(f"Erreur upload proof: {str(e)}")
        return jsonify({'error': str(e)}), 500


@deliveries_bp.route('/api/deliveries/<delivery_id>/location', methods=['POST'])
def update_location(delivery_id):
    """Update driver's current location"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        if not user_data or user_data.get('type') != 'livreur':
            return jsonify({'error': 'Accès réservé aux livreurs'}), 403
        
        data = request.get_json() or {}
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude et longitude requises'}), 400
        
        init_deliveries_file()
        deliveries = load_data('deliveries.json')
        
        delivery = next((d for d in deliveries if d['id'] == delivery_id), None)
        if not delivery:
            delivery = {
                'id': delivery_id,
                'driver_id': user_data.get('user_id'),
                'proofs': [],
                'location': None,
                'created_at': datetime.now().isoformat()
            }
            deliveries.append(delivery)
        
        delivery['location'] = {
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': datetime.now().isoformat()
        }
        delivery['updated_at'] = datetime.now().isoformat()
        
        save_data('deliveries.json', deliveries)
        
        return jsonify({'message': 'Position mise à jour', 'location': delivery['location']}), 200
    
    except Exception as e:
        print(f"Erreur update location: {str(e)}")
        return jsonify({'error': str(e)}), 500


@deliveries_bp.route('/api/deliveries/<delivery_id>/location', methods=['GET'])
def get_location(delivery_id):
    """Get driver's last known location"""
    try:
        init_deliveries_file()
        deliveries = load_data('deliveries.json')
        delivery = next((d for d in deliveries if d['id'] == delivery_id), None)
        
        if not delivery or not delivery.get('location'):
            return jsonify({'error': 'Position non trouvée'}), 404
        
        return jsonify(delivery['location']), 200
    
    except Exception as e:
        print(f"Erreur get location: {str(e)}")
        return jsonify({'error': str(e)}), 500


@deliveries_bp.route('/api/deliveries', methods=['GET'])
def get_deliveries():
    """Get all deliveries with tracking info (manager view)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Only managers can see all deliveries
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès réservé aux gérants'}), 403
        
        init_deliveries_file()
        deliveries = load_data('deliveries.json')
        
        return jsonify({'deliveries': deliveries}), 200
    
    except Exception as e:
        print(f"Erreur get deliveries: {str(e)}")
        return jsonify({'error': str(e)}), 500
