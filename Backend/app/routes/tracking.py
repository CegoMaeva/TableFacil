from flask import Blueprint, request, jsonify
from app.services.delivery_tracking_service import DeliveryTrackingService
from datetime import datetime

tracking_bp = Blueprint('tracking', __name__, url_prefix='/api/orders')
tracking_service = DeliveryTrackingService()

@tracking_bp.route('/<order_id>/tracking', methods=['GET'])
def get_tracking(order_id: str):
    """Obtenir le suivi d'une commande."""
    try:
        tracking = tracking_service.get_tracking(order_id)
        
        if not tracking:
            return jsonify({
                "success": False,
                "message": f"Aucun suivi trouvé pour la commande {order_id}"
            }), 404
        
        return jsonify({
            "success": True,
            "data": tracking
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@tracking_bp.route('/<order_id>/tracking/update', methods=['POST'])
def update_tracking(order_id: str):
    """Mettre à jour la position du livreur."""
    try:
        data = request.get_json()
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        driver_id = data.get('driver_id')
        
        if latitude is None or longitude is None or not driver_id:
            return jsonify({
                "success": False,
                "message": "latitude, longitude et driver_id requis"
            }), 400
        
        tracking = tracking_service.update_driver_location(
            order_id, 
            float(latitude), 
            float(longitude),
            driver_id
        )
        
        return jsonify({
            "success": True,
            "data": tracking
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@tracking_bp.route('/<order_id>/tracking/status', methods=['POST'])
def update_status(order_id: str):
    """Mettre à jour le statut de livraison."""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({
                "success": False,
                "message": "status requis"
            }), 400
        
        tracking = tracking_service.update_delivery_status(order_id, status)
        
        return jsonify({
            "success": True,
            "data": tracking
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@tracking_bp.route('/<order_id>/tracking/start', methods=['POST'])
def start_delivery(order_id: str):
    """Démarrer une livraison."""
    try:
        data = request.get_json()
        
        driver_id = data.get('driver_id')
        driver_name = data.get('driver_name')
        origin = data.get('origin', {})
        destination = data.get('destination', {})
        
        if not driver_id or not driver_name:
            return jsonify({
                "success": False,
                "message": "driver_id et driver_name requis"
            }), 400
        
        tracking = tracking_service.start_delivery(
            order_id,
            driver_id,
            driver_name,
            origin,
            destination
        )
        
        return jsonify({
            "success": True,
            "data": tracking
        }), 201
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@tracking_bp.route('/active', methods=['GET'])
def get_active_deliveries():
    """Obtenir toutes les livraisons actives."""
    try:
        deliveries = tracking_service.get_active_deliveries()
        
        return jsonify({
            "success": True,
            "data": deliveries,
            "count": len(deliveries)
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@tracking_bp.route('/<order_id>/tracking/ws', methods=['GET'])
def websocket_tracking(order_id: str):
    """WebSocket pour mises à jour temps réel du suivi."""
    # Cette route sera gérée par Flask-SocketIO
    # Pour l'instant, retourner une erreur
    return jsonify({
        "success": False,
        "message": "Utilisez WebSocket pour cette route"
    }), 400
