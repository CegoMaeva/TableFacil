from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data, db
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

communications_bp = Blueprint('communications', __name__)


def _now_iso():
    return datetime.now().isoformat()


def _resolve_participant(participant: str):
    """Normalize participant identifiers.
    - employee:<id> -> employee id if exists
    - emp id (emp_...) -> keep if exists
    - email -> try resolve to user id, otherwise keep email
    - phone or other strings -> keep as-is
    """
    if not participant:
        return participant

    # employee:<id>
    if participant.startswith('employee:'):
        emp_id = participant.split(':', 1)[1]
        emp = db.get_employee_by_id(emp_id)
        if emp:
            return emp.get('id')
        # fallback: maybe passed email
        emp_by_email = db.get_employee_by_email(emp_id)
        if emp_by_email:
            return emp_by_email.get('id')
        return emp_id

    # if matches employee id
    if participant.startswith('emp_'):
        emp = db.get_employee_by_id(participant)
        if emp:
            return emp.get('id')

    # email-like
    if '@' in participant:
        user = db.get_user_by_email(participant)
        if user:
            return user.get('id')
        # try employee by email
        emp = db.get_employee_by_email(participant)
        if emp:
            return emp.get('id')
        return participant

    # otherwise return as-is (phone numbers or free-form)
    return participant


@communications_bp.route('/threads', methods=['GET'])
def list_threads():
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

    channel = request.args.get('channel', 'clients')
    threads = load_data('communications.json')
    # threads is expected to be a list
    filtered = [t for t in threads if t.get('channel') == channel]
    # simple unread calculation
    for t in filtered:
        t['unread'] = sum(1 for m in t.get('messages', []) if not m.get('read') and m.get('to') == user.get('id'))
    return jsonify(filtered), 200


@communications_bp.route('/threads', methods=['POST'])
def create_thread():
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

    data = request.get_json() or {}
    required = ['channel', 'subject', 'participants']
    for r in required:
        if r not in data:
            return jsonify({'error': f'Champ {r} requis'}), 400

    threads = load_data('communications.json')
    thread_id = f"th_{uuid.uuid4().hex[:8]}"
    participants = [ _resolve_participant(p) for p in data.get('participants', []) ]
    thread = {
        'id': thread_id,
        'channel': data['channel'],
        'subject': data['subject'],
        'participants': participants,
        'createdAt': _now_iso(),
        'updatedAt': _now_iso(),
        'messages': data.get('messages', [])
    }
    threads.append(thread)
    save_data('communications.json', threads)
    return jsonify(thread), 201


@communications_bp.route('/threads/<thread_id>/messages', methods=['POST'])
def post_message(thread_id):
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
    if 'content' not in payload or 'to' not in payload:
        return jsonify({'error': 'content et to sont requis'}), 400

    threads = load_data('communications.json')
    thread = next((t for t in threads if t.get('id') == thread_id), None)
    if not thread:
        return jsonify({'error': 'Thread non trouvé'}), 404

    # normalize recipient
    to_val = _resolve_participant(payload.get('to'))
    msg = {
        'id': f"m_{uuid.uuid4().hex[:8]}",
        'from': user.get('id'),
        'to': to_val,
        'content': payload.get('content'),
        'createdAt': _now_iso(),
        'read': False
    }
    thread.setdefault('messages', []).append(msg)
    thread['updatedAt'] = _now_iso()
    save_data('communications.json', threads)
    return jsonify(msg), 201


@communications_bp.route('/threads/<thread_id>/mark-read', methods=['PATCH'])
def mark_thread_read(thread_id):
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

    threads = load_data('communications.json')
    thread = next((t for t in threads if t.get('id') == thread_id), None)
    if not thread:
        return jsonify({'error': 'Thread non trouvé'}), 404

    for m in thread.get('messages', []):
        if m.get('to') == user.get('id'):
            m['read'] = True
    save_data('communications.json', threads)
    return jsonify({'message': 'Thread marqué lu'}), 200
