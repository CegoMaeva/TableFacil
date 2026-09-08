from flask import Blueprint, request, jsonify
from app.models.database import db
from app.utils.jwt_utils import decode_token
from app.utils.password_utils import hash_password, validate_password_strength, generate_secure_password
from app.utils.code_generator import generate_employee_code, validate_employee_code, get_employee_type_from_code, get_employee_permissions, EMPLOYEE_TYPES_INFO
import uuid
from datetime import datetime
from functools import wraps

employees_bp = Blueprint('employees', __name__)

# ===== MIDDLEWARE D'AUTHENTIFICATION =====

def require_manager_auth(f):
    """Middleware pour vérifier que l'utilisateur est un gérant ou service_client/employé"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow CORS preflight to pass without authentication
        if request.method == 'OPTIONS':
            return jsonify({}), 200

        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = decode_token(token)
            
            # Vérifier que c'est un employé (gérant, service_client, ou autre rôle employé autorisé)
            # Permet: gerant, service_client, livreur, cuisinier, serveur, caissier, entretien
            allowed_roles = ['gerant', 'service_client', 'livreur', 'cuisinier', 'serveur', 'caissier', 'entretien']
            if payload.get('user_type') != 'employee' or payload.get('role') not in allowed_roles:
                return jsonify({'error': 'Accès réservé aux employés autorisés'}), 403
            
            # Ajouter les données du gérant/employé à la requête
            request.manager_data = payload
            
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': 'Token invalide'}), 401
    
    return decorated_function


# ===== RÉCUPÉRATION DE TOUS LES EMPLOYÉS =====

@employees_bp.route('/', methods=['GET'])
@require_manager_auth
def get_all_employees():
    """
    Récupère la liste de tous les employés
    Supporte le filtrage par type via ?type=livreur
    Requiert authentification gérant
    """
    try:
        employees = db.get_all_employees()
        
        # Masquer les mots de passe
        for emp in employees:
            emp.pop('password_hash', None)
        
        # Filtrer par type si le paramètre est fourni
        employee_type = request.args.get('type')
        if employee_type:
            employees = [emp for emp in employees if emp.get('type') == employee_type]
        
        return jsonify({
            'success': True,
            'employees': employees,
            'total': len(employees)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== RÉCUPÉRATION D'UN EMPLOYÉ SPÉCIFIQUE =====

@employees_bp.route('/<string:employee_id>', methods=['GET'])
@require_manager_auth
def get_employee(employee_id):
    """
    Récupère les détails d'un employé spécifique
    """
    try:
        employee = db.get_employee_by_id(employee_id)
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        # Masquer le mot de passe
        employee.pop('password_hash', None)
        
        return jsonify({
            'success': True,
            'employee': employee
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== CRÉATION D'UN NOUVEL EMPLOYÉ =====

@employees_bp.route('/', methods=['POST'])
@require_manager_auth
def create_employee():
    """
    Crée un nouveau compte employé (gérant uniquement)
    Le code unique est généré automatiquement selon le type
    
    Body JSON:
    {
        "name": "Marie Dubois",
        "email": "marie@restaurant.com",
        "phone": "+221 77 123 45 67",
        "type": "cuisinier",  // gerant, cuisinier, serveur, caissier, livreur, entretien, service_client
        "address": "Dakar, Senegal",
        "schedule": "Lun-Ven 10h-18h",
        "salary": 250000,
        "dateHired": "2024-01-15",
        "password": "SecurePass@123",  // optionnel, généré automatiquement si absent
        "cvFile": "marie_cv.pdf",  // optionnel
        "casierFile": "marie_casier.pdf"  // optionnel
    }
    """
    try:
        data = request.get_json()
        
        # Validation des champs requis
        required_fields = ['name', 'email', 'phone', 'type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Champ requis: {field}'}), 400
        
        name = data['name'].strip()
        email = data['email'].strip().lower()
        phone = data['phone'].strip()
        emp_type = data['type'].lower()
        address = data.get('address', '').strip()
        schedule = data.get('schedule', '').strip()
        salary = data.get('salary', 0)
        date_hired = data.get('dateHired', datetime.utcnow().strftime('%Y-%m-%d'))
        
        # S'assurer que cvFile et casierFile sont des chaînes, pas des objets
        cv_file = data.get('cvFile', '')
        if isinstance(cv_file, dict):
            cv_file = ''
        elif cv_file:
            cv_file = str(cv_file).strip()
            
        casier_file = data.get('casierFile', '')
        if isinstance(casier_file, dict):
            casier_file = ''
        elif casier_file:
            casier_file = str(casier_file).strip()
        
        # Gérer la photo (base64 string ou URL)
        photo = data.get('photo', '')
        if isinstance(photo, dict):
            photo = ''
        elif photo:
            photo = str(photo).strip()
        
        # Validation du type d'employé
        if emp_type not in EMPLOYEE_TYPES_INFO:
            valid_types = ', '.join(EMPLOYEE_TYPES_INFO.keys())
            return jsonify({'error': f'Type d\'employé invalide. Types valides: {valid_types}'}), 400
        
        # Vérifier si l'email existe déjà
        if db.get_employee_by_email(email):
            return jsonify({'error': 'Un employé avec cet email existe déjà'}), 400
        
        # Générer ou valider le mot de passe
        password = data.get('password', '')
        generated_password = None
        
        if not password:
            # Générer un mot de passe sécurisé automatiquement
            password = generate_secure_password()
            generated_password = password
        else:
            # Valider le mot de passe fourni
            is_valid, error_msg = validate_password_strength(password)
            if not is_valid:
                return jsonify({'error': error_msg}), 400
        
        # Hacher le mot de passe
        password_hash = hash_password(password)
        
        # Générer le code unique d'employé
        employee_code = generate_employee_code(emp_type)
        
        # Créer l'objet employé
        employee_id = f"emp_{uuid.uuid4().hex[:8]}"
        new_employee = {
            'id': employee_id,
            'name': name,
            'email': email,
            'phone': phone,
            'type': emp_type,
            'code': employee_code,
            'password_hash': password_hash,
            'address': address,
            'schedule': schedule,
            'salary': salary,
            'dateHired': date_hired,
            'status': 'active',
            'cvFile': cv_file,
            'casierFile': casier_file,
            'photo': photo,
            'is_active': True,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'created_by': request.manager_data.get('id'),
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        # Sauvegarder dans la base de données
        db.create_employee(new_employee)
        
        # Préparer la réponse (sans le hash)
        response_employee = new_employee.copy()
        response_employee.pop('password_hash')
        
        # Si le mot de passe a été généré, l'inclure dans la réponse (une seule fois)
        if generated_password:
            response_employee['generated_password'] = generated_password
        
        return jsonify({
            'success': True,
            'message': 'Employé créé avec succès',
            'employee': response_employee,
            'credentials': {
                'code': employee_code,
                'password': generated_password if generated_password else '(fourni par vous)',
                'login_url': '/login/employee'
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== MISE À JOUR D'UN EMPLOYÉ =====

@employees_bp.route('/<string:employee_id>', methods=['PUT'])
@require_manager_auth
def update_employee(employee_id):
    """
    Met à jour les informations d'un employé
    """
    try:
        employee = db.get_employee_by_id(employee_id)
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        data = request.get_json()
        
        # Champs modifiables
        updatable_fields = ['name', 'email', 'phone', 'address', 'schedule', 'salary', 
                           'status', 'cvFile', 'casierFile', 'photo', 'is_active']
        
        updated_fields = []
        for field in updatable_fields:
            if field in data:
                if field == 'email':
                    new_email = data[field].strip().lower()
                    # Vérifier si le nouvel email n'est pas déjà utilisé par un autre employé
                    existing = db.get_employee_by_email(new_email)
                    if existing and existing['id'] != employee_id:
                        return jsonify({'error': 'Cet email est déjà utilisé'}), 400
                    employee[field] = new_email
                elif field in ['cvFile', 'casierFile', 'photo']:
                    # S'assurer que les fichiers et photo sont des chaînes, pas des objets
                    value = data[field]
                    if isinstance(value, dict):
                        employee[field] = ''
                    else:
                        employee[field] = str(value).strip() if value else ''
                else:
                    employee[field] = data[field]
                updated_fields.append(field)
        
        # Mettre à jour le mot de passe si fourni
        if 'password' in data and data['password']:
            is_valid, error_msg = validate_password_strength(data['password'])
            if not is_valid:
                return jsonify({'error': error_msg}), 400
            
            employee['password_hash'] = hash_password(data['password'])
            updated_fields.append('password')
        
        # Mettre à jour la date de modification
        employee['updated_at'] = datetime.utcnow().isoformat() + 'Z'
        employee['updated_by'] = request.manager_data.get('id')
        
        # Sauvegarder les modifications
        db.update_employee(employee_id, employee)
        
        # Préparer la réponse
        response_employee = employee.copy()
        response_employee.pop('password_hash', None)
        
        return jsonify({
            'success': True,
            'message': 'Employé mis à jour avec succès',
            'employee': response_employee,
            'updated_fields': updated_fields
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== SUPPRESSION D'UN EMPLOYÉ =====

@employees_bp.route('/<string:employee_id>', methods=['DELETE'])
@require_manager_auth
def delete_employee(employee_id):
    """
    Supprime un employé (soft delete en le désactivant)
    """
    try:
        employee = db.get_employee_by_id(employee_id)
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        # Empêcher de supprimer le dernier gérant
        if employee['type'] == 'gerant':
            all_managers = [e for e in db.get_all_employees() if e['type'] == 'gerant' and e['is_active']]
            if len(all_managers) <= 1:
                return jsonify({'error': 'Impossible de supprimer le dernier gérant actif'}), 400
        
        # Soft delete: désactiver l'employé
        employee['is_active'] = False
        employee['deleted_at'] = datetime.utcnow().isoformat() + 'Z'
        employee['deleted_by'] = request.manager_data.get('id')
        
        db.update_employee(employee_id, employee)
        
        return jsonify({
            'success': True,
            'message': 'Employé désactivé avec succès'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== RÉACTIVATION D'UN EMPLOYÉ =====

@employees_bp.route('/<string:employee_id>/reactivate', methods=['POST'])
@require_manager_auth
def reactivate_employee(employee_id):
    """
    Réactive un employé désactivé
    """
    try:
        employee = db.get_employee_by_id(employee_id)
        
        if not employee:
            return jsonify({'error': 'Employé non trouvé'}), 404
        
        employee['is_active'] = True
        employee['reactivated_at'] = datetime.utcnow().isoformat() + 'Z'
        employee['reactivated_by'] = request.manager_data.get('id')
        employee.pop('deleted_at', None)
        employee.pop('deleted_by', None)
        
        db.update_employee(employee_id, employee)
        
        return jsonify({
            'success': True,
            'message': 'Employé réactivé avec succès'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== STATISTIQUES DES EMPLOYÉS =====

@employees_bp.route('/stats', methods=['GET'])
@require_manager_auth
def get_employee_stats():
    """
    Retourne des statistiques sur les employés
    """
    try:
        employees = db.get_all_employees()
        
        total = len(employees)
        active = sum(1 for e in employees if e['is_active'] and e.get('status') == 'active')
        inactive = sum(1 for e in employees if not e['is_active'])
        on_vacation = sum(1 for e in employees if e.get('status') == 'vacation')
        absent = sum(1 for e in employees if e.get('status') == 'absent')
        
        # Statistiques par type
        by_type = {}
        for emp_type in EMPLOYEE_TYPES_INFO.keys():
            by_type[emp_type] = sum(1 for e in employees if e['type'] == emp_type and e['is_active'])
        
        # Masse salariale
        total_salary = sum(e.get('salary', 0) for e in employees if e['is_active'])
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'active': active,
                'inactive': inactive,
                'on_vacation': on_vacation,
                'absent': absent,
                'by_type': by_type,
                'total_salary': total_salary
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== RECHERCHE D'EMPLOYÉS =====

@employees_bp.route('/search', methods=['GET'])
@require_manager_auth
def search_employees():
    """
    Recherche d'employés par nom, email, code ou type
    Query params: q (query), type, status
    """
    try:
        query = request.args.get('q', '').lower()
        emp_type = request.args.get('type', '').lower()
        status = request.args.get('status', '').lower()
        
        employees = db.get_all_employees()
        
        # Filtrer par recherche
        if query:
            employees = [
                e for e in employees
                if query in e['name'].lower() or 
                   query in e['email'].lower() or
                   query in e.get('code', '').lower()
            ]
        
        # Filtrer par type
        if emp_type and emp_type in EMPLOYEE_TYPES_INFO:
            employees = [e for e in employees if e['type'] == emp_type]
        
        # Filtrer par statut
        if status:
            if status == 'active':
                employees = [e for e in employees if e['is_active'] and e.get('status') == 'active']
            elif status == 'inactive':
                employees = [e for e in employees if not e['is_active']]
            elif status in ['vacation', 'absent']:
                employees = [e for e in employees if e.get('status') == status]
        
        # Masquer les mots de passe
        for emp in employees:
            emp.pop('password_hash', None)
        
        return jsonify({
            'success': True,
            'employees': employees,
            'total': len(employees)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500


# ===== INFORMATIONS SUR LES TYPES D'EMPLOYÉS =====

@employees_bp.route('/types', methods=['GET'])
@require_manager_auth
def get_employee_types():
    """
    Retourne la liste des types d'employés disponibles avec leurs informations
    """
    return jsonify({
        'success': True,
        'types': EMPLOYEE_TYPES_INFO
    }), 200


@employees_bp.route('/public', methods=['GET'])
def get_public_employees():
    """Return a minimal list of active employees usable by non-manager UIs.
    This endpoint is deliberately open (no manager auth) but only exposes
    non-sensitive fields (id, name, type, is_active).
    """
    try:
        employees = db.get_all_employees()
        public = []
        for e in employees:
            if not e.get('is_active'):
                continue
            public.append({
                'id': e.get('id'),
                'name': e.get('name'),
                'type': e.get('type')
            })
        return jsonify({'success': True, 'employees': public, 'total': len(public)}), 200
    except Exception as exc:
        return jsonify({'error': f'Erreur serveur: {str(exc)}'}), 500
