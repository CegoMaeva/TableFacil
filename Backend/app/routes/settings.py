"""
Routes pour la gestion des paramètres système
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime

settings_bp = Blueprint('settings', __name__)

def check_manager_permission(token):
    """Vérifier que l'utilisateur est un gérant"""
    user_data = verify_token(token)
    if isinstance(user_data, tuple):
        return user_data
    if not user_data or user_data.get('role') != 'gerant':
        return None
    return user_data


@settings_bp.route('/api/settings', methods=['GET'])
def get_settings():
    """Récupérer tous les paramètres système"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        settings = load_data('settings.json')
        return jsonify(settings), 200
        
    except FileNotFoundError:
        # Créer des paramètres par défaut si le fichier n'existe pas
        default_settings = get_default_settings()
        save_data('settings.json', default_settings)
        return jsonify(default_settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des paramètres: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings', methods=['PUT'])
def update_settings():
    """Mettre à jour les paramètres système"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Aucune donnée fournie'}), 400
        
        # Charger les paramètres existants ou créer des valeurs par défaut
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
        
        # Mettre à jour les paramètres
        settings.update(data)
        settings['updatedAt'] = datetime.now().isoformat()
        settings['updatedBy'] = user_data.get('name', 'Unknown')
        
        # Sauvegarder
        save_data('settings.json', settings)
        
        return jsonify(settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/restaurant', methods=['GET'])
def get_restaurant_settings():
    """Récupérer les paramètres du restaurant"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
            save_data('settings.json', settings)
        
        restaurant_settings = {
            'name': settings.get('restaurantName', 'TableFacil Restaurant'),
            'phone': settings.get('restaurantPhone', '+221 33 XXX XX XX'),
            'email': settings.get('restaurantEmail', 'contact@tablefacil.sn'),
            'address': settings.get('restaurantAddress', 'Montréal, Canada'),
            'openingHours': settings.get('openingHours', {
                'monday': {'open': '11:00', 'close': '23:00'},
                'tuesday': {'open': '11:00', 'close': '23:00'},
                'wednesday': {'open': '11:00', 'close': '23:00'},
                'thursday': {'open': '11:00', 'close': '23:00'},
                'friday': {'open': '11:00', 'close': '23:00'},
                'saturday': {'open': '11:00', 'close': '23:00'},
                'sunday': {'open': '11:00', 'close': '23:00'}
            }),
            'capacity': settings.get('capacity', 100),
            'currency': settings.get('currency', 'FCFA')
        }
        
        return jsonify(restaurant_settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des paramètres restaurant: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/restaurant', methods=['PUT'])
def update_restaurant_settings():
    """Mettre à jour les paramètres du restaurant"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Aucune donnée fournie'}), 400
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
        
        # Mettre à jour les paramètres du restaurant
        if 'name' in data:
            settings['restaurantName'] = data['name']
        if 'phone' in data:
            settings['restaurantPhone'] = data['phone']
        if 'email' in data:
            settings['restaurantEmail'] = data['email']
        if 'address' in data:
            settings['restaurantAddress'] = data['address']
        if 'openingHours' in data:
            settings['openingHours'] = data['openingHours']
        if 'capacity' in data:
            settings['capacity'] = data['capacity']
        if 'currency' in data:
            settings['currency'] = data['currency']
        
        settings['updatedAt'] = datetime.now().isoformat()
        settings['updatedBy'] = user_data.get('name', 'Unknown')
        
        save_data('settings.json', settings)
        
        return jsonify(settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres restaurant: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/payments', methods=['GET'])
def get_payment_settings():
    """Récupérer les paramètres de paiement"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
            save_data('settings.json', settings)
        
        payment_settings = {
            'depositEnabled': settings.get('depositEnabled', True),
            'depositPercentage': settings.get('depositPercentage', 30),
            'depositMinAmount': settings.get('depositMinAmount', 5000),
            'acceptCash': settings.get('acceptCash', True),
            'acceptCard': settings.get('acceptCard', True),
            'acceptMobileMoney': settings.get('acceptMobileMoney', True),
            'acceptPayPal': settings.get('acceptPayPal', True),
            'taxRate': settings.get('taxRate', 0),
            'serviceChargeRate': settings.get('serviceChargeRate', 10)
        }
        
        return jsonify(payment_settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des paramètres de paiement: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/payments', methods=['PUT'])
def update_payment_settings():
    """Mettre à jour les paramètres de paiement"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Aucune donnée fournie'}), 400
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
        
        # Mettre à jour les paramètres de paiement
        if 'depositEnabled' in data:
            settings['depositEnabled'] = data['depositEnabled']
        if 'depositPercentage' in data:
            settings['depositPercentage'] = data['depositPercentage']
        if 'depositMinAmount' in data:
            settings['depositMinAmount'] = data['depositMinAmount']
        if 'acceptCash' in data:
            settings['acceptCash'] = data['acceptCash']
        if 'acceptCard' in data:
            settings['acceptCard'] = data['acceptCard']
        if 'acceptMobileMoney' in data:
            settings['acceptMobileMoney'] = data['acceptMobileMoney']
        if 'acceptPayPal' in data:
            settings['acceptPayPal'] = data['acceptPayPal']
        if 'taxRate' in data:
            settings['taxRate'] = data['taxRate']
        if 'serviceChargeRate' in data:
            settings['serviceChargeRate'] = data['serviceChargeRate']
        
        settings['updatedAt'] = datetime.now().isoformat()
        settings['updatedBy'] = user_data.get('name', 'Unknown')
        
        save_data('settings.json', settings)
        
        return jsonify(settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres de paiement: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/notifications', methods=['GET'])
def get_notification_settings():
    """Récupérer les paramètres de notification"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
            save_data('settings.json', settings)
        
        notification_settings = {
            'emailEnabled': settings.get('emailEnabled', True),
            'smsEnabled': settings.get('smsEnabled', False),
            'notifyNewOrder': settings.get('notifyNewOrder', True),
            'notifyNewReservation': settings.get('notifyNewReservation', True),
            'notifyLowStock': settings.get('notifyLowStock', True),
            'notificationEmail': settings.get('notificationEmail', 'manager@tablefacil.sn'),
            'notificationPhone': settings.get('notificationPhone', '+221 77 XXX XX XX')
        }
        
        return jsonify(notification_settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des paramètres de notification: {str(e)}")
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/settings/notifications', methods=['PUT'])
def update_notification_settings():
    """Mettre à jour les paramètres de notification"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Aucune donnée fournie'}), 400
        
        try:
            settings = load_data('settings.json')
        except FileNotFoundError:
            settings = get_default_settings()
        
        # Mettre à jour les paramètres de notification
        if 'emailEnabled' in data:
            settings['emailEnabled'] = data['emailEnabled']
        if 'smsEnabled' in data:
            settings['smsEnabled'] = data['smsEnabled']
        if 'notifyNewOrder' in data:
            settings['notifyNewOrder'] = data['notifyNewOrder']
        if 'notifyNewReservation' in data:
            settings['notifyNewReservation'] = data['notifyNewReservation']
        if 'notifyLowStock' in data:
            settings['notifyLowStock'] = data['notifyLowStock']
        if 'notificationEmail' in data:
            settings['notificationEmail'] = data['notificationEmail']
        if 'notificationPhone' in data:
            settings['notificationPhone'] = data['notificationPhone']
        
        settings['updatedAt'] = datetime.now().isoformat()
        settings['updatedBy'] = user_data.get('name', 'Unknown')
        
        save_data('settings.json', settings)
        
        return jsonify(settings), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des paramètres de notification: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_default_settings():
    """Obtenir les paramètres par défaut"""
    return {
        # Restaurant
        'restaurantName': 'TableFacil Restaurant',
        'restaurantPhone': '+221 33 XXX XX XX',
        'restaurantEmail': 'contact@tablefacil.sn',
        'restaurantAddress': 'Montréal, Canada',
        'capacity': 100,
        'currency': 'FCFA',
        'openingHours': {
            'monday': {'open': '11:00', 'close': '23:00'},
            'tuesday': {'open': '11:00', 'close': '23:00'},
            'wednesday': {'open': '11:00', 'close': '23:00'},
            'thursday': {'open': '11:00', 'close': '23:00'},
            'friday': {'open': '11:00', 'close': '23:00'},
            'saturday': {'open': '11:00', 'close': '23:00'},
            'sunday': {'open': '11:00', 'close': '23:00'}
        },
        
        # Paiements
        'depositEnabled': True,
        'depositPercentage': 30,
        'depositMinAmount': 5000,
        'acceptCash': True,
        'acceptCard': True,
        'acceptMobileMoney': True,
        'acceptPayPal': True,
        'taxRate': 0,
        'serviceChargeRate': 10,
        
        # Notifications
        'emailEnabled': True,
        'smsEnabled': False,
        'notifyNewOrder': True,
        'notifyNewReservation': True,
        'notifyLowStock': True,
        'notificationEmail': 'manager@tablefacil.sn',
        'notificationPhone': '+221 77 XXX XX XX',
        
        # Métadonnées
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat(),
        'updatedBy': 'System'
    }
