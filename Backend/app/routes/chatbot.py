from flask import Blueprint, request, jsonify
from app.services.chatbot_service import ChatbotService
from datetime import datetime
import json

# Créer le blueprint
chatbot = Blueprint('chatbot', __name__, url_prefix='/api/chatbot')
chatbot_service = ChatbotService()

@chatbot.route('/message', methods=['POST'])
def send_message():
    """Endpoint pour envoyer un message au chatbot."""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        user_id = data.get('user_id')
        
        if not user_message:
            return jsonify({
                "success": False,
                "message": "Le message ne peut pas être vide"
            }), 400
        
        # Traiter le message
        response = chatbot_service.process_message(user_message, user_id)
        
        # Ajouter des questions de suivi
        follow_up = chatbot_service.ask_follow_up_questions(user_message)
        if follow_up:
            response['follow_up_questions'] = follow_up
        
        # Ajouter des suggestions de deals
        deals = chatbot_service.suggest_deals_for_user(user_id)
        if deals:
            response['suggested_deals'] = deals
        
        return jsonify({
            "success": True,
            "response": response,
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/reservations/reminders', methods=['POST'])
def send_reservation_reminders():
    """Endpoint pour envoyer les rappels de réservation."""
    try:
        result = chatbot_service.send_reservation_reminders()
        
        return jsonify({
            "success": result.get('success', False),
            "message": result.get('message', ''),
            "reminders_sent": result.get('reminders_sent', 0),
            "timestamp": datetime.now().isoformat()
        }), 200 if result.get('success') else 500
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/info', methods=['GET'])
def get_restaurant_info():
    """Endpoint pour récupérer les informations du restaurant."""
    try:
        info = chatbot_service.get_restaurant_info()
        
        return jsonify({
            "success": True,
            "data": info,
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/deals', methods=['GET'])
def get_deals():
    """Endpoint pour récupérer les promotions."""
    try:
        user_id = request.args.get('user_id')
        deals = chatbot_service.suggest_deals_for_user(user_id)
        
        return jsonify({
            "success": True,
            "deals": deals,
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/quick-answers', methods=['POST'])
def get_quick_answers():
    """Endpoint pour obtenir des réponses rapides."""
    try:
        data = request.get_json()
        question = data.get('question', '').lower()
        user_id = data.get('user_id')
        
        # Mapper des questions couantes à des réponses
        quick_answers = {
            'horaires': 'information',
            'adresse': 'information',
            'téléphone': 'contact',
            'réserver': 'action',
            'promo': 'promotion',
            'allergie': 'information'
        }
        
        response = chatbot_service.process_message(question, user_id)
        
        return jsonify({
            "success": True,
            "response": response,
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/conversation-history', methods=['GET'])
def get_conversation_history():
    """Endpoint pour récupérer l'historique de conversation."""
    try:
        user_id = request.args.get('user_id')
        limit = request.args.get('limit', 10, type=int)
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "user_id requis"
            }), 400
        
        # Implémenter la logique de récupération de l'historique
        # Pour l'instant, retourner une structure vide
        
        return jsonify({
            "success": True,
            "messages": [],
            "timestamp": datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Erreur: {str(e)}"
        }), 500

@chatbot.route('/health', methods=['GET'])
def health_check():
    """Vérifier que le chatbot fonctionne."""
    return jsonify({
        "success": True,
        "status": "Le chatbot est opérationnel",
        "timestamp": datetime.now().isoformat()
    }), 200
