import jwt
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'secret-key-change-in-production')

def generate_token(user_data: Dict, expires_in_hours: int = 24) -> str:
    """
    Génère un JWT token pour un utilisateur ou employé
    
    Args:
        user_data: Données de l'utilisateur (id, email, type, role)
        expires_in_hours: Durée de validité du token en heures
    
    Returns:
        Token JWT encodé
    """
    payload = {
        'user_id': user_data.get('id'),
        'email': user_data.get('email'),
        'user_type': user_data.get('user_type', 'client'),  # 'client' ou 'employee'
        'role': user_data.get('role') or user_data.get('type'),  # Role pour employé
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
        'iat': datetime.utcnow(),
        'jti': str(uuid.uuid4())  # JWT ID unique
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token: str) -> Optional[Dict]:
    """
    Décode et valide un JWT token
    
    Returns:
        Payload décodé ou None si invalide
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_token(token: str):
    """
    Vérifie la validité d'un token et retourne le payload ou une erreur Flask
    
    Returns:
        Dict du payload si valide, ou tuple Flask (jsonify(...), status_code) si invalide
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        # Map user_id to id for consistency across routes
        if 'user_id' in payload and 'id' not in payload:
            payload['id'] = payload['user_id']
        return payload
    except jwt.ExpiredSignatureError:
        from flask import jsonify
        return jsonify({'error': 'Token expiré'}), 401
    except jwt.InvalidTokenError:
        from flask import jsonify
        return jsonify({'error': 'Token invalide'}), 401
    except Exception as e:
        from flask import jsonify
        return jsonify({'error': str(e)}), 401

def generate_session_id() -> str:
    """Génère un ID de session unique"""
    return str(uuid.uuid4())

def create_session_data(user_data: Dict, token: str) -> Dict:
    """Crée les données de session complètes"""
    return {
        'id': generate_session_id(),
        'user_id': user_data.get('id'),
        'user_type': user_data.get('user_type', 'client'),
        'token': token,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'last_activity': datetime.utcnow().isoformat() + 'Z'
    }
