from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

calls_bp = Blueprint('calls', __name__)


def _now_iso():
    return datetime.now().isoformat()


@calls_bp.route('/', methods=['GET'])
def list_calls():
    # Allow CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    auth = request.headers.get('Authorization')
    if not auth:
        return jsonify({'error': 'Token manquant'}), 401
    token = auth.replace('Bearer ', '')
    user = verify_token(token)
    if not user:
        return jsonify({'error': 'Token invalide'}), 401

    calls = load_data('calls.json')
    # Optionally filter by source
    source = request.args.get('source')
    if source:
        calls = [c for c in calls if c.get('source') == source]
    # Server-side priority: waiting 'livreur' first, then other waiting, then ongoing, then completed
    def order_key(c):
        status = c.get('status')
        src = c.get('source')
        if status == 'waiting' and src == 'livreur':
            return (0, c.get('createdAt'))
        if status == 'waiting':
            return (1, c.get('createdAt'))
        if status == 'ongoing':
            return (2, c.get('createdAt'))
        return (3, c.get('createdAt'))

    calls.sort(key=order_key)
    return jsonify(calls), 200


@calls_bp.route('/', methods=['POST'])
def create_call():
    # Allow CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    auth = request.headers.get('Authorization')
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    # incoming calls may be unauthenticated (from external PBX) - allow optional token
    user = verify_token(token) if token else {'id': 'system'}

    payload = request.get_json() or {}
    required = ['caller', 'source']
    for r in required:
        if r not in payload:
            return jsonify({'error': f'Champ {r} requis'}), 400

    calls = load_data('calls.json')
    call_id = f"call_{uuid.uuid4().hex[:8]}"
    call = {
        'id': call_id,
        'caller': payload['caller'],
        'source': payload['source'],  # client | fournisseur | livreur
        'reference': payload.get('reference'),
        'status': 'waiting',
        'assignedTo': None,
        'createdAt': _now_iso(),
        'updatedAt': _now_iso(),
        'notes': payload.get('notes', '')
    }
    calls.append(call)
    save_data('calls.json', calls)
    return jsonify(call), 201


@calls_bp.route('/<call_id>/assign', methods=['PATCH'])
def assign_call(call_id):
    # Allow CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    auth = request.headers.get('Authorization')
    if not auth:
        return jsonify({'error': 'Token manquant'}), 401
    token = auth.replace('Bearer ', '')
    user = verify_token(token)
    if not user:
        return jsonify({'error': 'Token invalide'}), 401

    payload = request.get_json() or {}
    # accept either 'assignee' or 'employee_id' (frontend uses employee_id)
    assignee = payload.get('assignee') or payload.get('employee_id')
    if not assignee:
        return jsonify({'error': 'assignee requis'}), 400

    calls = load_data('calls.json')
    call = next((c for c in calls if c.get('id') == call_id), None)
    if not call:
        return jsonify({'error': 'Appel non trouvé'}), 404

    call['assignedTo'] = assignee
    call['status'] = 'ongoing'
    call['updatedAt'] = _now_iso()
    save_data('calls.json', calls)
    return jsonify(call), 200


@calls_bp.route('/<call_id>/complete', methods=['PATCH'])
def complete_call(call_id):
    # Allow CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    auth = request.headers.get('Authorization')
    if not auth:
        return jsonify({'error': 'Token manquant'}), 401
    token = auth.replace('Bearer ', '')
    user = verify_token(token)
    if not user:
        return jsonify({'error': 'Token invalide'}), 401

    payload = request.get_json() or {}
    outcome = payload.get('outcome', 'completed')

    calls = load_data('calls.json')
    call = next((c for c in calls if c.get('id') == call_id), None)
    if not call:
        return jsonify({'error': 'Appel non trouvé'}), 404

    call['status'] = 'completed'
    call['outcome'] = outcome
    call['updatedAt'] = _now_iso()
    save_data('calls.json', calls)
    return jsonify(call), 200
