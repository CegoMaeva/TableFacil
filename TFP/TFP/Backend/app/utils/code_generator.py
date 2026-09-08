import random
import string
from datetime import datetime
from typing import Dict

# Préfixes des codes selon le type d'employé
EMPLOYEE_CODE_PREFIXES = {
    'gerant': 'GER',           # Gérant
    'cuisinier': 'CUI',        # Cuisinier
    'serveur': 'SRV',          # Serveur
    'caissier': 'CAI',         # Caissier
    'livreur': 'LIV',          # Livreur
    'entretien': 'ENT',        # Préposé à l'entretien
    'service_client': 'CLI'    # Service clientèle
}

# Formats de codes par type (pour plus de sécurité)
CODE_FORMATS = {
    'gerant': {
        'length': 4,
        'chars': string.ascii_uppercase + string.digits,
        'pattern': 'LLNN'  # 2 lettres + 2 chiffres
    },
    'cuisinier': {
        'length': 4,
        'chars': string.digits + string.ascii_uppercase[:10],
        'pattern': 'NNLL'  # 2 chiffres + 2 lettres
    },
    'serveur': {
        'length': 4,
        'chars': string.ascii_uppercase + string.digits,
        'pattern': 'LNLN'  # Lettre-Chiffre-Lettre-Chiffre
    },
    'caissier': {
        'length': 4,
        'chars': string.digits + 'ABCDEF',
        'pattern': 'NNNN'  # 4 chiffres
    },
    'livreur': {
        'length': 4,
        'chars': string.digits + string.ascii_uppercase,
        'pattern': 'NLNL'  # Chiffre-Lettre-Chiffre-Lettre
    },
    'entretien': {
        'length': 3,
        'chars': string.digits,
        'pattern': 'NNN'   # 3 chiffres
    },
    'service_client': {
        'length': 4,
        'chars': string.ascii_uppercase + string.digits,
        'pattern': 'LLNN'  # 2 lettres + 2 chiffres
    }
}

def generate_employee_code(employee_type: str, employee_name: str = None) -> str:
    """
    Génère un code unique pour un employé selon son type
    
    Format général: PREFIX-YEAR-UNIQUE_CODE
    Exemple: GER-2024-A001, CUI-2024-12AB, SRV-2024-A1B2
    
    Args:
        employee_type: Type d'employé (gerant, cuisinier, serveur, etc.)
        employee_name: Nom de l'employé (optionnel, peut aider à personnaliser)
    
    Returns:
        Code unique de l'employé
    """
    
    if employee_type not in EMPLOYEE_CODE_PREFIXES:
        raise ValueError(f"Type d'employé invalide: {employee_type}")
    
    prefix = EMPLOYEE_CODE_PREFIXES[employee_type]
    year = datetime.now().year
    
    # Obtenir le format pour ce type
    format_info = CODE_FORMATS.get(employee_type, {
        'length': 4,
        'chars': string.ascii_uppercase + string.digits,
        'pattern': 'LLNN'
    })
    
    # Générer la partie unique selon le pattern
    unique_part = _generate_unique_part(
        format_info['pattern'],
        format_info['chars'],
        employee_name
    )
    
    return f"{prefix}-{year}-{unique_part}"

def _generate_unique_part(pattern: str, chars: str, name: str = None) -> str:
    """
    Génère la partie unique du code selon un pattern
    
    L = Lettre majuscule
    N = Chiffre
    """
    result = []
    
    # Si un nom est fourni, utiliser ses initiales pour les premières lettres
    name_index = 0
    name_letters = []
    if name:
        name_letters = [c.upper() for c in name if c.isalpha()]
    
    for char in pattern:
        if char == 'L':
            # Utiliser l'initiale du nom si disponible, sinon aléatoire
            if name_letters and name_index < len(name_letters):
                result.append(name_letters[name_index])
                name_index += 1
            else:
                result.append(random.choice(string.ascii_uppercase))
        elif char == 'N':
            result.append(random.choice(string.digits))
        else:
            result.append(char)
    
    return ''.join(result)

def validate_employee_code(code: str) -> Dict[str, any]:
    """
    Valide et extrait les informations d'un code employé
    
    Returns:
        Dict avec 'valid', 'type', 'year', 'unique_part'
    """
    parts = code.split('-')
    
    if len(parts) != 3:
        return {'valid': False, 'error': 'Format de code invalide'}
    
    prefix, year, unique = parts
    
    # Trouver le type correspondant
    employee_type = None
    for emp_type, emp_prefix in EMPLOYEE_CODE_PREFIXES.items():
        if emp_prefix == prefix:
            employee_type = emp_type
            break
    
    if not employee_type:
        return {'valid': False, 'error': 'Préfixe de code inconnu'}
    
    # Vérifier l'année
    try:
        year_int = int(year)
        current_year = datetime.now().year
        if year_int < 2020 or year_int > current_year + 1:
            return {'valid': False, 'error': 'Année invalide'}
    except ValueError:
        return {'valid': False, 'error': 'Année invalide'}
    
    return {
        'valid': True,
        'type': employee_type,
        'year': year_int,
        'unique_part': unique,
        'prefix': prefix
    }

def get_employee_type_from_code(code: str) -> str:
    """Extrait le type d'employé à partir du code"""
    validation = validate_employee_code(code)
    if validation.get('valid'):
        return validation.get('type')
    return None

def generate_batch_codes(employee_type: str, count: int) -> list:
    """
    Génère plusieurs codes uniques pour un type d'employé
    Utile pour créer des codes en avance
    """
    codes = set()
    while len(codes) < count:
        code = generate_employee_code(employee_type)
        codes.add(code)
    return list(codes)

# Types d'employés disponibles avec leurs descriptions
EMPLOYEE_TYPES_INFO = {
    'gerant': {
        'name': 'Gérant',
        'description': 'Gestion complète du restaurant',
        'prefix': 'GER',
        'permissions': ['full_access']
    },
    'cuisinier': {
        'name': 'Cuisinier',
        'description': 'Préparation des plats',
        'prefix': 'CUI',
        'permissions': ['view_orders', 'update_order_status', 'view_menu']
    },
    'serveur': {
        'name': 'Serveur',
        'description': 'Service en salle',
        'prefix': 'SRV',
        'permissions': ['view_orders', 'create_orders', 'view_tables', 'view_menu']
    },
    'caissier': {
        'name': 'Caissier',
        'description': 'Gestion des paiements',
        'prefix': 'CAI',
        'permissions': ['view_orders', 'process_payments', 'view_reports']
    },
    'livreur': {
        'name': 'Livreur',
        'description': 'Livraison des commandes',
        'prefix': 'LIV',
        'permissions': ['view_delivery_orders', 'update_delivery_status']
    },
    'entretien': {
        'name': 'Préposé à l\'entretien',
        'description': 'Entretien et nettoyage',
        'prefix': 'ENT',
        'permissions': ['view_schedule']
    },
    'service_client': {
        'name': 'Service clientèle',
        'description': 'Support et relation client',
        'prefix': 'CLI',
        'permissions': ['view_customers', 'view_reservations', 'manage_feedback']
    }
}

def get_employee_permissions(employee_type: str) -> list:
    """Retourne les permissions d'un type d'employé"""
    return EMPLOYEE_TYPES_INFO.get(employee_type, {}).get('permissions', [])
