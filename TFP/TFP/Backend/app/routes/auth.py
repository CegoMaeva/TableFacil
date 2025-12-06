from flask import Blueprint, request, jsonify
from app.models.database import db
from app.utils.jwt_utils import generate_token, decode_token, create_session_data, verify_token
import os
from werkzeug.utils import secure_filename
from datetime import datetime
from app.utils.password_utils import hash_password, verify_password, validate_password_strength
from app.utils.code_generator import (
    generate_employee_code, 
    validate_employee_code,
    get_employee_type_from_code,
    get_employee_permissions,
    EMPLOYEE_TYPES_INFO
)
import uuid
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# ===== AUTHENTIFICATION CLIENT (Email seulement) =====

@auth_bp.route('/login/client', methods=['POST'])
def login_client():
    """
    Connexion client avec email et mot de passe
    """
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Vérifier si l'utilisateur existe
    user = db.get_user_by_email(email)
    
    if not user:
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401
    
    # Vérifier le mot de passe
    if not verify_password(password, user.get('password_hash', '')):
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401
    
    # Générer le token
    token = generate_token({
        'id': user['id'],
        'email': user['email'],
        'user_type': 'client'
    })
    
    # Créer la session
    session = create_session_data(user, token)
    db.create_session(session)
    
    # Retourner les informations
    return jsonify({
        'success': True,
        'message': 'Connexion réussie',
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user.get('name'),
            'role': 'client',
            'user_type': 'client',
            'loyalty_points': user.get('loyalty_points', 0)
        }
    }), 200

# ===== AUTHENTIFICATION EMPLOYÉ (Code unique) =====

@auth_bp.route('/login/employee', methods=['POST'])
def login_employee():
    """
    Connexion employé avec code unique et mot de passe
    Format: PREFIX-YEAR-UNIQUE (ex: GER-2024-A001)
    """
    data = request.get_json()
    code = data.get('code', '').strip().upper()
    password = data.get('password', '')
    
    if not code or not password:
        return jsonify({'error': 'Code employé et mot de passe requis'}), 400
    
    # Valider le format du code
    validation = validate_employee_code(code)
    if not validation.get('valid'):
        return jsonify({'error': 'Code employé invalide'}), 401
    
    # Chercher l'employé par son code
    employee = db.get_employee_by_code(code)
    
    if not employee:
        return jsonify({'error': 'Code ou mot de passe incorrect'}), 401
    
    # Vérifier le mot de passe
    if not verify_password(password, employee.get('password_hash', '')):
        return jsonify({'error': 'Code ou mot de passe incorrect'}), 401
    
    # Vérifier si l'employé est actif
    if not employee.get('is_active', True):
        return jsonify({'error': 'Compte employé désactivé'}), 403
    
    # Obtenir les permissions
    permissions = get_employee_permissions(employee['type'])
    
    # Générer le token
    token = generate_token({
        'id': employee['id'],
        'email': employee.get('email'),
        'user_type': 'employee',
        'role': employee['type'],
        'type': employee['type']
    }, expires_in_hours=12)  # Token plus court pour les employés
    
    # Créer la session
    session = create_session_data({
        'id': employee['id'],
        'user_type': 'employee'
    }, token)
    db.create_session(session)
    
    # Retourner les informations
    return jsonify({
        'success': True,
        'message': f'Connexion réussie en tant que {EMPLOYEE_TYPES_INFO[employee["type"]]["name"]}',
        'token': token,
        'user': {
            'id': employee['id'],
            'name': employee.get('name'),
            'email': employee.get('email'),
            'role': employee['type'],
            'user_type': 'employee',
            'type': employee['type'],
            'code': employee['code'],
            'permissions': permissions
        }
    }), 200

# ===== INSCRIPTION EMPLOYÉ =====

@auth_bp.route('/register/employee', methods=['POST'])
def register_employee():
    """
    Enregistrement d'un nouvel employé (par le gérant ou automatique)
    Le code est généré automatiquement ou fourni par le gérant
    """
    data = request.get_json()
    
    # Vérifier l'autorisation (doit être un gérant)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if payload and not isinstance(payload, tuple) and payload.get('role') != 'gerant':
            return jsonify({'error': 'Seul un gérant peut créer des employés'}), 403
    
    # Données requises
    name = data.get('name', '').strip()
    employee_type = data.get('type', '').strip().lower()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    
    if not all([name, employee_type, email, password]):
        return jsonify({'error': 'Nom, type, email et mot de passe requis'}), 400
    
    # Valider la force du mot de passe
    is_valid, error_msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    if employee_type not in EMPLOYEE_TYPES_INFO:
        return jsonify({
            'error': 'Type d\'employé invalide',
            'valid_types': list(EMPLOYEE_TYPES_INFO.keys())
        }), 400
    
    # Générer ou utiliser le code fourni
    code = data.get('code')
    if not code:
        code = generate_employee_code(employee_type, name)
    else:
        # Valider le code fourni
        validation = validate_employee_code(code)
        if not validation.get('valid'):
            return jsonify({'error': 'Format de code invalide'}), 400
        
        # Vérifier que le code n'existe pas déjà
        if db.get_employee_by_code(code):
            return jsonify({'error': 'Ce code est déjà utilisé'}), 409
    
    # Hacher le mot de passe
    password_hash = hash_password(password)
    
    # Créer l'employé
    employee_data = {
        'id': f"emp_{uuid.uuid4().hex[:12]}",
        'name': name,
        'email': email,
        'phone': phone,
        'type': employee_type,
        'code': code,
        'password_hash': password_hash,
        'is_active': True,
        'created_by': payload.get('user_id') if auth_header else 'system'
    }
    
    try:
        employee = db.create_employee(employee_data)
        
        return jsonify({
            'success': True,
            'message': 'Employé créé avec succès',
            'employee': {
                'id': employee['id'],
                'name': employee['name'],
                'email': employee['email'],
                'type': employee['type'],
                'code': employee['code'],
                'permissions': get_employee_permissions(employee['type'])
            }
        }), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

# ===== INSCRIPTION CLIENT =====

@auth_bp.route('/register/client', methods=['POST'])
def register_client():
    """
    Inscription d'un nouveau client avec email et mot de passe
    """
    data = request.get_json()
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    phone = data.get('phone', '').strip()
    
    if not all([name, email, password]):
        return jsonify({'error': 'Nom, email et mot de passe requis'}), 400
    
    # Valider la force du mot de passe
    is_valid, error_msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    # Vérifier si l'email existe déjà
    existing_user = db.get_user_by_email(email)
    if existing_user:
        return jsonify({'error': 'Un compte existe déjà avec cet email'}), 409
    
    # Hacher le mot de passe
    password_hash = hash_password(password)
    
    # Créer le client
    user_data = {
        'id': f"user_{uuid.uuid4().hex[:12]}",
        'email': email,
        'name': name,
        'phone': phone,
        'password_hash': password_hash,
        'user_type': 'client',
        'loyalty_points': 0,
        'orders_count': 0,
        'created_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    try:
        user = db.create_user(user_data)
        
        # Générer le token et créer la session
        token = generate_token({
            'id': user['id'],
            'email': user['email'],
            'user_type': 'client'
        })
        
        session = create_session_data(user, token)
        db.create_session(session)
        
        return jsonify({
            'success': True,
            'message': 'Compte créé avec succès',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': 'client',
                'user_type': 'client',
                'loyalty_points': 0
            }
        }), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

# ===== DÉCONNEXION =====

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Déconnexion - invalide la session"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload or isinstance(payload, tuple):
        return jsonify({'error': 'Token invalide'}), 401
    
    # Supprimer la session (optionnel avec JWT)
    # Dans un système JWT pur, le client supprime juste le token
    
    return jsonify({
        'success': True,
        'message': 'Déconnexion réussie'
    }), 200

# ===== VÉRIFICATION DU TOKEN =====

@auth_bp.route('/verify', methods=['GET'])
def verify_auth():
    """Vérifie si le token est valide"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'valid': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload or isinstance(payload, tuple):
        return jsonify({'valid': False, 'error': 'Token invalide ou expiré'}), 401
    
    # Récupérer les infos utilisateur
    user_type = payload.get('user_type')
    user_id = payload.get('user_id')
    
    user_data = {}
    if user_type == 'client':
        user = db.get_user_by_id(user_id)
        if user:
            user_data = {
                'id': user['id'],
                'email': user['email'],
                'name': user.get('name'),
                'role': 'client'
            }
    else:
        employee = db.get_employee_by_id(user_id)
        if employee:
            user_data = {
                'id': employee['id'],
                'name': employee['name'],
                'email': employee.get('email'),
                'role': employee['type'],
                'type': employee['type'],
                'permissions': get_employee_permissions(employee['type'])
            }
    
    return jsonify({
        'valid': True,
        'user': user_data
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    """Mettre à jour le profil du client connecté"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401

    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    # verify_token may return a tuple (jsonify, status)
    if isinstance(payload, tuple):
        return payload
    if not payload:
        return jsonify({'error': 'Token invalide'}), 401

    user_type = payload.get('user_type')
    user_id = payload.get('user_id')

    # Only clients can update their profile via this route
    if user_type != 'client':
        return jsonify({'error': 'Accès non autorisé'}), 403

    data = request.get_json() or {}
    # Allow more detailed profile fields
    allowed = ['name', 'email', 'phone', 'first_name', 'last_name', 'address', 'profile_photo', 'other_details']
    update_data = {k: v for k, v in data.items() if k in allowed}

    if 'email' in update_data:
        update_data['email'] = update_data['email'].strip().lower()

    # Use db from closure (imported as db in module)
    try:
        updated = db.update_user(user_id, update_data)
        if not updated:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        # Return the updated public user object
        # Build returned user object including optional fields
        user_obj = {
            'id': updated.get('id'),
            'email': updated.get('email'),
            'name': updated.get('name'),
            'role': 'client',
            'user_type': 'client',
            'loyalty_points': updated.get('loyalty_points', 0)
        }
        for f in ['first_name', 'last_name', 'address', 'phone', 'profile_photo', 'other_details']:
            if updated.get(f) is not None:
                user_obj[f] = updated.get(f)

        return jsonify({'success': True, 'user': user_obj}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== LISTE DES TYPES D'EMPLOYÉS =====

@auth_bp.route('/employee-types', methods=['GET'])
def get_employee_types():
    """Retourne la liste des types d'employés disponibles"""
    return jsonify({
        'types': EMPLOYEE_TYPES_INFO
    }), 200


@auth_bp.route('/profile/photo', methods=['POST'])
def upload_profile_photo():
    """Upload avatar/profile photo for authenticated client."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401

    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload or isinstance(payload, tuple):
        return jsonify({'error': 'Token invalide'}), 401

    user_type = payload.get('user_type')
    user_id = payload.get('user_id')
    if user_type != 'client':
        return jsonify({'error': 'Accès non autorisé'}), 403

    if 'avatar' not in request.files:
        return jsonify({'error': 'Aucun fichier envoyé'}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier invalide'}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1]
    uploads_dir = os.path.join(os.getcwd(), 'Backend', 'static', 'uploads', 'avatars')
    os.makedirs(uploads_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    new_filename = f"{user_id}_{timestamp}{ext}"
    save_path = os.path.join(uploads_dir, new_filename)
    file.save(save_path)

    # Build URL path relative to app root (Flask serves from /static)
    url_path = f"/static/uploads/avatars/{new_filename}"

    # Update user record with profile_photo
    try:
        updated = db.update_user(user_id, {'profile_photo': url_path})
        if not updated:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        return jsonify({'success': True, 'url': url_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== GÉNÉRATION DE CODES =====

@auth_bp.route('/generate-code/<employee_type>', methods=['GET'])
def generate_code_endpoint(employee_type):
    """Génère un nouveau code pour un type d'employé (pour le gérant)"""
    
    # Vérifier l'autorisation (doit être un gérant)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or isinstance(payload, tuple) or payload.get('role') != 'gerant':
            return jsonify({'error': 'Accès réservé aux gérants'}), 403
    else:
        return jsonify({'error': 'Authentification requise'}), 401
    
    if employee_type not in EMPLOYEE_TYPES_INFO:
        return jsonify({'error': 'Type d\'employé invalide'}), 400
    
    # Générer un nouveau code
    code = generate_employee_code(employee_type)
    
    return jsonify({
        'success': True,
        'code': code,
        'type': employee_type,
        'info': EMPLOYEE_TYPES_INFO[employee_type]
    }), 200


@auth_bp.route('/check-email', methods=['POST'])
def check_email():
    """
    Vérifie si un email existe comme employé ou client
    Retourne le type d'utilisateur pour déterminer les champs de connexion nécessaires
    """
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email requis'}), 400
    
    # Vérifier si c'est un employé
    employee = db.get_employee_by_email(email)
    if employee:
        return jsonify({
            'success': True,
            'user_type': 'employee',
            'name': employee.get('name'),
            'has_code': bool(employee.get('code'))
        }), 200
    
    # Vérifier si c'est un client
    client = db.get_user_by_email(email)
    if client:
        return jsonify({
            'success': True,
            'user_type': 'client',
            'name': client.get('name')
        }), 200
    
    # Email n'existe pas
    return jsonify({
        'success': True,
        'user_type': 'new',
        'message': 'Email non trouvé'
    }), 200


# ===== LISTE DES UTILISATEURS (POUR LE DASHBOARD) =====

@auth_bp.route('/users', methods=['GET'])
def get_users():
    """
    Récupère tous les utilisateurs (clients uniquement)
    Route réservée aux gérants
    """
    # Vérifier l'autorisation
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authentification requise'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload or isinstance(payload, tuple):
        return jsonify({'error': 'Token invalide'}), 401
    
    # Seuls les gérants peuvent voir tous les utilisateurs
    if payload.get('role') != 'gerant':
        return jsonify({'error': 'Accès réservé aux gérants'}), 403
    
    # Récupérer tous les utilisateurs
    users = db.get_all_users()
    
    # Formater les données pour le dashboard
    users_data = [{
        'id': user['id'],
        'name': user.get('name'),
        'email': user.get('email'),
        'phone': user.get('phone'),
        'loyalty_points': user.get('loyalty_points', 0),
        'orders_count': user.get('orders_count', 0),
        'created_at': user.get('created_at')
    } for user in users]
    
    return jsonify(users_data), 200

