from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/api/orders', methods=['GET'])
def get_orders():
    """Récupérer toutes les commandes"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        orders = load_data('orders.json')
        users = load_data('users.json') or []
        
        # Enrichir les commandes avec le nom du client depuis la base d'utilisateurs
        for order in orders:
            if 'userName' not in order:
                user = next((u for u in users if u.get('id') == order.get('userId')), None)
                if user:
                    order['userName'] = user.get('name', 'Client')
                else:
                    order['userName'] = order.get('customerName', 'Client')
        
        # Filtrer selon le rôle
        if user_data.get('role') in ['gerant', 'admin', 'service_client'] or user_data.get('user_type') == 'employee':
            # Gérant, admin, service_client et employés voient toutes les commandes
            return jsonify(orders), 200
        else:
            # Client voit ses commandes
            user_orders = [o for o in orders if o.get('userId') == user_data.get('id')]
            return jsonify(user_orders), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/api/orders', methods=['POST'])
def create_order():
    """Créer une nouvelle commande"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        data = request.get_json() or {}
        orders = load_data('orders.json') or []
        users = load_data('users.json') or []

        # Support cashier/walk-in orders: frontend may provide customerId or customerName
        customer_id = data.get('customerId') or data.get('clientId')
        customer_name = data.get('customerName') or data.get('clientName') or data.get('userName')

        if customer_id:
            # try to enrich name from users.json
            user = next((u for u in users if u.get('id') == customer_id), None)
            customer_name = user.get('name') if user else (customer_name or 'Client')

        # If an employee (cashier) creates the order for a walk-in, allow customerName without linking to a userId
        if user_data.get('user_type') == 'employee' and customer_id is None and customer_name:
            order_user_id = None
            order_user_name = customer_name
        else:
            # default: associate with authenticated user
            order_user_id = customer_id if customer_id else user_data.get('id')
            order_user_name = customer_name if customer_name else user_data.get('name')

        order = {
            'id': str(uuid.uuid4()),
            'userId': order_user_id,
            'userName': order_user_name,
            'items': data.get('items', []),
            'total': data.get('total', 0),
            'type': data.get('type', 'dine-in'),
            'table': data.get('table'),
            'address': data.get('address'),
            'phone': data.get('phone'),
            'notes': data.get('notes'),
            'status': data.get('status', 'pending'),
            'paymentStatus': data.get('paymentStatus', 'unpaid'),
            'createdBy': {
                'id': user_data.get('id'),
                'name': user_data.get('name'),
                'role': user_data.get('role')
            },
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }

        orders.append(order)
        save_data('orders.json', orders)

        return jsonify(order), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    """Récupérer une commande spécifique"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        orders = load_data('orders.json')
        order = next((o for o in orders if o['id'] == order_id), None)
        
        if not order:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        # Vérifier les permissions
        if user_data.get('role') not in ['gerant', 'admin'] and order.get('userId') != user_data.get('id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        return jsonify(order), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/api/orders/<order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    """Mettre à jour le statut d'une commande (gérant uniquement)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        # Allow managers/admins, service_client and employees (cashiers) to update order status
        if not (user_data.get('role') in ['gerant', 'admin', 'service_client'] or user_data.get('user_type') == 'employee'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        orders = load_data('orders.json')
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        orders[order_index]['status'] = new_status
        orders[order_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('orders.json', orders)
        
        return jsonify(orders[order_index]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
