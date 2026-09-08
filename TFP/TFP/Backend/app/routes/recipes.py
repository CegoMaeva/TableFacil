from flask import Blueprint, request, jsonify
from functools import wraps
import json
import os
from datetime import datetime

recipes_bp = Blueprint('recipes', __name__)

# Path to recipes data file
RECIPES_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'recipes.json')

# Import JWT utilities for auth
from app.utils.jwt_utils import verify_token

def load_recipes():
    """Load recipes from JSON file"""
    try:
        with open(RECIPES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_recipes(recipes):
    """Save recipes to JSON file"""
    with open(RECIPES_FILE, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)

def manager_required(f):
    """Decorator to require manager role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(payload, tuple):
            return payload
        
        if not payload:
            return jsonify({'error': 'Token invalide'}), 401
        
        if payload.get('role') != 'gerant':
            return jsonify({'error': 'Accès refusé. Rôle gérant requis.'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

@recipes_bp.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Get all recipes (public endpoint)"""
    try:
        recipes = load_recipes()
        
        # Optional filters
        section = request.args.get('section')
        available_only = request.args.get('available') == 'true'
        
        filtered_recipes = recipes
        
        if section:
            filtered_recipes = [r for r in filtered_recipes if r.get('section') == section]
        
        if available_only:
            filtered_recipes = [r for r in filtered_recipes if r.get('available', True)]
        
        return jsonify(filtered_recipes), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recipes_bp.route('/api/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """Get a single recipe by ID (public endpoint)"""
    try:
        recipes = load_recipes()
        recipe = next((r for r in recipes if r['id'] == recipe_id), None)
        
        if not recipe:
            return jsonify({'error': 'Recette non trouvée'}), 404
        
        return jsonify(recipe), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recipes_bp.route('/api/recipes', methods=['POST'])
@manager_required
def create_recipe():
    """Create a new recipe (manager only)"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'price', 'category', 'description', 'section']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Champ requis manquant: {field}'}), 400
        
        recipes = load_recipes()
        
        # Generate new ID
        if recipes:
            last_id = max([int(r['id'].split('-')[1]) for r in recipes])
            new_id = f"REC-{str(last_id + 1).zfill(3)}"
        else:
            new_id = "REC-001"
        
        # Create new recipe
        new_recipe = {
            'id': new_id,
            'name': data['name'],
            'price': data['price'],
            'category': data['category'],
            'description': data['description'],
            'allergens': data.get('allergens', 'Sans allergènes'),
            'image': data.get('image', ''),
            'section': data['section'],
            'available': data.get('available', True),
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        recipes.append(new_recipe)
        save_recipes(recipes)
        
        return jsonify({
            'message': 'Recette créée avec succès',
            'recipe': new_recipe
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recipes_bp.route('/api/recipes/<recipe_id>', methods=['PUT'])
@manager_required
def update_recipe(recipe_id):
    """Update an existing recipe (manager only)"""
    try:
        data = request.json
        recipes = load_recipes()
        
        # Find recipe index
        recipe_index = next((i for i, r in enumerate(recipes) if r['id'] == recipe_id), None)
        
        if recipe_index is None:
            return jsonify({'error': 'Recette non trouvée'}), 404
        
        # Update recipe (keep id and createdAt)
        updated_recipe = recipes[recipe_index].copy()
        updated_recipe.update({
            'name': data.get('name', updated_recipe['name']),
            'price': data.get('price', updated_recipe['price']),
            'category': data.get('category', updated_recipe['category']),
            'description': data.get('description', updated_recipe['description']),
            'allergens': data.get('allergens', updated_recipe.get('allergens', 'Sans allergènes')),
            'image': data.get('image', updated_recipe.get('image', '')),
            'section': data.get('section', updated_recipe['section']),
            'available': data.get('available', updated_recipe.get('available', True)),
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        })
        
        recipes[recipe_index] = updated_recipe
        save_recipes(recipes)
        
        return jsonify({
            'message': 'Recette mise à jour avec succès',
            'recipe': updated_recipe
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recipes_bp.route('/api/recipes/<recipe_id>', methods=['DELETE'])
@manager_required
def delete_recipe(recipe_id):
    """Delete a recipe (manager only)"""
    try:
        recipes = load_recipes()
        
        # Find and remove recipe
        recipe_index = next((i for i, r in enumerate(recipes) if r['id'] == recipe_id), None)
        
        if recipe_index is None:
            return jsonify({'error': 'Recette non trouvée'}), 404
        
        deleted_recipe = recipes.pop(recipe_index)
        save_recipes(recipes)
        
        return jsonify({
            'message': 'Recette supprimée avec succès',
            'recipe': deleted_recipe
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recipes_bp.route('/api/recipes/<recipe_id>/toggle', methods=['PATCH'])
@manager_required
def toggle_recipe_availability(recipe_id):
    """Toggle recipe availability (manager only)"""
    try:
        recipes = load_recipes()
        
        # Find recipe index
        recipe_index = next((i for i, r in enumerate(recipes) if r['id'] == recipe_id), None)
        
        if recipe_index is None:
            return jsonify({'error': 'Recette non trouvée'}), 404
        
        # Toggle availability
        recipes[recipe_index]['available'] = not recipes[recipe_index].get('available', True)
        recipes[recipe_index]['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
        
        save_recipes(recipes)
        
        return jsonify({
            'message': 'Disponibilité mise à jour',
            'recipe': recipes[recipe_index]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
