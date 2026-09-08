"""
Routes pour la réinitialisation de mot de passe des employés
"""
from flask import Blueprint, request, jsonify
from app.models.database import db
from app.utils.password_utils import hash_password, validate_password_strength
from app.utils.email_utils import send_password_reset_email, send_password_changed_confirmation
import uuid
from datetime import datetime, timedelta
import os

password_reset_bp = Blueprint('password_reset', __name__)

# Stockage temporaire des tokens (en production, utiliser Redis ou une base de données)
reset_tokens = {}

# URL du frontend (à configurer via variable d'environnement)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')


@password_reset_bp.route('/request-reset', methods=['POST'])
def request_password_reset():
    """
    Demande de réinitialisation de mot de passe
    Envoie un email avec un lien de réinitialisation
    
    Body JSON:
    {
        "code": "CUI-2024-C001"  // Code employé uniquement
    }
    """
    try:
        data = request.get_json()
        
        if not data.get('code'):
            return jsonify({'error': 'Code employé requis'}), 400
        
        code = data['code'].strip().upper()
        
        # Chercher l'employé par code
        employee = db.get_employee_by_code(code)
        
        if not employee:
            return jsonify({'error': 'Code employé introuvable'}), 404
        
        # Vérifier que l'employé a un email
        if not employee.get('email'):
            return jsonify({'error': 'Aucun email enregistré pour cet employé'}), 400
        
        # Vérifier que le compte est actif
        if not employee.get('is_active', True):
            return jsonify({'error': 'Ce compte est désactivé'}), 403
        
        email = employee['email'].strip().lower()
        
        # Générer un token unique
        reset_token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(hours=1)
        
        # Stocker le token avec l'expiration
        reset_tokens[reset_token] = {
            'employee_id': employee['id'],
            'email': email,
            'expires_at': expiry.isoformat()
        }
        
        # Construire l'URL de réinitialisation
        reset_url = f"{FRONTEND_URL}/reset-password"
        
        # Envoyer l'email
        email_sent = send_password_reset_email(
            to_email=email,
            employee_name=employee['name'],
            reset_token=reset_token,
            reset_url=reset_url
        )
        
        if not email_sent:
            return jsonify({'error': 'Erreur lors de l\'envoi de l\'email'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Un email de réinitialisation a été envoyé à votre adresse.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


@password_reset_bp.route('/verify-token', methods=['POST'])
def verify_reset_token():
    """
    Vérifie la validité d'un token de réinitialisation
    
    Body JSON:
    {
        "token": "uuid-token"
    }
    """
    try:
        data = request.get_json()
        
        token = data.get('token')
        if not token:
            return jsonify({'error': 'Token requis'}), 400
        
        # Vérifier si le token existe
        token_data = reset_tokens.get(token)
        
        if not token_data:
            return jsonify({'error': 'Token invalide ou expiré'}), 400
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(token_data['expires_at'])
        if datetime.utcnow() > expires_at:
            # Supprimer le token expiré
            del reset_tokens[token]
            return jsonify({'error': 'Ce lien a expiré. Veuillez faire une nouvelle demande.'}), 400
        
        # Récupérer l'employé
        employee = db.get_employee_by_id(token_data['employee_id'])
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'employee_name': employee['name'],
            'email': employee['email']
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


@password_reset_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Réinitialise le mot de passe avec un token valide
    
    Body JSON:
    {
        "token": "uuid-token",
        "new_password": "NewSecurePass@123"
    }
    """
    try:
        data = request.get_json()
        
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token et nouveau mot de passe requis'}), 400
        
        # Vérifier le token
        token_data = reset_tokens.get(token)
        
        if not token_data:
            return jsonify({'error': 'Token invalide ou expiré'}), 400
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(token_data['expires_at'])
        if datetime.utcnow() > expires_at:
            del reset_tokens[token]
            return jsonify({'error': 'Ce lien a expiré. Veuillez faire une nouvelle demande.'}), 400
        
        # Valider la force du nouveau mot de passe
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Récupérer l'employé
        employee = db.get_employee_by_id(token_data['employee_id'])
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        # Mettre à jour le mot de passe
        employee['password_hash'] = hash_password(new_password)
        employee['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        
        db.update_employee(employee['id'], employee)
        
        # Supprimer le token utilisé
        del reset_tokens[token]
        
        # Envoyer un email de confirmation
        send_password_changed_confirmation(
            to_email=employee['email'],
            employee_name=employee['name']
        )
        
        return jsonify({
            'success': True,
            'message': 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


@password_reset_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Changement de mot de passe pour un employé connecté
    Nécessite l'ancien mot de passe
    
    Headers:
        Authorization: Bearer <token>
    
    Body JSON:
    {
        "current_password": "OldPass@123",
        "new_password": "NewSecurePass@123"
    }
    """
    try:
        from app.utils.jwt_utils import decode_token
        from app.utils.password_utils import verify_password
        
        # Vérifier l'authentification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = decode_token(token)
            
            if payload.get('user_type') != 'employee':
                return jsonify({'error': 'Accès réservé aux employés'}), 403
            
            employee_id = payload.get('id')
            
        except Exception:
            return jsonify({'error': 'Token invalide'}), 401
        
        # Récupérer les données
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Mot de passe actuel et nouveau requis'}), 400
        
        # Récupérer l'employé
        employee = db.get_employee_by_id(employee_id)
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        # Vérifier l'ancien mot de passe
        if not verify_password(current_password, employee['password_hash']):
            return jsonify({'error': 'Mot de passe actuel incorrect'}), 400
        
        # Valider le nouveau mot de passe
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Vérifier que le nouveau mot de passe est différent
        if verify_password(new_password, employee['password_hash']):
            return jsonify({'error': 'Le nouveau mot de passe doit être différent de l\'ancien'}), 400
        
        # Mettre à jour le mot de passe
        employee['password_hash'] = hash_password(new_password)
        employee['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        
        db.update_employee(employee_id, employee)
        
        # Envoyer un email de confirmation
        send_password_changed_confirmation(
            to_email=employee['email'],
            employee_name=employee['name']
        )
        
        return jsonify({
            'success': True,
            'message': 'Votre mot de passe a été modifié avec succès.'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500
