import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import random

from app.services.rag_service import RAGService

class ChatbotService:
    """Service intelligent pour l'assistant chatbot du restaurant."""
    
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), '../../data')
        self.reservations_file = os.path.join(self.data_dir, 'reservations.json')
        self.users_file = os.path.join(self.data_dir, 'users.json')
        self.settings_file = os.path.join(self.data_dir, 'settings.json')
        self.orders_file = os.path.join(self.data_dir, 'orders.json')
        self.rag_service = RAGService()
        
        # Deals et promotions
        self.deals = [
            {
                "id": "deal_1",
                "title": "Happy Hour",
                "description": "30% de réduction sur les boissons (17h-19h)",
                "discount": 30,
                "category": "beverages",
                "time_start": "17:00",
                "time_end": "19:00"
            },
            {
                "id": "deal_2",
                "title": "Menu du jour",
                "description": "Plat principal + boisson à 8,900 FCFA",
                "price": 8900,
                "category": "menu",
                "available_daily": True
            },
            {
                "id": "deal_3",
                "title": "Réservation en groupe",
                "description": "10% de réduction pour 6+ personnes",
                "discount": 10,
                "min_guests": 6
            },
            {
                "id": "deal_4",
                "title": "Anniversaire spécial",
                "description": "Gâteau gratuit pour les fêtes d'anniversaire",
                "category": "special"
            }
        ]
    
    def load_json_file(self, filepath: str) -> Dict:
        """Charge un fichier JSON."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def get_top_rated_dishes(self, limit: int = 3, exclude_allergens: List[str] = None, category: str = None) -> List[Dict]:
        """Récupère les plats les mieux notés, en excluant certains allergènes et en filtrant par catégorie si demandé."""
        recipes_file = os.path.join(self.data_dir, 'recipes.json')
        reviews_file = os.path.join(self.data_dir, 'reviews.json')
        
        if exclude_allergens is None:
            exclude_allergens = []
        
        try:
            with open(recipes_file, 'r', encoding='utf-8') as f:
                recipes = json.load(f)
            with open(reviews_file, 'r', encoding='utf-8') as f:
                reviews = json.load(f)
        except:
            return []
        
        # Calculer la note moyenne par plat
        ratings = {}
        for review in reviews:
            if review.get('recipeId') and review.get('status') == 'approved':
                recipe_id = review['recipeId']
                if recipe_id not in ratings:
                    ratings[recipe_id] = []
                ratings[recipe_id].append(review.get('rating', 0))
        
        # Calculer les moyennes
        avg_ratings = {}
        for recipe_id, rates in ratings.items():
            avg_ratings[recipe_id] = sum(rates) / len(rates) if rates else 0
        
        # Associer les recettes avec leurs notes et filtrer
        rated_recipes = []
        for recipe in recipes:
            if recipe.get('available'):
                # Vérifier les allergènes exclus
                allergens = recipe.get('allergens', '').lower()
                skip = False
                for allergen in exclude_allergens:
                    if allergen.lower() in allergens:
                        skip = True
                        break
                
                # Filtrer par catégorie si spécifiée
                if category:
                    recipe_category = recipe.get('category', '').lower().strip()
                    recipe_section = recipe.get('section', '').lower().strip()
                    cat = category.lower().strip()
                    if (cat not in recipe_category) and (cat not in recipe_section):
                        skip = True
                
                if not skip:
                    recipe['average_rating'] = avg_ratings.get(recipe['id'], 0)
                    rated_recipes.append(recipe)
        
        # Trier par note décroissante
        rated_recipes.sort(key=lambda x: x['average_rating'], reverse=True)
        
        return rated_recipes[:limit]
    
    def save_json_file(self, filepath: str, data: Dict) -> bool:
        """Sauvegarde un fichier JSON."""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Erreur lors de la sauvegarde: {e}")
            return False
    
    def get_restaurant_info(self) -> Dict:
        """Récupère les informations du restaurant."""
        settings = self.load_json_file(self.settings_file)
        return {
            "nom": settings.get("restaurantName", "TableFacil"),
            "telephone": settings.get("restaurantPhone", ""),
            "email": settings.get("restaurantEmail", ""),
            "adresse": settings.get("restaurantAddress", ""),
            "horaires": settings.get("openingHours", {}),
            "capacite": settings.get("capacity", 0),
            "devise": settings.get("currency", "FCFA")
        }
    
    def process_message(self, user_message: str, user_id: Optional[str] = None) -> Dict:
        """Traite un message utilisateur et retourne une réponse intelligente."""
        user_message_lower = user_message.lower().strip()
        
        # Détection d'intentions
        response = self._detect_intent(user_message_lower, user_id)
        
        return response
    
    def _detect_intent(self, message: str, user_id: Optional[str] = None) -> Dict:
        """Détecte l'intention de l'utilisateur."""
        
        # Gestion des réponses courtes (oui/non/peut-être)
        if message in ['oui', 'yes', 'd\'accord', 'ok', 'okay', 'volontiers', 'bien sûr', 'oui merci']:
            return {
                "message": "Parfait! Comment puis-je vous aider plus précisément? 😊\n\nVoulez-vous:\n• Réserver une table\n• Voir notre menu\n• Connaître nos promotions\n• Autre chose",
                "type": "clarification",
                "suggestions": ["Je veux réserver", "Montrez-moi le menu", "Quelles promotions?", "Vos horaires?"]
            }
        
        if message in ['non', 'no', 'pas vraiment', 'non merci', 'non pas vraiment']:
            return {
                "message": "D'accord! Que puis-je faire d'autre pour vous? 😊",
                "type": "clarification",
                "suggestions": ["Montrez-moi le menu", "Je veux réserver", "Vos horaires?", "Comment vous contacter?"]
            }
        
        if message in ['peut-être', 'je sais pas', 'je ne sais pas', 'hésitant', 'je ne suis pas sûr']:
            return {
                "message": "Pas de souci! Prenez votre temps. 😊\n\nJe peux vous aider à décider:\n• Nos plats populaires\n• Les promotions du moment\n• Les horaires disponibles",
                "type": "clarification",
                "suggestions": ["Quels sont vos plats populaires?", "Avez-vous des promotions?", "Quand êtes-vous ouverts?"]
            }
        
        # Salutations
        if any(word in message for word in ['bonjour', 'salut', 'hello', 'hi', 'ça va', 'coucou']):
            return self._respond_greeting()
        
        # Horaires
        if any(word in message for word in ['horaire', 'heure', 'ouvert', 'ferme', 'quand']):
            return self._respond_hours()
        
        # Adresse et localisation
        if any(word in message for word in ['adresse', 'où', 'localisation', 'local', 'lieu']):
            return self._respond_location()
        
        # Téléphone
        if any(word in message for word in ['téléphone', 'appel', 'contact', 'joindre']):
            return self._respond_contact()
        
        # Recommandations de plats (AVANT le menu générique)
        if any(word in message for word in ['recommande', 'conseil', 'suggest', 'propose', 'meilleur', 'best', 'populaire', 'spécial', 'préfère']):
            # Vérifier s'il y a des restrictions alimentaires
            exclude_allergens = []
            category = None
            meat_preference = None
            
            # Déterminer la catégorie de plat demandée
            if any(word in message for word in ['dessert', 'sucrée', 'sucré', 'gâteau', 'cake', 'tiramisu', 'glace', 'tarte']):
                category = 'dessert'
            elif any(word in message for word in ['entrée', 'appetizer', 'starter', 'salade']):
                category = 'entrée'
            elif any(word in message for word in ['plat principal', 'main', 'plat']):
                category = 'plat'
            elif any(word in message for word in ['boisson', 'drink', 'beverage', 'jus']):
                category = 'boisson'
            elif any(word in message for word in ['soupe', 'soup']):
                category = 'entrée chaude'
            
            # Détecter les préférences de viande
            if any(word in message for word in ['viande', 'carnivore', 'protéine']):
                if 'poulet' in message or 'volaille' in message:
                    meat_preference = 'poulet'
                elif 'boeuf' in message or 'steak' in message:
                    meat_preference = 'boeuf'
                elif 'porc' in message:
                    meat_preference = 'porc'
                elif 'poisson' in message:
                    meat_preference = 'poisson'
                else:
                    meat_preference = 'viande'  # Toute viande
            
            # Détecter les restrictions alimentaires
            if 'lactose' in message or 'sans lait' in message or 'sans fromage' in message or 'sans produits laitiers' in message:
                exclude_allergens.extend(['produits laitiers', 'fromage', 'lait', 'crème'])
                if category == 'dessert':
                    return self._respond_recommendations_with_restriction(exclude_allergens, "sans lactose", category)
            if 'végétarien' in message or 'végé' in message:
                exclude_allergens.extend(['viande', 'poisson', 'fruits de mer'])
            if 'végan' in message or 'vegan' in message:
                exclude_allergens = ['viande', 'poisson', 'produits laitiers', 'œufs', 'miel', 'fromage']
            if 'gluten' in message or 'sans gluten' in message:
                exclude_allergens.append('gluten')
            if 'poisson' in message and 'pas' in message or 'sans poisson' in message:
                exclude_allergens.extend(['poisson', 'fruits de mer'])
            
            return self._respond_recommendations(exclude_allergens if exclude_allergens else None, category, meat_preference)
        
        # Menu et plats
        if any(word in message for word in ['menu', 'plat', 'manger', 'cuisine', 'spécialité', 'plats', 'consulter le menu']):
            return self._respond_menu()
        
        # Réservation - Vérifier les patterns de réservation complexes AVANT les mots-clés simples
        # Pattern: "X personnes pour HHhMM" ou "X personnes à HH:MM" ou "X personnes samedi 20h"
        if any(pattern in message for pattern in ['personnes pour', 'personnes à', 'personnes samedi', 'personnes dimanche', 
                                                    'personnes lundi', 'personnes mardi', 'personnes mercredi', 
                                                    'personnes jeudi', 'personnes vendredi']) or \
           any(time_pattern in message for time_pattern in ['20h', '19h', '18h', '21h', '22h', '17h', '16h', '15h']):
            # Vérifier si le message contient un nombre de personnes
            if any(num in message for num in ['2 ', '3 ', '4 ', '5 ', '6 ', '7 ', '8 ', '9 ', '1 ', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit']):
                return self._respond_reservation_confirmation(message, user_id)
        
        if any(word in message for word in ['réserver', 'réservation', 'table', 'booking', 'commander une table']):
            return self._respond_reservation(user_id)
        
        # Promotions et deals
        if any(word in message for word in ['promo', 'deal', 'réduction', 'offre', 'discount', 'prix']):
            return self._respond_deals()
        
        # Allergies et restrictions - DÉTECTION AMÉLIORÉE
        # Détecter "sans X", "peut avoir", "est-ce que je peux avoir", "repas sans"
        if any(word in message for word in ['allergie', 'végétarien', 'végan', 'gluten', 'restriction', 'lactose', 
                                             'sans lait', 'sans fromage', 'sans sel', 'sans sucre', 'sans gluten',
                                             'sans lactose', 'peut avoir', 'peux avoir', 'puis-je avoir', 
                                             'est-ce que je peux', 'repas sans', 'plat sans', 'menu sans']):
            # Extraire les restrictions et proposer des plats, en respectant la catégorie si mentionnée (ex: dessert)
            exclude_allergens = []
            category = None
            restriction_type = None
            
            if any(word in message for word in ['dessert', 'sucrée', 'sucré', 'gâteau', 'cake', 'tiramisu']):
                category = 'dessert'
            if any(word in message for word in ['entrée', 'appetizer', 'starter']):
                category = 'entrée'
            if any(word in message for word in ['plat principal', 'main', 'plat', 'repas']):
                category = 'plat'
            if any(word in message for word in ['boisson', 'drink', 'beverage']):
                category = 'boisson'
            if any(word in message for word in ['soupe', 'soup']):
                category = 'entrée chaude'

            # Détecter les restrictions spécifiques
            if 'sans sel' in message or 'pas de sel' in message or 'sans sodium' in message:
                restriction_type = "sans sel"
                return self._respond_dietary()
            if 'sans sucre' in message or 'pas de sucre' in message or 'diabétique' in message:
                restriction_type = "sans sucre"
                return self._respond_dietary()
            if 'lactose' in message or 'sans lait' in message or 'sans fromage' in message or 'sans produits laitiers' in message:
                exclude_allergens = ['produits laitiers', 'fromage']
                return self._respond_recommendations_with_restriction(exclude_allergens, "sans lactose", category)
            if 'végétarien' in message or 'végé' in message:
                exclude_allergens = ['viande']
                return self._respond_recommendations_with_restriction(exclude_allergens, "végétariens", category)
            if 'végan' in message:
                exclude_allergens = ['viande', 'produits laitiers', 'œufs', 'miel']
                return self._respond_recommendations_with_restriction(exclude_allergens, "végan", category)
            if 'gluten' in message or 'sans gluten' in message:
                exclude_allergens = ['gluten']
                return self._respond_recommendations_with_restriction(exclude_allergens, "sans gluten", category)
            
            # Si juste mention d'allergie sans précision
            return self._respond_dietary()
        
        # Fidélité et points
        if any(word in message for word in ['point', 'fidélité', 'programme', 'récompense']):
            return self._respond_loyalty(user_id)
        
        # Paiement
        if any(word in message for word in ['paiement', 'payer', 'facture', 'prix', 'carte']):
            return self._respond_payment()
        
        # Mes réservations
        if any(word in message for word in ['mes réservations', 'ma réservation', 'mes booking', 'annuler', 'modifier']):
            return self._respond_my_reservations(user_id)

        rag_response = self._respond_rag(message)
        if rag_response:
            return rag_response
        
        # Par défaut: réponse intelligente
        return self._respond_default(message, user_id)
    
    def _respond_greeting(self) -> Dict:
        """Réponse aux salutations."""
        greetings = [
            "Bonjour! Bienvenue chez TableFacil. Comment puis-je vous aider aujourd'hui? 😊",
            "Salut! Je suis heureux de vous voir. Vous souhaitez réserver une table ou poser une question?",
            "Bienvenue! Je suis votre assistant. Que puis-je faire pour vous?",
            "Bonjour! 👋 Avez-vous besoin d'une réservation ou d'informations sur notre restaurant?"
        ]
        return {
            "message": random.choice(greetings),
            "type": "greeting",
            "suggestions": [
                "Je veux réserver une table",
                "Quels sont vos horaires?",
                "Avez-vous des promotions?",
                "Comment vous contacter?"
            ]
        }
    
    def _respond_hours(self) -> Dict:
        """Réponse sur les horaires."""
        info = self.get_restaurant_info()
        hours = info.get('horaires', {})
        
        hours_text = "**Horaires d'ouverture** 🕐\n\n"
        days_fr = {
            'monday': 'Lundi', 'tuesday': 'Mardi', 'wednesday': 'Mercredi',
            'thursday': 'Jeudi', 'friday': 'Vendredi', 'saturday': 'Samedi',
            'sunday': 'Dimanche'
        }
        
        for day, day_fr in days_fr.items():
            if day in hours:
                h = hours[day]
                hours_text += f"{day_fr}: {h.get('open', 'N/A')} - {h.get('close', 'N/A')}\n"
        
        return {
            "message": hours_text,
            "type": "information",
            "suggestions": ["Je veux réserver maintenant", "Montrez-moi le menu", "Comment vous joindre?"]
        }
    
    def _respond_location(self) -> Dict:
        """Réponse sur l'adresse."""
        info = self.get_restaurant_info()
        
        message = f"""**Où nous trouver** 📍

{info.get('nom', 'TableFacil')}
Adresse: {info.get('adresse', 'N/A')}
Téléphone: {info.get('telephone', 'N/A')}

Venez nous visiter! Nous vous attendons avec impatience. 🍽️"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Je veux réserver", "Quels sont vos horaires?", "Où êtes-vous?"]
        }
    
    def _respond_contact(self) -> Dict:
        """Réponse sur le contact."""
        info = self.get_restaurant_info()
        
        message = f"""**Comment nous contacter** 📞

Téléphone: {info.get('telephone', 'N/A')}
Email: {info.get('email', 'N/A')}

Nous sommes disponibles pendant nos heures d'ouverture pour répondre à toutes vos questions! 😊"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Je veux réserver", "Quels sont vos horaires?", "Où êtes-vous situés?"]
        }
    
    def _respond_menu(self) -> Dict:
        """Réponse sur le menu."""
        message = """Notre cuisine va vous régaler! 🍽️✨

Au menu:
• Viandes grillées succulentes
• Poissons frais du jour
• Salades fraîches et colorées
• Pâtes italiennes authentiques
• Délicieux plats végétariens
• Desserts faits maison

Consultez notre menu complet ou je peux vous recommander un plat selon vos envies!"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Montrez-moi le menu complet", "Quel plat me recommandez-vous?", "Y a-t-il des promotions?"]
        }
    
    def _respond_reservation(self, user_id: Optional[str] = None) -> Dict:
        """Réponse sur les réservations."""
        message = """Avec plaisir! Je peux vous aider à réserver une table. 😊

Dites-moi simplement:
• Pour combien de personnes?
• Quelle date et heure?

Exemples: "2 personnes pour 20h30" ou "4 personnes le samedi à 19h"

Et je m'occupe du reste!"""
        
        suggestions = ["2 personnes pour 20h30", "4 personnes samedi 20h", "Comment vous appeler?"] if user_id else ["2 personnes pour 20h30", "Appelez-moi s'il vous plaît"]
        
        return {
            "message": message,
            "type": "action",
            "suggestions": suggestions
        }
    
    def _respond_recommendations(self, exclude_allergens: List[str] = None, category: str = None, meat_preference: str = None) -> Dict:
        """Recommander les 3 meilleurs plats et le deal du jour."""
        if exclude_allergens is None:
            exclude_allergens = []
            
        top_dishes = self.get_top_rated_dishes(3, exclude_allergens, category)
        
        # Si préférence de viande spécifiée, filtrer davantage
        if meat_preference and top_dishes:
            filtered_dishes = []
            for dish in top_dishes:
                dish_name_lower = dish['name'].lower()
                dish_desc_lower = dish.get('description', '').lower()
                
                if meat_preference == 'poulet' and ('poulet' in dish_name_lower or 'poulet' in dish_desc_lower or 'volaille' in dish_name_lower):
                    filtered_dishes.append(dish)
                elif meat_preference == 'boeuf' and ('boeuf' in dish_name_lower or 'steak' in dish_name_lower or 'bœuf' in dish_name_lower):
                    filtered_dishes.append(dish)
                elif meat_preference == 'porc' and 'porc' in dish_name_lower:
                    filtered_dishes.append(dish)
                elif meat_preference == 'poisson' and ('poisson' in dish_name_lower or 'saumon' in dish_name_lower or 'thon' in dish_name_lower):
                    filtered_dishes.append(dish)
                elif meat_preference == 'viande' and any(meat in dish_name_lower or meat in dish_desc_lower for meat in ['poulet', 'boeuf', 'bœuf', 'porc', 'agneau', 'côte', 'steak', 'viande']):
                    filtered_dishes.append(dish)
            
            if filtered_dishes:
                top_dishes = filtered_dishes[:3]
        
        if not top_dishes:
            return {
                "message": "Je n'ai pas pu récupérer les recommandations pour le moment. Veuillez consulter notre menu complet!",
                "type": "information",
                "suggestions": ["Consulter le menu", "Réserver une table"]
            }
        
        # Construire le message avec contexte
        intro = "Voici mes 3 meilleures recommandations pour vous"
        if category == 'dessert' and exclude_allergens and any('lait' in str(a) for a in exclude_allergens):
            intro = "Voici mes 3 meilleurs desserts SANS LACTOSE pour vous"
        elif category == 'dessert':
            intro = "Voici mes 3 meilleurs desserts pour vous"
        elif meat_preference:
            if meat_preference == 'poulet':
                intro = "Voici mes 3 meilleurs plats au POULET pour vous"
            elif meat_preference == 'boeuf':
                intro = "Voici mes 3 meilleurs plats au BŒUF pour vous"
            elif meat_preference == 'viande':
                intro = "Voici mes 3 meilleurs plats de VIANDE pour vous"
        elif category:
            intro = f"Voici mes 3 meilleurs plats de catégorie {category}"
        
        message = intro + ":\n\n"
        
        dishes_data = []
        for i, dish in enumerate(top_dishes, 1):
            note = f"({dish['average_rating']:.1f}/5)" if dish.get('average_rating') else ""
            message += f"{i}. {dish['name']} - {dish.get('price', 'N/A')} {note}\n"
            message += f"   {dish.get('description', '')}\n\n"
            
            # Stocker les données pour le frontend
            dishes_data.append({
                "id": dish.get('id'),
                "name": dish['name'],
                "price": dish.get('price', 'N/A'),
                "description": dish.get('description', ''),
                "image": dish.get('image', ''),
                "rating": dish.get('average_rating', 0),
                "category": dish.get('category', ''),
                "allergens": dish.get('allergens', '')
            })
        
        # Ajouter le deal du jour
        message += "\nOffre Spéciale Aujourd'hui:\n"
        deal_of_day = None
        for deal in self.deals:
            if deal.get('available_daily') or 'jour' in deal.get('title', '').lower():
                deal_of_day = deal
                break
        
        if deal_of_day:
            message += f"{deal_of_day['title']}: {deal_of_day['description']}"
        
        # Suggestions contextuelles
        suggestions = []
        if category == 'dessert':
            suggestions = ["Montrez-moi les images", "Je suis allergique au lactose", "Je veux réserver"]
        elif meat_preference:
            suggestions = ["Quelles entrées avez-vous?", "Quels sont les accompagnements?", "Je veux commander"]
        else:
            suggestions = ["Montrez-moi le menu", "Je veux réserver", "Quelles sont vos promotions?"]
        
        return {
            "message": message,
            "type": "recommendation",
            "suggestions": suggestions,
            "dishes": dishes_data  # Ajouter les données des plats pour le frontend
        }
    
    def _respond_recommendations_with_restriction(self, exclude_allergens: List[str], restriction_type: str, category: str = None) -> Dict:
        """Recommander des plats adaptés à une restriction alimentaire, avec filtre de catégorie optionnel."""
        top_dishes = self.get_top_rated_dishes(3, exclude_allergens, category)
        
        restriction_messages = {
            "sans lactose": "Voici nos meilleurs plats SANS LACTOSE pour vous:",
            "végétariens": "Voici nos meilleurs plats VÉGÉTARIENS pour vous:",
            "végan": "Voici nos meilleurs plats VÉGAN pour vous:",
            "sans gluten": "Voici nos meilleurs plats SANS GLUTEN pour vous:"
        }
        
        if not top_dishes:
            return {
                "message": f"Désolé, nous n'avons pas suffisamment de plats {restriction_type} disponibles pour le moment. Consultez notre menu complet pour voir d'autres options.",
                "type": "information",
                "suggestions": ["Montrez-moi le menu", "Quelles allergies gérez-vous?", "Je veux réserver quand même"]
            }
        
        message = restriction_messages.get(restriction_type, f"Voici nos meilleurs plats {restriction_type}:") + "\n\n"
        
        dishes_data = []
        for i, dish in enumerate(top_dishes, 1):
            note = f"({dish['average_rating']:.1f}/5)" if dish.get('average_rating') else ""
            message += f"{i}. {dish['name']} - {dish.get('price', 'N/A')} {note}\n"
            message += f"   {dish.get('description', '')}\n\n"
            
            dishes_data.append({
                "id": dish.get('id'),
                "name": dish['name'],
                "price": dish.get('price', 'N/A'),
                "description": dish.get('description', ''),
                "image": dish.get('image', ''),
                "rating": dish.get('average_rating', 0),
                "category": dish.get('category', ''),
                "allergens": dish.get('allergens', '')
            })
        
        # Ajouter le deal du jour
        message += f"\nCes plats sont tous {restriction_type} et sains pour vous! 🌱"
        
        return {
            "message": message,
            "type": "recommendation",
            "suggestions": ["Montrez-moi le menu complet", "Je veux réserver", "D'autres plats {restriction_type}?"],
            "dishes": dishes_data
        }
    
    def _respond_reservation_confirmation(self, message: str, user_id: Optional[str] = None) -> Dict:
        """Réponse pour confirmer une réservation avec détails."""
        response_msg = f"""Excellent! 🎉 J'ai bien noté votre demande:

**{message}**

Voici les prochaines étapes:
1. ✅ Confirmez votre réservation
2. 📧 Vous recevrez une confirmation par email
3. 🕐 Arrivez 10 minutes avant l'heure prévue

Pour finaliser, veuillez:
→ Cliquer sur le bouton "Confirmez ma réservation" ci-dessous
→ Ou nous appeler directement pour une confirmation immédiate

Avez-vous des demandes spéciales? (allergies, occasion spéciale, etc.)"""
        
        return {
            "message": response_msg,
            "type": "action",
            "suggestions": ["Confirmez ma réservation", "Modifier les détails", "Nous appeler"]
        }
    
    def _respond_deals(self) -> Dict:
        """Réponse sur les promotions."""
        deals_text = "**Nos Promotions Spéciales** 🎉\n\n"
        
        for deal in self.deals:
            if deal.get("available_daily"):
                deals_text += f"🌟 **{deal['title']}**\n"
                deals_text += f"   {deal['description']}\n\n"
        
        deals_text += "**Happy Hour**: 30% sur les boissons (17h-19h) 🍹\n\n"
        deals_text += "**Réservation en groupe**: 10% de réduction pour 6+ personnes\n\n"
        deals_text += "**Anniversaire**: Gâteau gratuit! 🎂\n\n"
        
        return {
            "message": deals_text,
            "type": "promotion",
            "suggestions": ["Réserver maintenant", "Voir le menu", "Nous contacter"]
        }
    
    def _respond_dietary(self) -> Dict:
        """Réponse sur les allergies et restrictions."""
        message = """Je suis ravi de vous aider avec vos préférences alimentaires! 🌱✨

**Comment spécifier vos allergies et restrictions:**

📱 **Lors de vos commandes en ligne:**
1. Dans le panier, cherchez la zone "Notes spéciales" ou "Instructions"
2. Indiquez clairement vos allergies (ex: "Sans lactose", "Allergie aux arachides")
3. Notre équipe adaptera votre plat selon vos besoins

🍽️ **Au restaurant:**
• Informez votre serveur dès votre arrivée
• Nous consulterons le chef pour adapter les plats
• Tous nos ingrédients peuvent être modifiés selon vos besoins

📞 **Pour les réservations:**
• Mentionnez vos restrictions lors de la réservation
• Nous préparerons un menu adapté à l'avance
• Appelez-nous pour discuter des options disponibles

**Nous pouvons accommoder:**
✓ Végétariens / Végan
✓ Sans gluten
✓ Sans lactose / produits laitiers
✓ Sans fruits de mer / poisson
✓ Sans arachides ou noix
✓ Sans sel / sucre
✓ Et bien d'autres allergies!

Votre sécurité et votre satisfaction sont notre priorité absolue! ❤️"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Recommandez-moi un plat sans lactose", "Je veux réserver", "Comment vous contacter?"]
        }
    
    def _respond_loyalty(self, user_id: Optional[str] = None) -> Dict:
        """Réponse sur le programme de fidélité."""
        message = """**Programme de Fidélité TableFacil** 🎁

Accumule des points à chaque visite et chaque commande!

💰 **Avantages**:
- 1 point par 1,000 FCFA dépensé
- Points convertibles en réductions
- Accès exclusif aux promotions VIP
- Invitations aux événements spéciaux
- Réductions anniversaire

Plus tu visites, plus tu gagne! 🌟"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Réserver une table", "Voir nos promotions", "Consulter mes points"] if user_id else ["Créer un compte", "Réserver une table"]
        }
    
    def _respond_payment(self) -> Dict:
        """Réponse sur les paiements."""
        message = """**Modes de Paiement** 💳

Nous acceptons:
- 💳 Cartes bancaires (Visa, Mastercard)
- 📱 Portefeuilles numériques (Orange Money, Wave)
- 💵 Espèces
- 🏦 Virement bancaire

Tous les paiements sont sécurisés et protégés! 🔒"""
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Réserver une table", "Voir les promotions", "Contacter le restaurant"]
        }
    
    def _respond_my_reservations(self, user_id: Optional[str] = None) -> Dict:
        """Réponse sur les réservations de l'utilisateur."""
        if not user_id:
            return {
                "message": "Veuillez vous connecter pour voir vos réservations. 🔐",
                "type": "action",
                "suggestions": ["Se connecter", "Créer un compte"]
            }
        
        reservations = self.load_json_file(self.reservations_file)
        if isinstance(reservations, list):
            user_reservations = [r for r in reservations if r.get('clientId') == user_id]
        else:
            user_reservations = []
        
        if not user_reservations:
            return {
                "message": "Vous n'avez pas de réservation actuellement. Voulez-vous en créer une? 📅",
                "type": "action",
                "suggestions": ["Je veux réserver", "Quels sont vos horaires?", "Montrez-moi le menu"]
            }
        
        message = "**Vos Réservations** 📋\n\n"
        for res in user_reservations[:3]:  # Les 3 dernières
            message += f"📅 {res.get('date')} à {res.get('time')}\n"
            message += f"👥 {res.get('guests')} personnes\n"
            message += f"Status: {res.get('status')}\n\n"
        
        return {
            "message": message,
            "type": "information",
            "suggestions": ["Je veux réserver une autre table", "Comment modifier ma réservation?", "Annuler ma réservation"]
        }

    def _respond_rag(self, message: str) -> Optional[Dict]:
        """Répond avec le moteur RAG si disponible."""
        if not self.rag_service or not self.rag_service.is_ready():
            return None

        rag_result = self.rag_service.generate_answer(message)
        if not rag_result or not rag_result.get("message"):
            return None

        suggestions = rag_result.get("suggestions") or [
            "Je veux réserver une table",
            "Montrez-moi le menu",
            "Quelles sont vos promotions?",
            "Comment vous contacter?"
        ]

        return {
            "message": rag_result.get("message"),
            "type": "information",
            "sources": rag_result.get("sources", []),
            "suggestions": suggestions
        }
    
    def _respond_default(self, message: str, user_id: Optional[str] = None) -> Dict:
        """Réponse par défaut intelligente."""
        suggestions = [
            "Je veux réserver une table",
            "Quelles sont vos promotions?",
            "Quels sont vos horaires?",
            "Comment vous contacter?"
        ]
        
        return {
            "message": """Je suis là pour vous aider! 😊

Je peux vous renseigner sur:
• Les réservations de table
• Notre menu et nos spécialités
• Les promotions en cours
• Nos horaires et contact
• Les options végétariennes/allergies
• Le programme de fidélité

Qu'est-ce qui vous intéresse?""",
            "type": "help",
            "suggestions": suggestions
        }
    
    def send_reservation_reminders(self) -> Dict:
        """Envoie des rappels de réservation aux clients."""
        reservations = self.load_json_file(self.reservations_file)
        users = self.load_json_file(self.users_file)
        
        if isinstance(users, dict):
            users_list = users.get('users', [])
        else:
            users_list = users if isinstance(users, list) else []
        
        if not isinstance(reservations, list):
            return {"success": False, "message": "Erreur lors du chargement des réservations"}
        
        # Créer un dictionnaire des utilisateurs
        users_dict = {u.get('id'): u for u in users_list}
        
        reminders_sent = 0
        tomorrow = (datetime.now() + timedelta(days=1)).date()
        
        for reservation in reservations:
            try:
                res_date = datetime.strptime(reservation.get('date', ''), '%Y-%m-%d').date()
                
                # Envoyer le rappel si la réservation est demain
                if res_date == tomorrow and reservation.get('status') == 'Confirmée':
                    email = reservation.get('email')
                    
                    if email:
                        # Utiliser la fonction d'envoi de rappel existante
                        success = send_reservation_reminder_email(email, reservation)
                        if success:
                            reminders_sent += 1
            except Exception as e:
                print(f"Erreur lors de l'envoi du rappel: {e}")
                continue
        
        return {
            "success": True,
            "message": f"✅ {reminders_sent} rappels envoyés avec succès",
            "reminders_sent": reminders_sent
        }
    
    def ask_follow_up_questions(self, message: str) -> List[str]:
        """Propose des questions de suivi intelligentes que le CLIENT peut poser."""
        questions = []
        
        if any(word in message.lower() for word in ['réserver', 'table', 'réservation']):
            questions = [
                "Combien coûte la réservation?",
                "Quels sont vos horaires disponibles?",
                "Puis-je annuler ma réservation?",
                "Y a-t-il un acompte à payer?"
            ]
        elif any(word in message.lower() for word in ['menu', 'plat', 'manger', 'recommand']):
            questions = [
                "Quelles sont vos spécialités?",
                "Avez-vous des plats végétariens?",
                "Quel est le plat le plus populaire?",
                "Montrez-moi les desserts"
            ]
        elif any(word in message.lower() for word in ['promo', 'deal', 'réduction', 'promotion']):
            questions = [
                "Comment bénéficier de la réduction?",
                "Avez-vous d'autres promotions?",
                "Le happy hour est à quelle heure?",
                "Puis-je cumuler les promotions?"
            ]
        elif any(word in message.lower() for word in ['horaire', 'heure', 'ouvert']):
            questions = [
                "Êtes-vous ouverts le dimanche?",
                "Jusqu'à quelle heure servez-vous?",
                "Je peux réserver pour ce soir?",
                "Quel est votre numéro de téléphone?"
            ]
        elif any(word in message.lower() for word in ['allergie', 'sans', 'végé', 'restriction']):
            questions = [
                "Avez-vous des plats sans gluten?",
                "Comment spécifier mes allergies?",
                "Pouvez-vous adapter les plats?",
                "Quels plats sont végans?"
            ]
        elif any(word in message.lower() for word in ['contact', 'téléphone', 'adresse', 'où']):
            questions = [
                "Comment venir en transport?",
                "Avez-vous un parking?",
                "Je peux vous appeler?",
                "Envoyez-moi l'adresse GPS"
            ]
        else:
            # Questions générales pour toute réponse
            questions = [
                "Je veux réserver une table",
                "Montrez-moi le menu",
                "Quelles sont vos promotions?",
                "Comment vous contacter?"
            ]
        
        return questions
    
    def suggest_deals_for_user(self, user_id: Optional[str] = None) -> List[Dict]:
        """Suggère des deals personnalisés."""
        suggested_deals = []
        
        # Deals généraux
        current_hour = datetime.now().hour
        
        # Happy Hour
        if 17 <= current_hour < 19:
            suggested_deals.append({
                "id": "deal_1",
                "title": "🎉 Happy Hour EN COURS",
                "description": "30% de réduction sur les boissons!",
                "urgent": True
            })
        
        # Menu du jour
        suggested_deals.append({
            "id": "deal_2",
            "title": "Menu du jour",
            "description": "Plat + boisson à 8,900 FCFA",
            "discount": "Spécial!"
        })
        
        # Anniversaire
        if user_id:
            users = self.load_json_file(self.users_file)
            if isinstance(users, dict):
                users_list = users.get('users', [])
            else:
                users_list = users if isinstance(users, list) else []
            
            user = next((u for u in users_list if u.get('id') == user_id), None)
            if user:
                suggested_deals.append({
                    "id": "deal_4",
                    "title": "🎂 Célébrez votre anniversaire",
                    "description": "Gâteau gratuit pour votre fête!",
                    "personalized": True
                })
        
        return suggested_deals
