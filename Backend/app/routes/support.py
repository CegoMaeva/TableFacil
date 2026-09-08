"""
Routes de support client (tickets)
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from datetime import datetime
import uuid

support_bp = Blueprint('support', __name__)


def _now_iso():
    return datetime.utcnow().isoformat() + 'Z'


def _is_service_agent(user_data: dict) -> bool:
    """Return True if user has rights to act as service client/manager."""
    return (user_data.get('role') in ['service_client', 'gerant', 'admin']) or (user_data.get('user_type') == 'employee' and user_data.get('role') == 'service_client')


def _build_ticket_summary(ticket: dict) -> str:
    """Generate a short context summary to speed up escalations."""
    messages = ticket.get('messages', [])
    disputes = ticket.get('disputes', [])
    notes = ticket.get('notes', [])

    last_msg = messages[-1]['message'] if messages else 'Aucun message récent'
    open_disputes = [d for d in disputes if d.get('status') in ['open', 'pending']]
    disputes_summary = f"Litiges ouverts: {len(open_disputes)}" if disputes else 'Aucun litige déclaré'
    note_hint = notes[-1]['note'] if notes else 'Pas de note interne'

    parts = [
        f"Ticket {ticket.get('id')} · {ticket.get('title')}",
        f"Statut: {ticket.get('status', 'open')} · Priorité: {ticket.get('priority', 'medium')}",
        f"Dernier message: {last_msg}",
        disputes_summary,
        f"Dernière note: {note_hint}"
    ]
    return ' | '.join(parts)


@support_bp.route('/api/support/tickets', methods=['GET'])
def list_tickets():
    """Retourne les tickets du client courant (ou tous pour gérant/service_client)."""
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

        tickets = load_data('support_tickets.json')
        # Filtrer pour les clients
        if user_data.get('user_type') == 'client':
            cid = user_data.get('user_id') or user_data.get('id')
            tickets = [t for t in tickets if t.get('clientId') == cid]

        # Trier par date desc
        tickets.sort(key=lambda t: t.get('updatedAt') or t.get('createdAt', ''), reverse=True)
        return jsonify(tickets), 200
    except Exception as e:
        print(f"Erreur list_tickets: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets', methods=['POST'])
def create_ticket():
    """Créer un ticket de support."""
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

        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description')
        priority = data.get('priority', 'medium')
        attachments = data.get('attachments') or []

        if not title or not description:
            return jsonify({'error': 'Titre et description requis'}), 400

        ticket = {
            'id': f'TKT-{str(uuid.uuid4())[:8].upper()}',
            'clientId': user_data.get('user_id') or user_data.get('id'),
            'customer': user_data.get('name') or 'Client',
            'title': title,
            'description': description,
            'priority': priority,
            'status': 'open',
            'createdAt': _now_iso(),
            'updatedAt': _now_iso(),
            'attachments': attachments,
            'assignedTo': None,
            'messages': [
                {
                    'id': f'MSG-{str(uuid.uuid4())[:8].upper()}',
                    'sender': user_data.get('name') or 'Client',
                    'senderRole': user_data.get('role') or user_data.get('user_type'),
                    'message': description,
                    'timestamp': _now_iso(),
                    'attachments': attachments,
                }
            ]
        }

        # Initialize service tooling containers
        ticket['notes'] = []
        ticket['disputes'] = []
        ticket['escalations'] = []

        tickets = load_data('support_tickets.json')
        tickets.append(ticket)
        save_data('support_tickets.json', tickets)
        return jsonify(ticket), 201
    except Exception as e:
        print(f"Erreur create_ticket: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets/<ticket_id>/messages', methods=['POST'])
def post_message(ticket_id):
    """Poster un message dans un ticket."""
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

        data = request.get_json() or {}
        message_txt = data.get('message')
        attachments = data.get('attachments') or []
        send_as_client = bool(data.get('as_client')) and _is_service_agent(user_data)
        on_behalf_name = data.get('client_name')
        if not message_txt:
            return jsonify({'error': 'Message requis'}), 400

        tickets = load_data('support_tickets.json')
        idx = next((i for i, t in enumerate(tickets) if t.get('id') == ticket_id), None)
        if idx is None:
            return jsonify({'error': 'Ticket non trouvé'}), 404

        msg = {
            'id': f'MSG-{str(uuid.uuid4())[:8].upper()}',
            'sender': (on_behalf_name if send_as_client and on_behalf_name else tickets[idx].get('customer') if send_as_client else user_data.get('name') or 'Utilisateur'),
            'senderRole': 'client' if send_as_client else (user_data.get('role') or user_data.get('user_type')),
            'message': message_txt,
            'timestamp': _now_iso(),
            'attachments': attachments,
        }
        tickets[idx].setdefault('messages', []).append(msg)
        tickets[idx]['updatedAt'] = _now_iso()

        save_data('support_tickets.json', tickets)
        return jsonify(msg), 201
    except Exception as e:
        print(f"Erreur post_message: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets/<ticket_id>/notes', methods=['POST'])
def add_note(ticket_id):
    """Ajouter une note interne (service client)."""
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
        if not _is_service_agent(user_data):
            return jsonify({'error': 'Accès réservé au service client'}), 403

        data = request.get_json() or {}
        note_txt = data.get('note')
        if not note_txt:
            return jsonify({'error': 'Note requise'}), 400

        tickets = load_data('support_tickets.json')
        idx = next((i for i, t in enumerate(tickets) if t.get('id') == ticket_id), None)
        if idx is None:
            return jsonify({'error': 'Ticket non trouvé'}), 404

        note = {
            'id': f'NOTE-{str(uuid.uuid4())[:8].upper()}',
            'author': user_data.get('name') or 'Service client',
            'authorRole': user_data.get('role') or 'service_client',
            'note': note_txt,
            'timestamp': _now_iso(),
        }

        tickets[idx].setdefault('notes', []).append(note)
        tickets[idx]['updatedAt'] = _now_iso()
        save_data('support_tickets.json', tickets)
        return jsonify(note), 201
    except Exception as e:
        print(f"Erreur add_note: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets/<ticket_id>/disputes', methods=['POST'])
def add_dispute(ticket_id):
    """Déclarer un litige sur un ticket (service client ou client)."""
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

        data = request.get_json() or {}
        reason = data.get('reason')
        amount = data.get('amount')
        details = data.get('details')
        if not reason:
            return jsonify({'error': 'Motif requis'}), 400

        tickets = load_data('support_tickets.json')
        idx = next((i for i, t in enumerate(tickets) if t.get('id') == ticket_id), None)
        if idx is None:
            return jsonify({'error': 'Ticket non trouvé'}), 404

        dispute = {
            'id': f'DSP-{str(uuid.uuid4())[:8].upper()}',
            'raisedBy': user_data.get('name') or 'Utilisateur',
            'role': user_data.get('role') or user_data.get('user_type'),
            'reason': reason,
            'amount': amount,
            'details': details,
            'status': 'open',
            'createdAt': _now_iso(),
            'updatedAt': _now_iso()
        }

        tickets[idx].setdefault('disputes', []).append(dispute)
        tickets[idx]['updatedAt'] = _now_iso()
        save_data('support_tickets.json', tickets)
        return jsonify(dispute), 201
    except Exception as e:
        print(f"Erreur add_dispute: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets/<ticket_id>/history', methods=['GET'])
def ticket_history(ticket_id):
    """Retourne un historique chronologique (messages, notes, litiges)."""
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

        tickets = load_data('support_tickets.json')
        ticket = next((t for t in tickets if t.get('id') == ticket_id), None)
        if not ticket:
            return jsonify({'error': 'Ticket non trouvé'}), 404

        timeline = []
        for msg in ticket.get('messages', []):
            timeline.append({
                'id': msg.get('id'),
                'type': 'message',
                'author': msg.get('sender'),
                'role': msg.get('senderRole'),
                'content': msg.get('message'),
                'timestamp': msg.get('timestamp')
            })
        for note in ticket.get('notes', []):
            timeline.append({
                'id': note.get('id'),
                'type': 'note',
                'author': note.get('author'),
                'role': note.get('authorRole'),
                'content': note.get('note'),
                'timestamp': note.get('timestamp')
            })
        for dispute in ticket.get('disputes', []):
            timeline.append({
                'id': dispute.get('id'),
                'type': 'dispute',
                'author': dispute.get('raisedBy'),
                'role': dispute.get('role'),
                'content': dispute.get('reason'),
                'details': dispute.get('details'),
                'amount': dispute.get('amount'),
                'status': dispute.get('status'),
                'timestamp': dispute.get('createdAt')
            })

        timeline.sort(key=lambda e: e.get('timestamp') or '', reverse=False)
        return jsonify(timeline), 200
    except Exception as e:
        print(f"Erreur ticket_history: {str(e)}")
        return jsonify({'error': str(e)}), 500


@support_bp.route('/api/support/tickets/<ticket_id>/escalate', methods=['POST'])
def escalate_ticket(ticket_id):
    """Escalader un ticket vers le service client avec résumé de contexte."""
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

        data = request.get_json() or {}
        reason = data.get('reason') or 'Demande complexe détectée'

        tickets = load_data('support_tickets.json')
        idx = next((i for i, t in enumerate(tickets) if t.get('id') == ticket_id), None)
        if idx is None:
            return jsonify({'error': 'Ticket non trouvé'}), 404

        ticket = tickets[idx]
        ticket.setdefault('escalations', [])
        ticket.setdefault('notes', [])
        ticket.setdefault('disputes', [])
        ticket.setdefault('messages', [])

        summary = _build_ticket_summary(ticket)
        escalation = {
            'id': f'ESC-{str(uuid.uuid4())[:8].upper()}',
            'by': user_data.get('name') or 'Utilisateur',
            'role': user_data.get('role') or user_data.get('user_type'),
            'reason': reason,
            'summary': summary,
            'timestamp': _now_iso(),
            'status': 'escalated'
        }

        ticket['escalations'].append(escalation)
        # Bump status to in_progress unless already resolved/closed
        if ticket.get('status') in [None, 'open', 'pending']:
            ticket['status'] = 'in_progress'
        ticket['updatedAt'] = _now_iso()

        save_data('support_tickets.json', tickets)
        return jsonify({'escalation': escalation, 'summary': summary}), 201
    except Exception as e:
        print(f"Erreur escalate_ticket: {str(e)}")
        return jsonify({'error': str(e)}), 500
