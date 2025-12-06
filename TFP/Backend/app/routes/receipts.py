"""
Routes pour la gestion des reçus de paiement
"""
from flask import Blueprint, request, jsonify, make_response
from app.models.database import load_data, save_data
from app.utils.jwt_utils import verify_token
from app.utils.receipt_generator import generate_receipt_html, generate_receipt_number, save_receipt, calculate_order_total
from datetime import datetime
import os
import json

receipts_bp = Blueprint('receipts', __name__)

@receipts_bp.route('/api/receipts/generate', methods=['POST'])
def generate_receipt():
    """
    Générer un reçu pour un paiement avec calcul des taxes et frais de livraison
    """
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
        
        # Charger la réservation ou commande
        reservations = load_data('reservations.json')
        reservation = next((r for r in reservations if r['id'] == data.get('reservation_id')), None)
        
        # Déterminer le type de transaction
        is_order = 'items' in data and data['items']
        
        # Calculer les taxes et frais de livraison si c'est une commande
        breakdown = None
        amount = data.get('amount', 0)
        
        if is_order:
            breakdown = calculate_order_total(
                data['items'], 
                data.get('delivery_required', False)
            )
            amount = breakdown['total']
        elif reservation:
            amount = data.get('amount', reservation.get('depositAmount', 0))
        
        # Générer le numéro de reçu
        receipt_number = generate_receipt_number(data.get('reservation_id', data.get('order_id', 'UNKNOWN')))
        
        # Préparer les données du reçu
        payment_data = {
            'receipt_number': receipt_number,
            'reservation_id': data.get('reservation_id', ''),
            'order_id': data.get('order_id', ''),
            'customer_name': reservation.get('customer', 'N/A') if reservation else data.get('customer_name', 'Client'),
            'customer_email': reservation.get('email', 'N/A') if reservation else data.get('customer_email', 'N/A'),
            'customer_phone': reservation.get('phone', 'N/A') if reservation else data.get('customer_phone', 'N/A'),
            'reservation_date': reservation.get('date', '') if reservation else '',
            'reservation_time': reservation.get('time', '') if reservation else '',
            'order_date': data.get('order_date', ''),
            'order_type': data.get('order_type', ''),
            'guests': reservation.get('guests', 0) if reservation else 0,
            'amount': amount,
            'payment_method': data.get('payment_method', 'Non spécifié'),
            'transaction_id': data.get('transaction_id', f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            'payment_date': datetime.now().strftime('%d/%m/%Y'),
            'payment_datetime': datetime.now().strftime('%d/%m/%Y à %H:%M:%S'),
            'client_id': user_data.get('user_id'),
            'created_at': datetime.now().isoformat(),
            'type': 'order' if is_order else 'reservation',
            'breakdown': breakdown  # Inclut sous-total, taxes, frais de livraison
        }
        
        # Sauvegarder le reçu
        save_receipt(payment_data)
        
        # Générer le HTML du reçu
        receipt_html = generate_receipt_html(payment_data)
        
        return jsonify({
            'receipt_number': receipt_number,
            'receipt_html': receipt_html,
            'receipt_data': payment_data,
            'breakdown': breakdown  # Retourner les détails du calcul
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la génération du reçu: {str(e)}")
        return jsonify({'error': str(e)}), 500


@receipts_bp.route('/api/receipts/<receipt_number>', methods=['GET'])
def get_receipt(receipt_number):
    """
    Récupérer un reçu spécifique
    """
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
        
        # Charger le reçu
        receipts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'receipts')
        receipt_file = os.path.join(receipts_dir, f"{receipt_number}.json")
        
        if not os.path.exists(receipt_file):
            return jsonify({'error': 'Reçu non trouvé'}), 404
        
        with open(receipt_file, 'r', encoding='utf-8') as f:
            payment_data = json.load(f)
        
        # Vérifier les permissions (client peut voir ses propres reçus)
        if user_data.get('role') != 'gerant' and payment_data.get('client_id') != user_data.get('user_id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Générer le HTML
        receipt_html = generate_receipt_html(payment_data)
        
        return jsonify({
            'receipt_number': receipt_number,
            'receipt_html': receipt_html,
            'receipt_data': payment_data
        }), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération du reçu: {str(e)}")
        return jsonify({'error': str(e)}), 500


@receipts_bp.route('/api/receipts/<receipt_number>/download', methods=['GET'])
def download_receipt(receipt_number):
    """
    Télécharger un reçu au format HTML
    """
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
        
        # Charger le reçu
        receipts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'receipts')
        receipt_file = os.path.join(receipts_dir, f"{receipt_number}.json")
        
        if not os.path.exists(receipt_file):
            return jsonify({'error': 'Reçu non trouvé'}), 404
        
        with open(receipt_file, 'r', encoding='utf-8') as f:
            payment_data = json.load(f)
        
        # Vérifier les permissions
        if user_data.get('role') != 'gerant' and payment_data.get('client_id') != user_data.get('user_id'):
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Générer le HTML
        receipt_html = generate_receipt_html(payment_data)
        
        # Créer la réponse avec le HTML
        response = make_response(receipt_html)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename="Recu_{receipt_number}.html"'
        
        return response
        
    except Exception as e:
        print(f"Erreur lors du téléchargement du reçu: {str(e)}")
        return jsonify({'error': str(e)}), 500


@receipts_bp.route('/api/receipts/client/<client_id>', methods=['GET'])
def get_client_receipts(client_id):
    """
    Récupérer tous les reçus d'un client
    """
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
        
        # Vérifier les permissions
        if user_data.get('role') != 'gerant' and user_data.get('user_id') != client_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Charger tous les reçus
        receipts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'receipts')
        
        if not os.path.exists(receipts_dir):
            return jsonify([]), 200
        
        client_receipts = []
        for filename in os.listdir(receipts_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(receipts_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    receipt_data = json.load(f)
                    if receipt_data.get('client_id') == client_id:
                        client_receipts.append({
                            'receipt_number': receipt_data['receipt_number'],
                            'amount': receipt_data['amount'],
                            'payment_date': receipt_data['payment_date'],
                            'payment_method': receipt_data['payment_method'],
                            'reservation_id': receipt_data['reservation_id'],
                            'customer_name': receipt_data['customer_name']
                        })
        
        # Trier par date (plus récent en premier)
        client_receipts.sort(key=lambda x: x['receipt_number'], reverse=True)
        
        return jsonify(client_receipts), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des reçus du client: {str(e)}")
        return jsonify({'error': str(e)}), 500
