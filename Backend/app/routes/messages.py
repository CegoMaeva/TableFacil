from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
import json
import os

messages_bp = Blueprint('messages', __name__)

# Path to messages data file
MESSAGES_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'messages.json')

def load_messages():
    """Load messages from JSON file"""
    try:
        if os.path.exists(MESSAGES_FILE):
            with open(MESSAGES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading messages: {e}")
        return []

def save_messages(messages):
    """Save messages to JSON file"""
    try:
        os.makedirs(os.path.dirname(MESSAGES_FILE), exist_ok=True)
        with open(MESSAGES_FILE, 'w', encoding='utf-8') as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving messages: {e}")
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

@messages_bp.route('/api/messages/<user_id>', methods=['GET'])
@token_required
def get_messages(user_id):
    """Get all messages for a user (sent + received)"""
    try:
        messages = load_messages()
        user_messages = [
            msg for msg in messages 
            if msg.get('senderId') == user_id or msg.get('recipientId') == user_id
        ]
        return jsonify(user_messages), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/api/messages/send', methods=['POST'])
@token_required
def send_message():
    """Send a new message"""
    try:
        data = request.get_json()
        if not data.get('recipientId') or not data.get('text'):
            return jsonify({'error': 'Champs manquants'}), 400
        sender_id = data.get('senderId')
        sender_name = data.get('senderName')
        sender_role = data.get('senderRole', 'client')
        if not sender_id or not sender_name:
            return jsonify({'error': 'Informations expéditeur manquantes'}), 400
        messages = load_messages()
        new_message = {
            'id': f"msg_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(messages)}",
            'senderId': sender_id,
            'senderName': sender_name,
            'senderRole': sender_role,
            'recipientId': data['recipientId'],
            'text': data['text'],
            'timestamp': datetime.now().isoformat(),
            'read': False
        }
        messages.append(new_message)
        if save_messages(messages):
            return jsonify(new_message), 201
        else:
            return jsonify({'error': 'Erreur sauvegarde'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/api/messages/<message_id>/read', methods=['PATCH'])
@token_required
def mark_message_read(message_id):
    """Mark a message as read"""
    try:
        messages = load_messages()
        for msg in messages:
            if msg.get('id') == message_id:
                msg['read'] = True
                if save_messages(messages):
                    return jsonify(msg), 200
                else:
                    return jsonify({'error': 'Erreur sauvegarde'}), 500
        return jsonify({'error': 'Message non trouvé'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/api/messages/conversation/<user_id>/<other_user_id>', methods=['GET'])
@token_required
def get_conversation(user_id, other_user_id):
    """Get all messages in a conversation between two users"""
    try:
        messages = load_messages()
        conversation = [
            msg for msg in messages 
            if (msg.get('senderId') == user_id and msg.get('recipientId') == other_user_id) or
               (msg.get('senderId') == other_user_id and msg.get('recipientId') == user_id)
        ]
        conversation.sort(key=lambda x: x.get('timestamp', ''))
        return jsonify(conversation), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
