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


# ========== NOUVEAUX ENDPOINTS POUR LE FLUX DE DEMANDES ==========

@inventory_bp.route('/api/inventory/categories', methods=['GET'])
def get_categories():
    """Récupérer les catégories disponibles"""
    try:
        inventory = load_data('inventory.json')
        categories = sorted(list(set(item.get('category') for item in inventory if item.get('category'))))
        return jsonify({'categories': categories}), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des catégories: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory/by-category/<category>', methods=['GET'])
def get_inventory_by_category(category):
    """Récupérer les articles d'une catégorie"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        inventory = load_data('inventory.json')
        items = [item for item in inventory if item.get('category') == category]
        
        return jsonify(items), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des articles: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory-requests', methods=['POST'])
def create_inventory_request():
    """Créer une demande d'entrée d'inventaire (cuisinier)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        data = request.get_json()
        
        # Validation
        required_fields = ['itemId', 'quantity', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Charger l'inventaire pour obtenir les infos de l'article
        inventory = load_data('inventory.json')
        item = next((i for i in inventory if i['id'] == data['itemId']), None)
        
        if not item:
            return jsonify({'error': 'Article non trouvé'}), 404
        
        # Créer la demande
        request_id = f"INV-REQ-{str(uuid.uuid4())[:8].upper()}"
        
        new_request = {
            'id': request_id,
            'type': data['type'],  # 'inventory_entry' ou 'purchase_request'
            'status': 'pending',
            'itemId': data['itemId'],
            'itemName': item['name'],
            'category': item['category'],
            'quantity': data['quantity'],
            'unit': item['unit'],
            'proposedBy': user_data.get('id'),
            'proposedByName': user_data.get('name', user_data.get('username', 'Inconnu')),
            'currentQuantity': item['quantity'],
            'proposedAt': datetime.now().isoformat(),
            'validatedBy': None,
            'validatedAt': None,
            'rejectionReason': None,
            'notes': data.get('notes', '')
        }
        
        requests_data = load_data('inventory_requests.json')
        requests_data.append(new_request)
        save_data('inventory_requests.json', requests_data)
        
        return jsonify({'message': 'Demande créée', 'request': new_request}), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de la demande: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory-requests', methods=['GET'])
def get_inventory_requests():
    """Récupérer les demandes d'inventaire (pour gérant)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        requests_data = load_data('inventory_requests.json')
        
        # Filtrer par statut si demandé
        status_filter = request.args.get('status')
        if status_filter:
            requests_data = [r for r in requests_data if r.get('status') == status_filter]
        
        # Filtrer par type si demandé
        type_filter = request.args.get('type')
        if type_filter:
            requests_data = [r for r in requests_data if r.get('type') == type_filter]
        
        return jsonify(requests_data), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des demandes: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory-requests/<request_id>/validate', methods=['POST'])
def validate_inventory_request(request_id):
    """Valider une demande d'inventaire (gérant)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        
        requests_data = load_data('inventory_requests.json')
        request_index = next((i for i, r in enumerate(requests_data) if r['id'] == request_id), None)
        
        if request_index is None:
            return jsonify({'error': 'Demande non trouvée'}), 404
        
        inv_request = requests_data[request_index]
        
        # Marquer comme validée
        inv_request['status'] = 'validated'
        inv_request['validatedBy'] = user_data.get('id')
        inv_request['validatedAt'] = datetime.now().isoformat()
        
        if inv_request['type'] == 'inventory_entry':
            # Mettre à jour l'inventaire
            inventory = load_data('inventory.json')
            item_index = next((i for i, item in enumerate(inventory) if item['id'] == inv_request['itemId']), None)
            
            if item_index is not None:
                inventory[item_index]['quantity'] = data.get('newQuantity', inv_request['quantity'])
                inventory[item_index]['lastRestocked'] = datetime.now().isoformat()
                save_data('inventory.json', inventory)
        
        elif inv_request['type'] == 'purchase_request':
            # Créer une commande d'achat
            create_purchase_order_from_request(inv_request, user_data)
        
        requests_data[request_index] = inv_request
        save_data('inventory_requests.json', requests_data)
        
        return jsonify({'message': 'Demande validée', 'request': inv_request}), 200
        
    except Exception as e:
        print(f"Erreur lors de la validation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/inventory-requests/<request_id>/reject', methods=['POST'])
def reject_inventory_request(request_id):
    """Rejeter une demande d'inventaire (gérant)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        
        requests_data = load_data('inventory_requests.json')
        request_index = next((i for i, r in enumerate(requests_data) if r['id'] == request_id), None)
        
        if request_index is None:
            return jsonify({'error': 'Demande non trouvée'}), 404
        
        inv_request = requests_data[request_index]
        inv_request['status'] = 'rejected'
        inv_request['validatedBy'] = user_data.get('id')
        inv_request['validatedAt'] = datetime.now().isoformat()
        inv_request['rejectionReason'] = data.get('reason', 'Non spécifiée')
        
        requests_data[request_index] = inv_request
        save_data('inventory_requests.json', requests_data)
        
        return jsonify({'message': 'Demande rejetée', 'request': inv_request}), 200
        
    except Exception as e:
        print(f"Erreur lors du rejet: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/purchase-orders', methods=['GET'])
def get_purchase_orders():
    """Récupérer les commandes d'achat (gérant)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        orders = load_data('purchase_orders.json')
        
        # Filtrer par statut si demandé
        status_filter = request.args.get('status')
        if status_filter:
            orders = [o for o in orders if o.get('status') == status_filter]
        
        return jsonify(orders), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des commandes: {str(e)}")
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/api/purchase-orders', methods=['POST'])
def create_purchase_order():
    """Créer une commande d'achat (gérant)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if not user_data:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'error': 'Au moins un article requis'}), 400
        
        # Créer la commande
        order_id = f"PO-{str(uuid.uuid4())[:6].upper()}"
        
        total_amount = sum(item.get('totalPrice', 0) for item in data['items'])
        
        new_order = {
            'id': order_id,
            'status': data.get('status', 'pending'),
            'items': data['items'],
            'totalAmount': total_amount,
            'createdBy': user_data.get('id'),
            'createdAt': datetime.now().isoformat(),
            'estimatedDelivery': data.get('estimatedDelivery'),
            'notes': data.get('notes', '')
        }
        
        orders = load_data('purchase_orders.json')
        orders.append(new_order)
        save_data('purchase_orders.json', orders)
        
        return jsonify({'message': 'Commande créée', 'order': new_order}), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de la commande: {str(e)}")
        return jsonify({'error': str(e)}), 500


def create_purchase_order_from_request(inv_request, user_data):
    """Créer une commande d'achat à partir d'une demande validée"""
    try:
        inventory = load_data('inventory.json')
        item = next((i for i in inventory if i['id'] == inv_request['itemId']), None)
        
        if not item:
            return
        
        order_id = f"PO-{str(uuid.uuid4())[:6].upper()}"
        
        new_order = {
            'id': order_id,
            'status': 'pending',
            'items': [{
                'itemId': inv_request['itemId'],
                'itemName': inv_request['itemName'],
                'category': inv_request['category'],
                'quantity': inv_request['quantity'],
                'unit': inv_request['unit'],
                'price': item.get('price', 0),
                'totalPrice': inv_request['quantity'] * item.get('price', 0),
                'supplier': item.get('supplier', ''),
                'requestId': inv_request['id']
            }],
            'totalAmount': inv_request['quantity'] * item.get('price', 0),
            'createdBy': user_data.get('id'),
            'createdAt': datetime.now().isoformat(),
            'estimatedDelivery': None,
            'notes': f"Créée à partir de la demande {inv_request['id']}"
        }
        
        orders = load_data('purchase_orders.json')
        orders.append(new_order)
        save_data('purchase_orders.json', orders)
        
    except Exception as e:
        print(f"Erreur lors de la création de la commande d'achat: {str(e)}")

