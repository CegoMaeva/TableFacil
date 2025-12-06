"""
Routes pour les propositions d'inventaire soumises par les cuisiniers
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

inventory_proposals_bp = Blueprint('inventory_proposals', __name__)

DATA_FILE = 'inventory_proposals.json'

def verify_user_token(auth_header):
    if not auth_header:
        return None, (jsonify({'error': 'Token manquant'}), 401)
    token = auth_header.replace('Bearer ', '')
    user_data = verify_token(token)
    if isinstance(user_data, tuple):
        return None, user_data
    return user_data, None


@inventory_proposals_bp.route('/api/inventory/proposals', methods=['POST'])
def create_proposal():
    """Créer une proposition d'ajout/ajustement d'inventaire (accessible aux employés)
    Body attendu: { name, quantity, unit, notes?, type: 'add'|'adjust' }
    """
    try:
        auth_header = request.headers.get('Authorization')
        user_data, err = verify_user_token(auth_header)
        if err:
            return err

        data = request.get_json() or {}
        name = data.get('name')
        quantity = data.get('quantity')
        unit = data.get('unit')
        prop_type = data.get('type', 'add')

        if not name or quantity is None or not unit:
            return jsonify({'error': 'name, quantity et unit requis'}), 400

        proposals = load_data(DATA_FILE)
        prop_id = f"IP-{str(uuid.uuid4())[:8].upper()}"
        proposal = {
            'id': prop_id,
            'name': name,
            'quantity': quantity,
            'unit': unit,
            'type': prop_type,
            'notes': data.get('notes', ''),
            'status': 'pending',
            'createdBy': {
                'id': user_data.get('id'),
                'name': user_data.get('email') or user_data.get('id'),
                'role': user_data.get('role')
            },
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        proposals.append(proposal)
        save_data(DATA_FILE, proposals)
        return jsonify(proposal), 201
    except Exception as e:
        print(f"Erreur create_proposal: {e}")
        return jsonify({'error': str(e)}), 500


@inventory_proposals_bp.route('/api/inventory/proposals', methods=['GET'])
def list_proposals():
    """Lister les propositions. Les gérants voient tout; les employés ne voient que les leurs."""
    try:
        auth_header = request.headers.get('Authorization')
        user_data, err = verify_user_token(auth_header)
        if err:
            return err

        proposals = load_data(DATA_FILE)
        # If manager, return all
        if user_data.get('role') == 'gerant':
            return jsonify(proposals), 200

        # Else return only those created by the user
        mine = [p for p in proposals if p.get('createdBy', {}).get('id') == user_data.get('id')]
        return jsonify(mine), 200
    except Exception as e:
        print(f"Erreur list_proposals: {e}")
        return jsonify({'error': str(e)}), 500


@inventory_proposals_bp.route('/api/inventory/proposals/<prop_id>/approve', methods=['PATCH'])
def approve_proposal(prop_id):
    """Valider une proposition (gérant uniquement). Applique l'ajustement à l'inventaire."""
    try:
        auth_header = request.headers.get('Authorization')
        user_data, err = verify_user_token(auth_header)
        if err:
            return err
        if user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé'}), 403

        proposals = load_data(DATA_FILE)
        idx = next((i for i, p in enumerate(proposals) if p['id'] == prop_id), None)
        if idx is None:
            return jsonify({'error': 'Proposition non trouvée'}), 404

        proposal = proposals[idx]
        if proposal['status'] != 'pending':
            return jsonify({'error': 'Proposition déjà traitée'}), 400

        # Apply to inventory: find item by name (case-insensitive), if found adjust quantity, else create new item
        inventory = load_data('inventory.json')
        name = proposal['name'].strip()
        found_idx = next((i for i, it in enumerate(inventory) if it.get('name','').strip().lower() == name.lower()), None)
        if found_idx is not None:
            # adjust quantity
            inventory[found_idx]['quantity'] = inventory[found_idx].get('quantity', 0) + proposal.get('quantity', 0)
            inventory[found_idx]['lastRestocked'] = datetime.utcnow().isoformat()
            updated_item = inventory[found_idx]
        else:
            # create minimal item
            item_id = f"INV-{str(uuid.uuid4())[:8].upper()}"
            new_item = {
                'id': item_id,
                'name': proposal['name'],
                'category': 'Autre',
                'unit': proposal.get('unit', ''),
                'quantity': proposal.get('quantity', 0),
                'minQuantity': 0,
                'price': 0,
                'supplier': '',
                'lastRestocked': datetime.utcnow().isoformat()
            }
            inventory.append(new_item)
            updated_item = new_item

        save_data('inventory.json', inventory)

        # mark proposal approved
        proposal['status'] = 'approved'
        proposal['updatedAt'] = datetime.utcnow().isoformat()
        proposals[idx] = proposal
        save_data(DATA_FILE, proposals)

        return jsonify({'proposal': proposal, 'updatedInventory': updated_item}), 200
    except Exception as e:
        print(f"Erreur approve_proposal: {e}")
        return jsonify({'error': str(e)}), 500


@inventory_proposals_bp.route('/api/inventory/proposals/<prop_id>/reject', methods=['PATCH'])
def reject_proposal(prop_id):
    try:
        auth_header = request.headers.get('Authorization')
        user_data, err = verify_user_token(auth_header)
        if err:
            return err
        if user_data.get('role') != 'gerant':
            return jsonify({'error': 'Accès non autorisé'}), 403

        proposals = load_data(DATA_FILE)
        idx = next((i for i, p in enumerate(proposals) if p['id'] == prop_id), None)
        if idx is None:
            return jsonify({'error': 'Proposition non trouvée'}), 404

        proposal = proposals[idx]
        if proposal['status'] != 'pending':
            return jsonify({'error': 'Proposition déjà traitée'}), 400

        proposal['status'] = 'rejected'
        proposal['updatedAt'] = datetime.utcnow().isoformat()
        proposals[idx] = proposal
        save_data(DATA_FILE, proposals)

        return jsonify(proposal), 200
    except Exception as e:
        print(f"Erreur reject_proposal: {e}")
        return jsonify({'error': str(e)}), 500
