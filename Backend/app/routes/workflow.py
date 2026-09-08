"""
Order Validation Workflow Routes
Gère tous les changements de statut avec validation des permissions
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from functools import wraps
from app.models import Order, Employee, db
import json

workflow_bp = Blueprint('workflow', __name__, url_prefix='/api/workflow')

# ============================================================================
# CONSTANTS & HELPERS
# ============================================================================

ORDER_STATUSES = {
    'pending_payment': 1,
    'paid': 2,
    'preparing': 3,
    'ready_for_delivery': 4,
    'assigned_to_driver': 5,
    'pickup': 6,
    'in_transit': 7,
    'delivered': 8,
    'cancelled': 9,
    'incident': 10,
    'completed': 11,
}

# Transitions autorisées: from_status -> [to_status, to_status, ...]
ALLOWED_TRANSITIONS = {
    'pending_payment': ['paid', 'cancelled'],
    'paid': ['preparing', 'cancelled'],
    'preparing': ['ready_for_delivery'],
    'ready_for_delivery': ['assigned_to_driver', 'cancelled'],
    'assigned_to_driver': ['pickup', 'cancelled'],
    'pickup': ['in_transit'],
    'in_transit': ['delivered'],
    'delivered': ['completed', 'incident'],
    'cancelled': ['completed'],
    'incident': ['resolved'],
}

# Permissions par rôle
ROLE_PERMISSIONS = {
    'client': {
        'create_order': True,
        'cancel_order': ['pending_payment', 'paid', 'preparing'],
        'view_tracking': True,
        'report_incident': ['pickup', 'in_transit', 'delivered'],
    },
    'cuisinier': {
        'start_preparing': True,
        'mark_ready': True,
        'view_queue': True,
    },
    'livreur': {
        'accept_order': True,
        'mark_pickup': True,
        'update_position': True,
        'mark_delivered': True,
    },
    'gerant': {
        'supervise_all': True,
        'intervene_order': True,
        'cancel_order': True,
        'manage_incident': True,
    },
    'service_client': {
        'resolve_incident': True,
        'process_refund': True,
    }
}


# ============================================================================
# DECORATORS
# ============================================================================

def require_role(*roles):
    """Vérifie que l'utilisateur a le rôle requis"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = request.user  # Assumant que le middleware ajoute l'utilisateur
            if user.role not in roles:
                return jsonify({
                    'error': 'Unauthorized',
                    'message': f'Rôle requis: {", ".join(roles)}'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def check_transition_allowed(current_status, new_status):
    """Vérifie si la transition est autorisée"""
    if current_status not in ALLOWED_TRANSITIONS:
        return False, f"Statut actuel '{current_status}' invalide"
    
    if new_status not in ALLOWED_TRANSITIONS[current_status]:
        return False, f"Transition de '{current_status}' à '{new_status}' non autorisée"
    
    return True, "Transition autorisée"


# ============================================================================
# 1️⃣ ROUTES CLIENT - CRÉATION & PAIEMENT
# ============================================================================

@workflow_bp.route('/orders/create', methods=['POST'])
@require_role('client')
def create_order():
    """Crée une nouvelle commande (statut: pending_payment)"""
    data = request.json
    
    # Validation
    if not data.get('items') or len(data['items']) == 0:
        return jsonify({'error': 'Commande vide'}), 400
    
    # Créer la commande
    order = Order(
        numero_commande=generate_order_number(),
        status='pending_payment',
        client_id=request.user.id,
        items=data['items'],
        delivery_address=data.get('delivery_address'),
        total_amount=calculate_total(data['items']),
        created_at=datetime.now(),
    )
    
    # Historique
    order.status_history = [{
        'status': 'pending_payment',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'client'
    }]
    
    db.session.add(order)
    db.session.commit()
    
    return jsonify({
        'order_id': order.id,
        'numero_commande': order.numero_commande,
        'status': order.status,
        'total': order.total_amount,
        'message': 'Commande créée. Veuillez procéder au paiement.'
    }), 201


@workflow_bp.route('/orders/<order_id>/pay', methods=['POST'])
@require_role('client')
def pay_order(order_id):
    """Traite le paiement (statut: pending_payment → paid)"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    if order.client_id != request.user.id:
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'paid')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Traiter le paiement
    payment_method = data.get('payment_method')  # 'card', 'paypal', 'cash'
    
    if payment_method in ['card', 'paypal']:
        # Intégrer Stripe/PayPal
        payment_result = process_payment(order, payment_method, data)
        if not payment_result['success']:
            return jsonify({
                'error': 'Paiement échoué',
                'details': payment_result['message']
            }), 400
    
    # Mettre à jour le statut
    order.status = 'paid'
    order.payment_method = payment_method
    order.payment_status = 'completed'
    order.paid_at = datetime.now()
    
    # Ajouter à l'historique
    order.status_history.append({
        'status': 'paid',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'client',
        'payment_method': payment_method
    })
    
    db.session.commit()
    
    # 🔔 Notifier la cuisine
    notify_kitchen(order)
    # 🔔 Notifier le gérant
    notify_manager(order, 'Nouveau paiement reçu')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Paiement confirmé! La cuisine commence la préparation.'
    }), 200


@workflow_bp.route('/orders/<order_id>/cancel', methods=['POST'])
@require_role('client')
def cancel_order(order_id):
    """Annule une commande (avant préparation)"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    if order.client_id != request.user.id and request.user.role != 'gerant':
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Vérifier si annulation possible
    cancellable_statuses = ROLE_PERMISSIONS['client']['cancel_order']
    if order.status not in cancellable_statuses:
        return jsonify({
            'error': f'Impossible d\'annuler en statut {order.status}',
            'cancellable_statuses': cancellable_statuses
        }), 400
    
    # Annuler
    order.status = 'cancelled'
    order.status_history.append({
        'status': 'cancelled',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': request.user.role,
        'reason': data.get('reason', 'Non spécifié')
    })
    
    db.session.commit()
    
    # Traiter remboursement si payée
    if order.payment_status == 'completed':
        process_refund(order)
    
    # 🔔 Notifier tous
    notify_all(order, f'Commande annulée')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Commande annulée'
    }), 200


# ============================================================================
# 2️⃣ ROUTES CUISINIER - PRÉPARATION
# ============================================================================

@workflow_bp.route('/kitchen/orders', methods=['GET'])
@require_role('cuisinier')
def get_kitchen_queue():
    """Affiche le file d'attente de cuisine (statut: paid, preparing, ready_for_delivery)"""
    orders = Order.query.filter(
        Order.status.in_(['paid', 'preparing', 'ready_for_delivery'])
    ).order_by(Order.paid_at.asc()).all()
    
    return jsonify([
        {
            'order_id': o.id,
            'numero': o.numero_commande,
            'status': o.status,
            'items': o.items,
            'created_at': o.created_at.isoformat(),
            'time_in_prep': calculate_prep_time(o),
            'special_notes': o.delivery_notes
        }
        for o in orders
    ]), 200


@workflow_bp.route('/kitchen/orders/<order_id>/start', methods=['POST'])
@require_role('cuisinier')
def start_preparation(order_id):
    """Commence la préparation (statut: paid → preparing)"""
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'preparing')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Marquer comme en préparation
    order.status = 'preparing'
    order.preparing_at = datetime.now()
    order.status_history.append({
        'status': 'preparing',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'cuisinier'
    })
    
    db.session.commit()
    
    # 🔔 Notifier gérant
    notify_manager(order, 'Préparation en cours')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Préparation commencée'
    }), 200


@workflow_bp.route('/kitchen/orders/<order_id>/ready', methods=['POST'])
@require_role('cuisinier')
def mark_ready(order_id):
    """Marque la commande comme prête (statut: preparing → ready_for_delivery)"""
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'ready_for_delivery')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Marquer comme prête
    order.status = 'ready_for_delivery'
    order.ready_at = datetime.now()
    prep_time = (order.ready_at - order.preparing_at).total_seconds() / 60
    
    order.status_history.append({
        'status': 'ready_for_delivery',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'cuisinier',
        'prep_time_minutes': round(prep_time, 2)
    })
    
    db.session.commit()
    
    # 🔔 Notifier livreur & gérant
    notify_drivers(order, f'Commande #{order.numero_commande} prête!')
    notify_manager(order, 'Commande prête pour livraison')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'prep_time': f'{prep_time:.1f} min',
        'message': 'Commande prête pour livraison'
    }), 200


# ============================================================================
# 3️⃣ ROUTES LIVREUR - LIVRAISON
# ============================================================================

@workflow_bp.route('/delivery/available-orders', methods=['GET'])
@require_role('livreur')
def get_available_orders():
    """Liste les commandes disponibles pour livraison"""
    orders = Order.query.filter_by(status='ready_for_delivery').all()
    
    return jsonify([
        {
            'order_id': o.id,
            'numero': o.numero_commande,
            'client_name': o.client.nom_complet,
            'delivery_address': o.delivery_address,
            'items_count': len(o.items),
            'total': o.total_amount,
            'ready_at': o.ready_at.isoformat(),
            'time_ready': calculate_ready_time(o)
        }
        for o in orders
    ]), 200


@workflow_bp.route('/delivery/orders/<order_id>/accept', methods=['POST'])
@require_role('livreur')
def accept_delivery(order_id):
    """Accepte une commande (statut: ready_for_delivery → assigned_to_driver)"""
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'assigned_to_driver')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Assigner au livreur
    order.status = 'assigned_to_driver'
    order.assigned_driver_id = request.user.id
    order.status_history.append({
        'status': 'assigned_to_driver',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'livreur'
    })
    
    db.session.commit()
    
    # Calculer ETA
    eta = calculate_eta(order)
    
    # 🔔 Notifier client
    notify_client(order, f'Votre livreur {request.user.nom_complet} est en route!')
    # 🔔 Notifier gérant
    notify_manager(order, f'Livreur assigné: {request.user.nom_complet}')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'driver_name': request.user.nom_complet,
        'eta_minutes': eta,
        'message': 'Livraison acceptée!'
    }), 200


@workflow_bp.route('/delivery/orders/<order_id>/pickup', methods=['POST'])
@require_role('livreur')
def pickup_order(order_id):
    """Marque la commande comme récupérée (statut: assigned_to_driver → pickup)"""
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    if order.assigned_driver_id != request.user.id:
        return jsonify({'error': 'Vous ne pouvez pas récupérer cette commande'}), 403
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'pickup')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Marquer comme récupérée
    order.status = 'pickup'
    order.pickup_at = datetime.now()
    order.status_history.append({
        'status': 'pickup',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'livreur'
    })
    
    db.session.commit()
    
    # 🔔 Notifier client
    notify_client(order, 'Votre commande a été récupérée!')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Commande récupérée'
    }), 200


@workflow_bp.route('/delivery/orders/<order_id>/in-transit', methods=['POST'])
@require_role('livreur')
def start_transit(order_id):
    """Démarre la livraison (statut: pickup → in_transit)"""
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    if order.assigned_driver_id != request.user.id:
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'in_transit')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Marquer comme en transit
    order.status = 'in_transit'
    order.in_transit_at = datetime.now()
    order.status_history.append({
        'status': 'in_transit',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'livreur'
    })
    
    db.session.commit()
    
    # 🔔 Notifier client avec ETA
    eta = calculate_eta(order)
    notify_client(order, f'En route! Arrivée prévue: {eta} minutes')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'eta_minutes': eta,
        'message': 'En route vers le client'
    }), 200


@workflow_bp.route('/delivery/orders/<order_id>/delivered', methods=['POST'])
@require_role('livreur')
def mark_delivered(order_id):
    """Marque comme livrée (statut: in_transit → delivered)"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    if order.assigned_driver_id != request.user.id:
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Vérifier transition
    allowed, msg = check_transition_allowed(order.status, 'delivered')
    if not allowed:
        return jsonify({'error': msg}), 400
    
    # Marquer comme livrée
    order.status = 'delivered'
    order.delivered_at = datetime.now()
    delivery_time = (order.delivered_at - order.in_transit_at).total_seconds() / 60
    
    order.status_history.append({
        'status': 'delivered',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': 'livreur',
        'proof': data.get('proof_type'),  # 'photo', 'signature', 'confirmation'
        'delivery_time_minutes': round(delivery_time, 2)
    })
    
    db.session.commit()
    
    # 🔔 Notifier client & gérant
    notify_client(order, 'Votre commande a été livrée!')
    notify_manager(order, f'Commande livrée par {request.user.nom_complet}')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Livraison confirmée!',
        'can_rate': True
    }), 200


# ============================================================================
# 4️⃣ ROUTES GÉRANT - SUPERVISION
# ============================================================================

@workflow_bp.route('/manager/dashboard', methods=['GET'])
@require_role('gerant')
def get_dashboard():
    """Tableau de bord de supervision"""
    
    # Compter par statut
    statuses = {}
    for status in ORDER_STATUSES.keys():
        count = Order.query.filter_by(status=status).count()
        statuses[status] = count
    
    # Commandes en retard
    late_threshold = datetime.now() - timedelta(minutes=30)
    late_orders = Order.query.filter(
        Order.status.in_(['preparing', 'ready_for_delivery']),
        Order.paid_at < late_threshold
    ).count()
    
    # Livreurs actifs
    active_drivers = Order.query.filter(
        Order.status.in_(['assigned_to_driver', 'pickup', 'in_transit']),
        Order.assigned_driver_id != None
    ).all()
    
    # Incidents non résolus
    incidents = Order.query.filter_by(status='incident').count()
    
    # Commandes complétées aujourd'hui
    today = datetime.now().date()
    completed_today = Order.query.filter(
        Order.status == 'completed',
        db.func.date(Order.delivered_at) == today
    ).count()
    
    return jsonify({
        'statuses': statuses,
        'late_orders_count': late_orders,
        'active_drivers': len(active_drivers),
        'incidents': incidents,
        'completed_today': completed_today,
        'active_drivers_list': [
            {
                'driver_id': o.assigned_driver_id,
                'driver_name': Employee.query.get(o.assigned_driver_id).nom_complet,
                'current_order': o.numero_commande,
                'status': o.status
            }
            for o in active_drivers
        ]
    }), 200


@workflow_bp.route('/manager/orders/<order_id>/intervene', methods=['POST'])
@require_role('gerant')
def intervene_order(order_id):
    """Intervention du gérant pour retard ou problème"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    action = data.get('action')  # 'reassign_driver', 'cancel', 'expedite'
    
    if action == 'reassign_driver':
        new_driver_id = data.get('new_driver_id')
        old_driver = order.assigned_driver_id
        order.assigned_driver_id = new_driver_id
        
        order.status_history.append({
            'status': 'reassigned',
            'timestamp': datetime.now().isoformat(),
            'actor': request.user.id,
            'actor_role': 'gerant',
            'old_driver': old_driver,
            'new_driver': new_driver_id,
            'reason': data.get('reason')
        })
        
        message = f'Livreur réassigné par le gérant'
    
    elif action == 'cancel':
        order.status = 'cancelled'
        order.status_history.append({
            'status': 'cancelled',
            'timestamp': datetime.now().isoformat(),
            'actor': request.user.id,
            'actor_role': 'gerant',
            'reason': data.get('reason')
        })
        message = 'Commande annulée par le gérant'
    
    db.session.commit()
    
    return jsonify({
        'order_id': order.id,
        'action': action,
        'message': message
    }), 200


# ============================================================================
# 5️⃣ ROUTES SERVICE CLIENT - INCIDENTS
# ============================================================================

@workflow_bp.route('/orders/<order_id>/report-incident', methods=['POST'])
@require_role('client', 'livreur')
def report_incident(order_id):
    """Signale un incident (→ incident)"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Commande non trouvée'}), 404
    
    # Vérifier permissions
    if request.user.role == 'client' and order.client_id != request.user.id:
        return jsonify({'error': 'Non autorisé'}), 403
    
    if request.user.role == 'livreur' and order.assigned_driver_id != request.user.id:
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Créer l'incident
    order.status = 'incident'
    incident_type = data.get('type')  # 'wrong_items', 'damaged', 'missing', 'late'
    
    order.status_history.append({
        'status': 'incident',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': request.user.role,
        'incident_type': incident_type,
        'description': data.get('description'),
        'proof_url': data.get('proof_url')
    })
    
    db.session.commit()
    
    # 🔔 Notifier service client & gérant
    notify_service_client(order, incident_type)
    notify_manager(order, f'Incident signalé: {incident_type}')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'message': 'Incident signalé. Notre équipe service client vous contactera.'
    }), 201


@workflow_bp.route('/incidents/<order_id>/resolve', methods=['POST'])
@require_role('gerant', 'service_client')
def resolve_incident(order_id):
    """Résout un incident"""
    data = request.json
    order = Order.query.get(order_id)
    
    if not order or order.status != 'incident':
        return jsonify({'error': 'Incident non trouvé'}), 404
    
    resolution_type = data.get('type')  # 'refund', 'replacement', 'credit'
    amount = data.get('amount')
    reason = data.get('reason')
    
    order.status = 'resolved'
    order.status_history.append({
        'status': 'resolved',
        'timestamp': datetime.now().isoformat(),
        'actor': request.user.id,
        'actor_role': request.user.role,
        'resolution_type': resolution_type,
        'amount': amount,
        'reason': reason
    })
    
    db.session.commit()
    
    # Traiter la résolution
    if resolution_type == 'refund':
        process_refund(order, amount)
    elif resolution_type == 'replacement':
        create_replacement_order(order)
    elif resolution_type == 'credit':
        add_credit_to_wallet(order.client_id, amount)
    
    # 🔔 Notifier client
    notify_client(order, f'Incident résolu. {resolution_type.capitalize()} traité.')
    
    return jsonify({
        'order_id': order.id,
        'status': order.status,
        'resolution': resolution_type,
        'message': 'Incident résolu'
    }), 200


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_order_number():
    """Génère un numéro de commande unique"""
    import random
    import string
    timestamp = datetime.now().strftime("%Y%m%d")
    random_suffix = ''.join(random.choices(string.digits, k=4))
    return f"CMD-{timestamp}-{random_suffix}"


def calculate_total(items):
    """Calcule le total d'une commande"""
    return sum(item['price'] * item['quantity'] for item in items)


def process_payment(order, method, data):
    """Traite le paiement (Stripe, PayPal, etc)"""
    # Implémentation de Stripe/PayPal
    return {'success': True}


def process_refund(order, amount=None):
    """Traite le remboursement"""
    if amount is None:
        amount = order.total_amount
    # Implémentation du remboursement
    pass


def notify_kitchen(order):
    """Envoie notification à la cuisine"""
    # Via WebSocket ou email
    pass


def notify_drivers(order, message):
    """Envoie notification aux livreurs disponibles"""
    # Via WebSocket ou notification push
    pass


def notify_client(order, message):
    """Envoie notification au client"""
    # Via WebSocket ou SMS/email
    pass


def notify_manager(order, message):
    """Envoie notification au gérant"""
    # Via WebSocket
    pass


def notify_service_client(order, incident_type):
    """Crée un ticket service client"""
    # Système de ticketing
    pass


def notify_all(order, message):
    """Envoie notification à tous les acteurs"""
    pass


def calculate_prep_time(order):
    """Calcule le temps écoulé depuis création"""
    if order.created_at:
        elapsed = datetime.now() - order.created_at
        return f"{int(elapsed.total_seconds() / 60)} min"
    return "N/A"


def calculate_ready_time(order):
    """Calcule le temps écoulé depuis que la commande est prête"""
    if order.ready_at:
        elapsed = datetime.now() - order.ready_at
        return f"{int(elapsed.total_seconds() / 60)} min"
    return "N/A"


def calculate_eta(order):
    """Calcule l'ETA en minutes"""
    # À implémenter avec Google Directions API
    return 25  # Placeholder


def create_replacement_order(order):
    """Crée une commande de remplacement"""
    pass


def add_credit_to_wallet(client_id, amount):
    """Ajoute un crédit au portefeuille client"""
    pass
