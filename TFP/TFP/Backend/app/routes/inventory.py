"""
Routes pour la gestion de l'inventaire
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

inventory_bp = Blueprint('inventory', __name__)

def check_manager_permission(token):
    """Vérifier que l'utilisateur est un gérant"""
    user_data = verify_token(token)
    # Vérifier si verify_token a retourné une erreur (tuple)
    if isinstance(user_data, tuple):
        return user_data
    if not user_data or user_data.get('role') != 'gerant':
        return None
    return user_data

@inventory_bp.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Récupérer tout l'inventaire"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        inventory = load_data('inventory.json')
        
        # Filtrer par catégorie si demandé
        category = request.args.get('category')
        if category:
            inventory = [item for item in inventory if item.get('category') == category]
        
        # Identifier les items avec stock faible
        for item in inventory:
            item['lowStock'] = item.get('quantity', 0) < item.get('minQuantity', 0)
        
        return jsonify(inventory), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de l'inventaire: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/low-stock', methods=['GET'])
def get_low_stock():
    """Récupérer les items avec stock faible"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        inventory = load_data('inventory.json')
        low_stock_items = [
            {**item, 'lowStock': True} 
            for item in inventory 
            if item.get('quantity', 0) < item.get('minQuantity', 0)
        ]
        
        return jsonify(low_stock_items), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération du stock faible: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/<item_id>', methods=['GET'])
def get_inventory_item(item_id):
    """Récupérer un item spécifique"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        inventory = load_data('inventory.json')
        item = next((i for i in inventory if i['id'] == item_id), None)
        
        if not item:
            return jsonify({'error': 'Item non trouvé'}), 404
        
        item['lowStock'] = item.get('quantity', 0) < item.get('minQuantity', 0)
        
        return jsonify(item), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de l'item: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory', methods=['POST'])
def create_inventory_item():
    """Créer un nouvel item d'inventaire"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'category', 'unit', 'quantity', 'minQuantity', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Générer un ID unique
        item_id = f"INV-{str(uuid.uuid4())[:8].upper()}"
        
        # Créer l'item
        new_item = {
            'id': item_id,
            'name': data['name'],
            'category': data['category'],
            'unit': data['unit'],
            'quantity': data['quantity'],
            'minQuantity': data['minQuantity'],
            'price': data['price'],
            'supplier': data.get('supplier', ''),
            'lastRestocked': datetime.now().isoformat()
        }
        
        inventory = load_data('inventory.json')
        inventory.append(new_item)
        save_data('inventory.json', inventory)
        
        return jsonify(new_item), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de l'item: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/<item_id>', methods=['PUT'])
def update_inventory_item(item_id):
    """Mettre à jour un item d'inventaire"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        inventory = load_data('inventory.json')
        item_index = next((i for i, item in enumerate(inventory) if item['id'] == item_id), None)
        
        if item_index is None:
            return jsonify({'error': 'Item non trouvé'}), 404
        
        data = request.get_json()
        item = inventory[item_index]
        
        # Mise à jour des champs
        allowed_fields = ['name', 'category', 'unit', 'quantity', 'minQuantity', 'price', 'supplier']
        for field in allowed_fields:
            if field in data:
                item[field] = data[field]
        
        # Mettre à jour lastRestocked si la quantité augmente
        if 'quantity' in data and data['quantity'] > inventory[item_index].get('quantity', 0):
            item['lastRestocked'] = datetime.now().isoformat()
        
        inventory[item_index] = item
        save_data('inventory.json', inventory)
        
        return jsonify(item), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'item: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/<item_id>/adjust', methods=['PATCH'])
def adjust_inventory(item_id):
    """Ajuster la quantité d'un item (ajout ou retrait)"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        adjustment = data.get('adjustment')
        
        if adjustment is None:
            return jsonify({'error': 'Ajustement requis'}), 400
        
        inventory = load_data('inventory.json')
        item_index = next((i for i, item in enumerate(inventory) if item['id'] == item_id), None)
        
        if item_index is None:
            return jsonify({'error': 'Item non trouvé'}), 404
        
        item = inventory[item_index]
        new_quantity = item.get('quantity', 0) + adjustment
        
        if new_quantity < 0:
            return jsonify({'error': 'La quantité ne peut pas être négative'}), 400
        
        item['quantity'] = new_quantity
        
        # Si c'est un ajout, mettre à jour lastRestocked
        if adjustment > 0:
            item['lastRestocked'] = datetime.now().isoformat()
        
        inventory[item_index] = item
        save_data('inventory.json', inventory)
        
        return jsonify(item), 200
        
    except Exception as e:
        print(f"Erreur lors de l'ajustement de l'inventaire: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    """Supprimer un item d'inventaire"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        inventory = load_data('inventory.json')
        item_index = next((i for i, item in enumerate(inventory) if item['id'] == item_id), None)
        
        if item_index is None:
            return jsonify({'error': 'Item non trouvé'}), 404
        
        deleted_item = inventory.pop(item_index)
        save_data('inventory.json', inventory)
        
        return jsonify({'message': 'Item supprimé', 'item': deleted_item}), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de l'item: {str(e)}")
        return jsonify({'error': str(e)}), 500
