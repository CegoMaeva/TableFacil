from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
import json
import os

notifications_bp = Blueprint('notifications', __name__)

# Path to notifications data file
NOTIFICATIONS_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'notifications.json')

def load_notifications():
    """Load notifications from JSON file"""
    try:
        if os.path.exists(NOTIFICATIONS_FILE):
            with open(NOTIFICATIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading notifications: {e}")
        return []

def save_notifications(notifications):
    """Save notifications to JSON file"""
    try:
        os.makedirs(os.path.dirname(NOTIFICATIONS_FILE), exist_ok=True)
        with open(NOTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(notifications, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving notifications: {e}")
        return False

def token_required(f):
    """Decorator to require valid token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token manquant'}), 401
        if not token.startswith('Bearer '):
            return jsonify({'error': 'Token invalide'}), 401
        return f(*args, **kwargs)
    return decorated

@notifications_bp.route('/api/notifications/<user_type>/<user_id>', methods=['GET'])
@token_required
def get_notifications(user_type, user_id):
    """Récupérer les notifications pour un type d'utilisateur"""
    try:
        notifications = load_notifications()
        user_notifications = [
            n for n in notifications 
            if n.get('userType') == user_type and n.get('userId') == user_id
        ]
        user_notifications.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(user_notifications[:20]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/api/notifications/<notification_id>/read', methods=['PATCH'])
@token_required
def mark_notification_read(notification_id):
    """Marquer une notification comme lue"""
    try:
        notifications = load_notifications()
        for notif in notifications:
            if notif.get('id') == notification_id:
                notif['read'] = True
                notif['readAt'] = datetime.now().isoformat()
                break
        save_notifications(notifications)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/api/notifications/create', methods=['POST'])
@token_required
def create_notification():
    """Créer une nouvelle notification"""
    try:
        data = request.get_json() or {}
        notifications = load_notifications()
        import uuid
        notification = {
            'id': str(uuid.uuid4()),
            'userType': data.get('userType'),
            'userId': data.get('userId'),
            'type': data.get('type'),
            'title': data.get('title'),
            'message': data.get('message'),
            'priority': data.get('priority', 'normal'),
            'read': False,
            'timestamp': datetime.now().isoformat(),
            'metadata': data.get('metadata', {})
        }
        notifications.append(notification)
        save_notifications(notifications)
        return jsonify(notification), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/api/notifications/broadcast', methods=['POST'])
@token_required
def broadcast_notification():
    """Envoyer une notification à plusieurs utilisateurs"""
    try:
        data = request.get_json() or {}
        notifications = load_notifications()
        import uuid
        target_users = data.get('targetUsers', [])
        created_notifications = []
        for target in target_users:
            notification = {
                'id': str(uuid.uuid4()),
                'userType': target.get('userType'),
                'userId': target.get('userId'),
                'type': data.get('type'),
                'title': data.get('title'),
                'message': data.get('message'),
                'priority': data.get('priority', 'normal'),
                'read': False,
                'timestamp': datetime.now().isoformat(),
                'metadata': data.get('metadata', {})
            }
            notifications.append(notification)
            created_notifications.append(notification)
        save_notifications(notifications)
        return jsonify({
            'success': True,
            'count': len(created_notifications),
            'notifications': created_notifications
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
