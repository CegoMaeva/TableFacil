"""
Gestionnaire de conversations du chatbot avec persistance et nettoyage automatique.
Les conversations sont conservées pendant 3 jours puis supprimées automatiquement.
"""
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional


CONVERSATIONS_FILE = os.path.join(os.path.dirname(__file__), '../../data/conversations.json')


def _load_conversations() -> List[Dict]:
    """Charge toutes les conversations depuis le fichier JSON."""
    try:
        if os.path.exists(CONVERSATIONS_FILE):
            with open(CONVERSATIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Erreur chargement conversations: {e}")
        return []


def _save_conversations(conversations: List[Dict]) -> bool:
    """Sauvegarde les conversations dans le fichier JSON."""
    try:
        os.makedirs(os.path.dirname(CONVERSATIONS_FILE), exist_ok=True)
        with open(CONVERSATIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(conversations, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Erreur sauvegarde conversations: {e}")
        return False


def clean_old_conversations() -> int:
    """
    Supprime les conversations plus anciennes que 3 jours.
    Retourne le nombre de conversations supprimées.
    """
    conversations = _load_conversations()
    cutoff_date = datetime.utcnow() - timedelta(days=3)
    
    # Filtrer les conversations récentes (< 3 jours)
    filtered = []
    deleted_count = 0
    
    for conv in conversations:
        try:
            # Vérifier la date du dernier message
            messages = conv.get('messages', [])
            if not messages:
                deleted_count += 1
                continue
            
            last_message = messages[-1]
            timestamp_str = last_message.get('timestamp', '')
            
            # Parser le timestamp (avec ou sans timezone)
            if timestamp_str.endswith('Z'):
                timestamp_str = timestamp_str[:-1] + '+00:00'
            
            last_timestamp = datetime.fromisoformat(timestamp_str)
            
            # Convertir en UTC naive si nécessaire
            if last_timestamp.tzinfo is not None:
                last_timestamp = last_timestamp.replace(tzinfo=None)
            
            if last_timestamp >= cutoff_date:
                filtered.append(conv)
            else:
                deleted_count += 1
        except Exception as e:
            print(f"Erreur traitement conversation: {e}")
            # En cas d'erreur, on garde la conversation par sécurité
            filtered.append(conv)
    
    if deleted_count > 0:
        _save_conversations(filtered)
        print(f"Nettoyage: {deleted_count} conversation(s) supprimée(s)")
    
    return deleted_count


def get_user_conversation(user_id: str) -> Optional[Dict]:
    """
    Récupère la conversation d'un utilisateur.
    Nettoie automatiquement les anciennes conversations avant.
    """
    # Nettoyer les anciennes conversations
    clean_old_conversations()
    
    conversations = _load_conversations()
    
    for conv in conversations:
        if conv.get('user_id') == user_id:
            return conv
    
    return None


def is_first_message_today(user_id: str) -> bool:
    """
    Vérifie si c'est le premier message de l'utilisateur aujourd'hui.
    
    Args:
        user_id: ID de l'utilisateur
    
    Returns:
        True si c'est le premier message du jour, False sinon
    """
    conversation = get_user_conversation(user_id)
    
    if not conversation:
        return True  # Pas de conversation = premier message
    
    messages = conversation.get('messages', [])
    if not messages:
        return True  # Pas de messages = premier message
    
    try:
        # Récupérer le dernier message
        last_message = messages[-1]
        timestamp_str = last_message.get('timestamp', '')
        
        # Parser le timestamp (avec ou sans timezone)
        if timestamp_str.endswith('Z'):
            timestamp_str = timestamp_str[:-1] + '+00:00'
        
        last_timestamp = datetime.fromisoformat(timestamp_str)
        
        # Convertir en UTC naive si nécessaire
        if last_timestamp.tzinfo is not None:
            last_timestamp = last_timestamp.replace(tzinfo=None)
        
        # Vérifier si le dernier message est d'aujourd'hui
        today = datetime.utcnow().date()
        last_date = last_timestamp.date()
        
        # Si le dernier message n'est pas d'aujourd'hui, c'est un nouveau jour
        return last_date < today
    except Exception as e:
        print(f"Erreur vérification premier message: {e}")
        return False  # En cas d'erreur, on ne dit pas bonjour


def save_message(user_id: str, message: str, response: str, role: str = 'client') -> bool:
    """
    Enregistre un message et sa réponse dans l'historique de conversation.
    
    Args:
        user_id: ID de l'utilisateur
        message: Message envoyé par l'utilisateur
        response: Réponse générée par l'assistant
        role: Rôle de l'utilisateur (client, gerant, etc.)
    
    Returns:
        True si sauvegarde réussie, False sinon
    """
    try:
        conversations = _load_conversations()
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Chercher la conversation existante
        conversation = None
        for conv in conversations:
            if conv.get('user_id') == user_id:
                conversation = conv
                break
        
        # Créer nouvelle conversation si nécessaire
        if not conversation:
            conversation = {
                'user_id': user_id,
                'role': role,
                'created_at': timestamp,
                'messages': []
            }
            conversations.append(conversation)
        
        # Ajouter le nouveau message
        conversation['messages'].append({
            'user_message': message,
            'assistant_response': response,
            'timestamp': timestamp
        })
        
        # Mettre à jour la date de dernière modification
        conversation['updated_at'] = timestamp
        
        # Sauvegarder
        return _save_conversations(conversations)
    
    except Exception as e:
        print(f"Erreur sauvegarde message: {e}")
        return False


def get_conversation_history(user_id: str, limit: int = 50) -> List[Dict]:
    """
    Récupère l'historique des messages d'un utilisateur.
    
    Args:
        user_id: ID de l'utilisateur
        limit: Nombre maximum de messages à retourner (par défaut: 50)
    
    Returns:
        Liste des messages de la conversation
    """
    conversation = get_user_conversation(user_id)
    
    if not conversation:
        return []
    
    messages = conversation.get('messages', [])
    
    # Retourner les derniers messages (limite)
    return messages[-limit:] if len(messages) > limit else messages


def delete_user_conversation(user_id: str) -> bool:
    """
    Supprime la conversation d'un utilisateur.
    
    Args:
        user_id: ID de l'utilisateur
    
    Returns:
        True si suppression réussie, False sinon
    """
    try:
        conversations = _load_conversations()
        
        # Filtrer pour exclure la conversation de l'utilisateur
        filtered = [conv for conv in conversations if conv.get('user_id') != user_id]
        
        if len(filtered) < len(conversations):
            return _save_conversations(filtered)
        
        return False
    except Exception as e:
        print(f"Erreur suppression conversation: {e}")
        return False


def get_conversation_stats() -> Dict:
    """
    Retourne des statistiques sur les conversations.
    
    Returns:
        Dictionnaire avec statistiques
    """
    conversations = _load_conversations()
    
    total_conversations = len(conversations)
    total_messages = sum(len(conv.get('messages', [])) for conv in conversations)
    
    # Calculer les conversations actives (< 24h)
    active_cutoff = datetime.utcnow() - timedelta(hours=24)
    active_conversations = 0
    
    for conv in conversations:
        messages = conv.get('messages', [])
        if messages:
            try:
                last_timestamp = datetime.fromisoformat(messages[-1].get('timestamp', '').replace('Z', '+00:00'))
                if last_timestamp >= active_cutoff:
                    active_conversations += 1
            except:
                pass
    
    return {
        'total_conversations': total_conversations,
        'total_messages': total_messages,
        'active_conversations_24h': active_conversations,
        'avg_messages_per_conversation': total_messages / total_conversations if total_conversations > 0 else 0
    }
