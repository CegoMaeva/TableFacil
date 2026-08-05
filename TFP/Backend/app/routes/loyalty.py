from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os
from ..utils.jwt_utils import verify_token

loyalty_bp = Blueprint('loyalty', __name__)

# Helpers pour charger/sauvegarder les données
def load_data(filename):
    filepath = os.path.join('data', filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_data(filename, data):
    filepath = os.path.join('data', filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Niveaux de fidélité
LOYALTY_LEVELS = {
    'Bronze': {'min_points': 0, 'max_points': 499, 'discount': 0, 'color': '#CD7F32'},
    'Silver': {'min_points': 500, 'max_points': 999, 'discount': 5, 'color': '#C0C0C0'},
    'Gold': {'min_points': 1000, 'max_points': 1999, 'discount': 10, 'color': '#FFD700'},
    'Platinum': {'min_points': 2000, 'max_points': float('inf'), 'discount': 15, 'color': '#E5E4E2'}
}

def get_user_level(points):
    """Déterminer le niveau basé sur les points"""
    for level, info in LOYALTY_LEVELS.items():
        if info['min_points'] <= points <= info['max_points']:
            return level
    return 'Bronze'

def calculate_points_from_amount(amount):
    """1 point pour chaque 100 FCFA dépensés"""
    return int(amount / 100)

@loyalty_bp.route('/api/loyalty/test', methods=['GET'])
def test():
    return {'message': 'Loyalty module loaded'}, 200

@loyalty_bp.route('/api/loyalty/profile', methods=['GET'])
def get_loyalty_profile():
    """Récupérer le profil de fidélité du client"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        user_id = user_data.get('user_id')
        loyalty_data = load_data('loyalty.json')
        
        # Chercher le profil existant
        user_loyalty = next((l for l in loyalty_data if l['userId'] == user_id), None)
        
        if not user_loyalty:
            # Créer un nouveau profil
            user_loyalty = {
                'userId': user_id,
                'userName': user_data.get('username'),
                'points': 0,
                'totalPointsEarned': 0,
                'totalPointsSpent': 0,
                'level': 'Bronze',
                'joinDate': datetime.now().isoformat(),
                'transactions': []
            }
            loyalty_data.append(user_loyalty)
            save_data('loyalty.json', loyalty_data)
        else:
            # Mettre à jour le niveau basé sur les points actuels
            user_loyalty['level'] = get_user_level(user_loyalty['points'])
        
        # Ajouter les infos du niveau
        level_info = LOYALTY_LEVELS[user_loyalty['level']]
        user_loyalty['levelInfo'] = level_info
        
        # Calculer le prochain niveau
        next_level = None
        for level, info in LOYALTY_LEVELS.items():
            if info['min_points'] > user_loyalty['points']:
                next_level = {
                    'name': level,
                    'requiredPoints': info['min_points'],
                    'pointsToGo': info['min_points'] - user_loyalty['points']
                }
                break
        user_loyalty['nextLevel'] = next_level
        
        return jsonify(user_loyalty), 200
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/api/loyalty/add-points', methods=['POST'])
def add_points():
    """Ajouter des points (automatique après une commande)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        data = request.get_json()
        user_id = data.get('userId') or user_data.get('user_id')
        amount = data.get('amount', 0)
        order_id = data.get('orderId')
        
        points_earned = calculate_points_from_amount(amount)
        
        loyalty_data = load_data('loyalty.json')
        user_index = next((i for i, l in enumerate(loyalty_data) if l['userId'] == user_id), None)
        
        if user_index is None:
            return jsonify({'error': 'Profil fidélité non trouvé'}), 404
        
        # Ajouter les points
        loyalty_data[user_index]['points'] += points_earned
        loyalty_data[user_index]['totalPointsEarned'] += points_earned
        loyalty_data[user_index]['level'] = get_user_level(loyalty_data[user_index]['points'])
        
        # Ajouter la transaction
        transaction = {
            'id': f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'type': 'earn',
            'points': points_earned,
            'amount': amount,
            'orderId': order_id,
            'date': datetime.now().isoformat(),
            'description': f"Points gagnés - Commande {order_id}"
        }
        loyalty_data[user_index]['transactions'].insert(0, transaction)
        
        save_data('loyalty.json', loyalty_data)
        
        return jsonify({
            'message': f'{points_earned} points ajoutés !',
            'loyalty': loyalty_data[user_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/api/loyalty/redeem', methods=['POST'])
def redeem_points():
    """Utiliser des points"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        data = request.get_json()
        user_id = user_data.get('user_id')
        points_to_redeem = data.get('points', 0)
        reward_name = data.get('rewardName', 'Réduction')
        
        loyalty_data = load_data('loyalty.json')
        user_index = next((i for i, l in enumerate(loyalty_data) if l['userId'] == user_id), None)
        
        if user_index is None:
            return jsonify({'error': 'Profil fidélité non trouvé'}), 404
        
        if loyalty_data[user_index]['points'] < points_to_redeem:
            return jsonify({'error': 'Points insuffisants'}), 400
        
        # Retirer les points
        loyalty_data[user_index]['points'] -= points_to_redeem
        loyalty_data[user_index]['totalPointsSpent'] += points_to_redeem
        loyalty_data[user_index]['level'] = get_user_level(loyalty_data[user_index]['points'])
        
        # Ajouter la transaction
        transaction = {
            'id': f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'type': 'redeem',
            'points': -points_to_redeem,
            'reward': reward_name,
            'date': datetime.now().isoformat(),
            'description': f"Points utilisés - {reward_name}"
        }
        loyalty_data[user_index]['transactions'].insert(0, transaction)
        
        save_data('loyalty.json', loyalty_data)
        
        return jsonify({
            'message': f'{points_to_redeem} points utilisés !',
            'loyalty': loyalty_data[user_index]
        }), 200
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/api/loyalty/all', methods=['GET'])
def get_all_loyalty():
    """Récupérer tous les profils de fidélité (gérant uniquement)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        loyalty_data = load_data('loyalty.json')
        
        # Mettre à jour les niveaux
        for user in loyalty_data:
            user['level'] = get_user_level(user['points'])
            user['levelInfo'] = LOYALTY_LEVELS[user['level']]
        
        # Trier par points décroissants
        loyalty_data.sort(key=lambda x: x['points'], reverse=True)
        
        return jsonify(loyalty_data), 200
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500

@loyalty_bp.route('/api/loyalty/stats', methods=['GET'])
def get_loyalty_stats():
    """Statistiques du programme de fidélité (gérant uniquement)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        loyalty_data = load_data('loyalty.json')
        
        stats = {
            'totalMembers': len(loyalty_data),
            'totalPointsDistributed': sum(u['totalPointsEarned'] for u in loyalty_data),
            'totalPointsRedeemed': sum(u['totalPointsSpent'] for u in loyalty_data),
            'averagePoints': int(sum(u['points'] for u in loyalty_data) / len(loyalty_data)) if loyalty_data else 0,
            'levelDistribution': {
                'Bronze': len([u for u in loyalty_data if get_user_level(u['points']) == 'Bronze']),
                'Silver': len([u for u in loyalty_data if get_user_level(u['points']) == 'Silver']),
                'Gold': len([u for u in loyalty_data if get_user_level(u['points']) == 'Gold']),
                'Platinum': len([u for u in loyalty_data if get_user_level(u['points']) == 'Platinum'])
            }
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({'error': str(e)}), 500
