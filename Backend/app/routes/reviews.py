"""
Routes pour les avis clients
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Récupérer tous les avis ou filtrer"""
    try:
        reviews = load_data('reviews.json')
        # load_data retourne déjà une liste, pas un dict
        users_data = load_data('users.json')
        # Si c'est un dict avec une clé 'users', l'extraire, sinon c'est déjà une liste
        users = users_data.get('users', users_data) if isinstance(users_data, dict) else users_data
        
        # Enrichir les avis avec les vrais noms depuis la base utilisateurs
        for review in reviews:
            if not review.get('clientName') or review.get('clientName') == 'Client':
                # Chercher le user par clientId
                user = next((u for u in users if u.get('id') == review.get('clientId')), None)
                if user:
                    review['clientName'] = user.get('name', 'Client')
        
        # Filtrer par statut si demandé (pour modération)
        status_filter = request.args.get('status')
        if status_filter:
            reviews = [r for r in reviews if r.get('status') == status_filter]
        
        # Filtrer par recette si demandé
        recipe_filter = request.args.get('recipeId')
        if recipe_filter:
            reviews = [r for r in reviews if str(r.get('recipeId')) == str(recipe_filter)]
        
        # Trier par date (plus récent en premier)
        reviews.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return jsonify({'reviews': reviews}), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews/<review_id>', methods=['GET'])
def get_review(review_id):
    """Récupérer un avis spécifique"""
    try:
        reviews = load_data('reviews.json')
        review = next((r for r in reviews if r['id'] == review_id), None)
        
        if not review:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        return jsonify(review), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération de l'avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews', methods=['POST'])
def create_review():
    """Créer un nouvel avis"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        # Les clients sont identifiés par 'user_type' === 'client'
        if not user_data or user_data.get('user_type') != 'client':
            return jsonify({'error': 'Accès non autorisé - Réservé aux clients'}), 403
        
        data = request.get_json()
        
        # Validation
        required_fields = ['rating', 'comment']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ {field} requis'}), 400
        
        # Valider la note
        rating = data['rating']
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return jsonify({'error': 'La note doit être entre 1 et 5'}), 400
        
        # Générer un ID unique
        review_id = f"REV-{str(uuid.uuid4())[:8].upper()}"
        
        # Créer l'avis
        new_review = {
            'id': review_id,
            'clientId': user_data.get('user_id'),
            'clientName': user_data.get('name', 'Client'),
            'rating': rating,
            'comment': data['comment'],
            # Optionally link to a recipe
            'recipeId': data.get('recipeId'),
            'orderId': data.get('orderId'),
            'status': 'approved',  # pending, approved, rejected
            'response': None,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        reviews = load_data('reviews.json')
        reviews.append(new_review)
        save_data('reviews.json', reviews)
        
        return jsonify(new_review), 201
        
    except Exception as e:
        print(f"Erreur lors de la création de l'avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews/<review_id>', methods=['PUT'])
def update_review(review_id):
    """Mettre à jour un avis"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        reviews = load_data('reviews.json')
        review_index = next((i for i, r in enumerate(reviews) if r['id'] == review_id), None)
        
        if review_index is None:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        review = reviews[review_index]
        
        # Vérifier les permissions
        if user_data.get('role') == 'client':
            if review.get('clientId') != user_data.get('user_id'):
                return jsonify({'error': 'Accès non autorisé'}), 403
            allowed_fields = ['rating', 'comment']
        else:
            # Les managers peuvent modifier le statut et ajouter une réponse
            allowed_fields = ['status', 'response']
        
        data = request.get_json()
        
        # Mise à jour des champs
        for field in allowed_fields:
            if field in data:
                review[field] = data[field]
        
        review['updatedAt'] = datetime.now().isoformat()
        
        reviews[review_index] = review
        save_data('reviews.json', reviews)
        
        return jsonify(review), 200
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour de l'avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews/<review_id>/respond', methods=['POST'])
def respond_to_review(review_id):
    """Répondre à un avis (gérant seulement)"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data or user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        data = request.get_json()
        response_text = data.get('response')
        
        if not response_text:
            return jsonify({'error': 'Réponse requise'}), 400
        
        reviews = load_data('reviews.json')
        review_index = next((i for i, r in enumerate(reviews) if r['id'] == review_id), None)
        
        if review_index is None:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        reviews[review_index]['response'] = {
            'text': response_text,
            'author': user_data.get('name', 'Gérant'),
            'date': datetime.now().isoformat()
        }
        reviews[review_index]['updatedAt'] = datetime.now().isoformat()
        
        save_data('reviews.json', reviews)
        
        return jsonify(reviews[review_index]), 200
        
    except Exception as e:
        print(f"Erreur lors de la réponse à l'avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews/<review_id>', methods=['DELETE'])
def delete_review(review_id):
    """Supprimer un avis"""
    try:
        # Vérifier le token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = verify_token(token)
        if not user_data:
            return jsonify({'error': 'Token invalide'}), 401
        
        reviews = load_data('reviews.json')
        review_index = next((i for i, r in enumerate(reviews) if r['id'] == review_id), None)
        
        if review_index is None:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        review = reviews[review_index]
        
        # Vérifier les permissions
        if user_data.get('role') == 'client' and review.get('clientId') != user_data.get('user_id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        if user_data.get('role') == 'client':
            return jsonify({'error': 'Les clients ne peuvent pas supprimer leurs avis, contactez le gérant'}), 403
        
        # Seuls les gérants peuvent supprimer
        if user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        deleted_review = reviews.pop(review_index)
        save_data('reviews.json', reviews)
        
        return jsonify({'message': 'Avis supprimé', 'review': deleted_review}), 200
        
    except Exception as e:
        print(f"Erreur lors de la suppression de l'avis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/api/reviews/stats', methods=['GET'])
def get_reviews_stats():
    """Récupérer les statistiques des avis"""
    try:
        reviews = load_data('reviews.json')
        # Si on demande les stats pour une recette spécifique
        recipe_filter = request.args.get('recipeId')
        if recipe_filter:
            reviews = [r for r in reviews if str(r.get('recipeId')) == str(recipe_filter)]
        
        if not reviews:
            return jsonify({
                'totalReviews': 0,
                'averageRating': 0,
                'ratingDistribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }), 200
        
        # Calculer la note moyenne
        total_rating = sum(r.get('rating', 0) for r in reviews)
        average_rating = total_rating / len(reviews)
        
        # Distribution des notes
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating = int(review.get('rating', 0))
            if 1 <= rating <= 5:
                rating_distribution[rating] += 1
        
        stats = {
            'totalReviews': len(reviews),
            'averageRating': round(average_rating, 1),
            'ratingDistribution': rating_distribution
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Erreur lors du calcul des statistiques: {str(e)}")
        return jsonify({'error': str(e)}), 500
