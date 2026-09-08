from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from app.utils.email_utils import send_order_confirmation

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
        users = load_data('users.json')
        
        # Extraire la liste des utilisateurs si elle est dans un objet avec clé 'users'
        if isinstance(users, dict) and 'users' in users:
            users = users['users']
        elif not isinstance(users, list):
            users = []
        
        # Enrichir les commandes avec le nom et l'email du client depuis la base d'utilisateurs
        for order in orders:
            # Chercher le userId dans plusieurs champs possibles
            user_id = order.get('userId') or order.get('clientId')
            
            # Si on a un userId, chercher le vrai nom et email de l'utilisateur en priorité
            if user_id:
                user = next((u for u in users if u.get('id') == user_id), None)
                if user:
                    if user.get('name'):
                        order['userName'] = user.get('name')
                    if user.get('email'):
                        order['userEmail'] = user.get('email')
            
            # Sinon, garder ou définir les valeurs par défaut
            if not order.get('userName') or order.get('userName') == 'Client':
                order['userName'] = order.get('customerName') or order.get('clientName') or 'Client'
            if not order.get('userEmail'):
                order['userEmail'] = order.get('customerEmail') or order.get('clientEmail') or ''
        
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
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
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
        
        # Ajouter les points de loyauté si c'est un client enregistré
        if order_user_id:
            loyalty_records = load_data('loyalty.json') or []
            user_loyalty = next((l for l in loyalty_records if l.get('userId') == order_user_id), None)
            
            # Calculer les points gagnés (1 point pour 100 FCFA)
            points_earned = int(order.get('total', 0) / 100)
            
            if user_loyalty:
                # Ajouter les points à un client existant
                user_loyalty['points'] = user_loyalty.get('points', 0) + points_earned
                user_loyalty['totalSpent'] = user_loyalty.get('totalSpent', 0) + order.get('total', 0)
                user_loyalty['orderCount'] = user_loyalty.get('orderCount', 0) + 1
                user_loyalty['lastOrderDate'] = datetime.now().isoformat()
                user_loyalty['lastOrderId'] = order['id']
            else:
                # Créer un nouveau profil de loyauté
                user_loyalty = {
                    'id': str(uuid.uuid4()),
                    'userId': order_user_id,
                    'points': points_earned,
                    'totalSpent': order.get('total', 0),
                    'orderCount': 1,
                    'createdAt': datetime.now().isoformat(),
                    'lastOrderDate': datetime.now().isoformat(),
                    'lastOrderId': order['id'],
                    'level': 'Bronze'  # Niveau initial
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
            loyalty_records = [l for l in loyalty_records if l.get('userId') != order_user_id]
            loyalty_records.append(user_loyalty)
            save_data('loyalty.json', loyalty_records)
        
        # Envoyer l'email de confirmation de commande au client
        if order_user_id:  # Vérifier que c'est une commande client (pas une commande walk-in sans email)
            customer = next((u for u in users if u.get('id') == order_user_id), None)
            if customer and customer.get('email'):
                send_order_confirmation(
                    to_email=customer.get('email'),
                    customer_name=customer.get('name', 'Client'),
                    order=order
                )

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


@orders_bp.route('/api/orders/<order_id>/problem', methods=['POST'])
def report_delivery_problem(order_id):
    """Signaler un problème de livraison (service client)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Allow service_client and managers
        if not (user_data.get('role') in ['gerant', 'admin', 'service_client']):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json() or {}
        problem_type = data.get('type')  # address_not_found, client_absent, incident, other
        description = data.get('description', '')
        
        orders = load_data('orders.json')
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        # Add problem to order
        problem = {
            'type': problem_type,
            'description': description,
            'reportedBy': {
                'id': user_data.get('id'),
                'name': user_data.get('name'),
                'role': user_data.get('role')
            },
            'reportedAt': datetime.now().isoformat()
        }
        
        if 'problem' not in orders[order_index]:
            orders[order_index]['problem'] = problem
        
        orders[order_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('orders.json', orders)
        
        return jsonify(orders[order_index]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orders_bp.route('/api/orders/<order_id>/reassign', methods=['PATCH'])
def reassign_delivery(order_id):
    """Réassigner une livraison à un autre livreur (service client/manager)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Allow service_client and managers
        if not (user_data.get('role') in ['gerant', 'admin', 'service_client']):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json() or {}
        new_driver_id = data.get('driverId')
        
        if not new_driver_id:
            return jsonify({'error': 'driverId requis'}), 400
        
        orders = load_data('orders.json')
        employees = load_data('employees.json') or []
        
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        # Get driver info
        driver = next((e for e in employees if e['id'] == new_driver_id), None)
        if not driver:
            return jsonify({'error': 'Livreur non trouvé'}), 404
        
        # Update order
        orders[order_index]['driverId'] = new_driver_id
        orders[order_index]['driverName'] = driver.get('name', 'Livreur')
        orders[order_index]['reassignedBy'] = {
            'id': user_data.get('id'),
            'name': user_data.get('name'),
            'role': user_data.get('role')
        }
        orders[order_index]['reassignedAt'] = datetime.now().isoformat()
        orders[order_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('orders.json', orders)
        
        return jsonify(orders[order_index]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orders_bp.route('/api/orders/<order_id>/reschedule', methods=['PATCH'])
def reschedule_delivery(order_id):
    """Reprogrammer une livraison (service client/manager)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Allow service_client and managers
        if not (user_data.get('role') in ['gerant', 'admin', 'service_client']):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        data = request.get_json() or {}
        new_scheduled_time = data.get('scheduledTime')
        
        if not new_scheduled_time:
            return jsonify({'error': 'scheduledTime requis'}), 400
        
        orders = load_data('orders.json')
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        # Update order
        orders[order_index]['scheduledTime'] = new_scheduled_time
        orders[order_index]['rescheduledBy'] = {
            'id': user_data.get('id'),
            'name': user_data.get('name'),
            'role': user_data.get('role')
        }
        orders[order_index]['rescheduledAt'] = datetime.now().isoformat()
        orders[order_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('orders.json', orders)
        
        return jsonify(orders[order_index]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orders_bp.route('/api/orders/<order_id>/cancel', methods=['POST'])
def cancel_order(order_id):
    """Annuler une commande"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        orders = load_data('orders.json')
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        order = orders[order_index]
        
        # Vérifier les permissions - le client peut annuler sa propre commande
        user_id = user_data.get('id') or user_data.get('user_id')
        order_user_id = order.get('userId') or order.get('clientId')
        
        is_client = user_data.get('user_type') == 'client' or user_data.get('role') == 'client'
        
        if is_client and order_user_id != user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Vérifier si la commande peut être annulée
        if order.get('status') in ['delivered', 'cancelled', 'completed']:
            return jsonify({'error': 'Cette commande ne peut pas être annulée'}), 400
        
        # Mettre à jour le statut
        order['status'] = 'cancelled'
        order['cancelledAt'] = datetime.now().isoformat()
        order['cancelledBy'] = {
            'id': user_id,
            'name': user_data.get('name'),
            'user_type': user_data.get('user_type')
        }
        order['updatedAt'] = datetime.now().isoformat()
        
        orders[order_index] = order
        save_data('orders.json', orders)
        
        return jsonify({
            'success': True, 
            'message': 'Commande annulée avec succès',
            'order': order
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orders_bp.route('/api/orders/<order_id>/tracking', methods=['GET'])
def get_order_tracking(order_id):
    """Récupérer les informations de suivi en temps réel d'une commande"""
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
        user_id = user_data.get('id') or user_data.get('user_id')
        order_user_id = order.get('userId') or order.get('clientId')
        is_client = user_data.get('user_type') == 'client' or user_data.get('role') == 'client'
        is_delivery = user_data.get('user_type') == 'employee' and user_data.get('role') == 'delivery'
        
        if is_client and order_user_id != user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        if order.get('status') not in ['pending', 'confirmed', 'in-progress', 'out-for-delivery']:
            return jsonify({'error': 'Le suivi n\'est pas disponible pour cette commande'}), 400
        
        tracking_data = {
            'orderId': order.get('id'),
            'status': order.get('status'),
            'currentLocation': order.get('currentLocation') or {
                'latitude': 14.6928,
                'longitude': -17.7869,
                'timestamp': datetime.now().isoformat()
            },
            'originLocation': order.get('originLocation') or {
                'latitude': 14.6928,
                'longitude': -17.7869,
                'name': 'Restaurant TableFacil'
            },
            'destinationLocation': order.get('deliveryAddress') or {
                'address': order.get('address'),
                'latitude': None,
                'longitude': None
            },
            'driver': order.get('driver') or {
                'id': None,
                'name': 'En attente',
                'phone': None,
                'vehicle': None
            },
            'estimatedDeliveryTime': order.get('estimatedDeliveryTime'),
            'createdAt': order.get('createdAt'),
            'updatedAt': order.get('updatedAt')
        }
        
        return jsonify(tracking_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orders_bp.route('/api/orders/<order_id>/location', methods=['POST'])
def update_order_location(order_id):
    """Mettre à jour la position GPS de la commande (pour le livreur)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        
        # Vérifier les permissions - seulement les livreurs
        is_delivery = user_data.get('user_type') == 'employee' and user_data.get('role') == 'delivery'
        if not is_delivery:
            return jsonify({'error': 'Seuls les livreurs peuvent mettre à jour la position'}), 403
        
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude et longitude requises'}), 400
        
        orders = load_data('orders.json')
        order_index = next((i for i, o in enumerate(orders) if o['id'] == order_id), None)
        
        if order_index is None:
            return jsonify({'error': 'Commande non trouvée'}), 404
        
        order = orders[order_index]
        
        # Mettre à jour la position actuelle
        order['currentLocation'] = {
            'latitude': float(latitude),
            'longitude': float(longitude),
            'timestamp': datetime.now().isoformat()
        }
        order['updatedAt'] = datetime.now().isoformat()
        
        orders[order_index] = order
        save_data('orders.json', orders)
        
        return jsonify({
            'success': True,
            'message': 'Position mise à jour',
            'currentLocation': order['currentLocation']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500