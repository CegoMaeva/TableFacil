"""
Assistant client RAG (version améliorée) : récupération live + retrieval (FAISS/keyword) + réponse synthétique.
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import re
import json
from app.utils.jwt_utils import verify_token
from app.models.database import load_data
from app.utils.rag_client import get_rag_client
from app.utils.conversation_manager import (
    save_message, 
    get_conversation_history, 
    delete_user_conversation,
    clean_old_conversations,
    is_first_message_today
)

assist_bp = Blueprint('assist', __name__)


def _now_iso():
    return datetime.utcnow().isoformat() + 'Z'


def _filter_client_items(items, client_id):
    return [item for item in items if item.get('clientId') == client_id or item.get('client_id') == client_id]


def _summarize_live(orders, reservations):
    """Résumé intelligent des données live du client."""
    parts = []
    
    # Commandes
    if orders:
        ord0 = orders[0]
        parts.append({
            'type': 'order',
            'id': ord0.get('id'),
            'status': ord0.get('status'),
            'total': ord0.get('total', 0),
            'text': f"Dernière commande {ord0.get('id')} · statut {ord0.get('status')} · total {ord0.get('total', 0)} FCFA"
        })
    
    # Réservations
    if reservations:
        res0 = reservations[0]
        parts.append({
            'type': 'reservation',
            'id': res0.get('id'),
            'date': res0.get('date'),
            'time': res0.get('time'),
            'status': res0.get('status'),
            'guests': res0.get('guests'),
            'text': f"Dernière réservation {res0.get('id')} · {res0.get('date')} {res0.get('time')} · statut {res0.get('status')}"
        })
    
    return parts


def _format_professional(title, content_lines):
    """Format une réponse de manière professionnelle sans émojis."""
    lines = [f"\n[{title}]"]
    lines.extend([f"  {line}" for line in content_lines])
    return "\n".join(lines)


def _get_menu_recommendations():
    """Récupère les 3 plats les mieux notés + le deal du jour."""
    try:
        recipes = load_data('recipes.json') or []
        reviews = load_data('reviews.json') or []
        
        # Filtrer les plats disponibles
        available = [r for r in recipes if r.get('available', True)]
        
        # Calculer la note moyenne pour chaque plat
        recipe_ratings = {}
        for recipe in available:
            recipe_id = recipe.get('id')
            recipe_reviews = [r for r in reviews if r.get('recipeId') == recipe_id and r.get('status') == 'approved']
            
            if recipe_reviews:
                avg_rating = sum(r.get('rating', 0) for r in recipe_reviews) / len(recipe_reviews)
                recipe_ratings[recipe_id] = {
                    'recipe': recipe,
                    'avg_rating': avg_rating,
                    'review_count': len(recipe_reviews)
                }
            else:
                # Pas de reviews = note par défaut de 0
                recipe_ratings[recipe_id] = {
                    'recipe': recipe,
                    'avg_rating': 0,
                    'review_count': 0
                }
        
        # Trier par note moyenne (décroissant), puis par nombre de reviews
        sorted_recipes = sorted(
            recipe_ratings.values(),
            key=lambda x: (x['avg_rating'], x['review_count']),
            reverse=True
        )
        
        # Prendre les 3 mieux notés
        top_3 = [item['recipe'] for item in sorted_recipes[:3]]
        
        # Deal du jour: choisir un plat basé sur le jour de la semaine
        from datetime import datetime
        day_of_week = datetime.now().weekday()  # 0=Lundi, 6=Dimanche
        
        # Trouver un plat différent des top 3 pour le deal
        deal_candidates = [r for r in available if r not in top_3]
        if deal_candidates:
            deal_of_day = deal_candidates[day_of_week % len(deal_candidates)]
            # Marquer le deal du jour
            deal_of_day_copy = deal_of_day.copy()
            deal_of_day_copy['isDealOfDay'] = True
            deal_of_day_copy['dealBadge'] = '🔥 DEAL DU JOUR'
            return top_3 + [deal_of_day_copy]
        
        return top_3
    except Exception as e:
        print(f"Erreur recommendations: {e}")
        return []


def _build_rich_response(text: str, recipes=None, include_menu_link=False, include_reservation_link=False):
    """
    Construit une réponse enrichie avec texte, images de recettes et liens.
    """
    response = {
        'text': text,
        'hasRecipes': bool(recipes and len(recipes) > 0),
        'recipes': recipes or [],
        'hasMenuLink': include_menu_link,
        'hasReservationLink': include_reservation_link
    }
    return response


def _compose_answer(user_query: str, retrieved, live_summary, user_id: str = None, user_name: str = None, is_first_today: bool = False):
    """Compose une réponse naturelle, contextuelle, courtoise et ultra-pertinente."""
    query_lower = user_query.lower() if user_query else ""
    parts = []
    
    # Salutation courtoise uniquement pour le premier message du jour
    if is_first_today and user_name:
        parts.append(f"Bonjour {user_name}! Je suis l'assistant TableFacil.")
        parts.append("")
    
    # Import pour extraction de données
    import re
    import json
    from datetime import datetime, timedelta
    
    # ═══════════════════════════════════════════════════════════
    # DÉTECTION PRIORITAIRE DES INTENTIONS
    # ═══════════════════════════════════════════════════════════
    
    # Priorité 1: ALLERGIES & RÉGIMES (CRITIQUE - Santé)
    allergies_keywords = ['allergique', 'allergie', 'intolérance', 'intolérant', 'sans lactose', 'sans gluten', 
                         'sans arachide', 'sans noix', 'sans fruit de mer', 'sans poisson', 'sans viande', 'vegan', 
                         'végétarien', 'halal', 'cacher', 'régime', 'diabète', 'diabétique']
    
    if any(word in query_lower for word in allergies_keywords):
        # Les allergies sont gérées AVANT toute autre intention
        # (voir section dédiée ci-dessous)
        pass
    
    # Extraire les données structurées du résumé live
    order_info = next((item for item in live_summary if item.get('type') == 'order'), None) if live_summary else None
    reservation_info = next((item for item in live_summary if item.get('type') == 'reservation'), None) if live_summary else None
    
    # ═══════════════════════════════════════════════════════════
    # GESTION DES ALLERGIES & RÉGIMES ALIMENTAIRES
    # ═══════════════════════════════════════════════════════════
    
    allergies_keywords = ['allergique', 'allergie', 'intolérance', 'intolérant', 'sans lactose', 'sans gluten', 
                         'sans arachide', 'sans noix', 'sans fruit de mer', 'sans poisson', 'sans viande', 'vegan', 
                         'végétarien', 'halal', 'cacher', 'régime', 'diabète', 'diabétique']
    
    if any(word in query_lower for word in allergies_keywords):
        parts.append("\n[GESTION DES ALLERGIES & RÉGIMES SPÉCIAUX]")
        
        # Identifier le type d'allergie/régime spécifique
        lactose_free = any(word in query_lower for word in ['lactose', 'lait'])
        gluten_free = any(word in query_lower for word in ['gluten', 'celiac', 'coeliaque'])
        vegan = 'vegan' in query_lower
        vegetarian = 'végétarien' in query_lower or 'vegetarien' in query_lower
        halal = 'halal' in query_lower
        shellfish = any(word in query_lower for word in ['fruit de mer', 'crustacé', 'homard', 'crevette'])
        seafood = any(word in query_lower for word in ['poisson', 'fruit de mer', 'mer', 'seafood'])
        
        if lactose_free:
            parts.append("\n  [ALLERGIE AU LACTOSE]")
            parts.append("  ────────────────────")
            parts.append("  Excellente nouvelle! Nous proposons des alternatives")
            parts.append("  sans lactose pour de nombreux plats.")
            parts.append("\n  OPTIONS DISPONIBLES:")
            parts.append("  • Lait sans lactose (boissons)")
            parts.append("  • Fromage sans lactose (certains plats)")
            parts.append("  • Yaourt vegetal (coco, amande, soja)")
            parts.append("  • Beurre vegetal ou huile d'olive")
            parts.append("  • Crème fraiche sans lactose")
            parts.append("\n  DÉMARCHE POUR COMMANDER:")
            parts.append("  1. Consultez notre menu dans l'application")
            parts.append("  2. Les plats adaptés sont marqués 'Sans lactose'")
            parts.append("  3. Lors de la commande, selectionnez l'option")
            parts.append("     'Sans produits laitiers'")
            parts.append("  4. Notre cuisine s'engage a respecter votre allergie")
            parts.append("\n  PLATS POPULAIRES SANS LACTOSE:")
            parts.append("  • Grillades avec legumes frais")
            parts.append("  • Poisson a la sauce tomate/citron")
            parts.append("  • Riz et pates a l'huile d'olive")
            parts.append("  • Salades composees avec vinaigrette")
            parts.append("\n  ⚠️  IMPORTANT")
            parts.append("  Pour votre securite, mentionnez votre allergie au")
            parts.append("  restaurant lors de votre commande ou reservation.")
            parts.append("\n  CONTACT ALLERGIE:")
            parts.append("  Telephone: +1 (514) 123-4567")
            parts.append("  Email: allergies@tablefacil.ca")
            
        elif gluten_free:
            parts.append("\n  [ALLERGIE AU GLUTEN]")
            parts.append("  ────────────────────")
            parts.append("  Nous comprenons les besoins specifiques du regime")
            parts.append("  sans gluten et sans celiac.")
            parts.append("\n  OPTIONS DISPONIBLES:")
            parts.append("  • Pain sans gluten (commande anticipée)")
            parts.append("  • Pates sans gluten (pour certains plats)")
            parts.append("  • Riz, pommes de terre nature")
            parts.append("  • Legumes grilles ou vapeur")
            parts.append("  • Grillades certifiees sans gluten")
            parts.append("\n  RECOMMANDATION:")
            parts.append("  Nous recommandons de commander 48h a l'avance")
            parts.append("  pour les produits sans gluten certifies.")
            parts.append("\n  CONTACT ALLERGIE:")
            parts.append("  Telephone: +1 (514) 123-4567")
            parts.append("  Email: allergies@tablefacil.ca")
            
        elif vegan:
            parts.append("\n  [REGIME VEGAN]")
            parts.append("  ──────────────")
            parts.append("  Nos chefs preparent d'excellents plats vegan!")
            parts.append("\n  PLATS DISPONIBLES:")
            parts.append("  • Legumes grilles et marinades")
            parts.append("  • Riz aux legumes frais")
            parts.append("  • Pates a l'huile d'olive et herbes")
            parts.append("  • Salades completes et colorees")
            parts.append("  • Fruits frais de saison")
            parts.append("\n  SUBSTITUTIONS POSSIBLES:")
            parts.append("  • Tofu ou seitan au lieu de viande")
            parts.append("  • Lait vegetal au lieu de lait animal")
            parts.append("  • Huile d'olive au lieu de beurre")
            
        elif vegetarian:
            parts.append("\n  [REGIME VEGETARIEN]")
            parts.append("  ──────────────────")
            parts.append("  Nos chefs proposent des plats vegetariens savoureux!")
            parts.append("\n  PLATS DISPONIBLES:")
            parts.append("  • Oeufs prepares de differentes manieres")
            parts.append("  • Fromages et produits laitiers")
            parts.append("  • Legumes grilles et rotis")
            parts.append("  • Riz et pates aux legumes")
            parts.append("  • Salades completes avec proteines vegetales")
            
        elif halal:
            parts.append("\n  [CERTIFICATION HALAL]")
            parts.append("  ────────────────────")
            parts.append("  Nous proposons une cuisine conforme aux normes")
            parts.append("  alimentaires musulmanes.")
            parts.append("\n  NOTRE ENGAGEMENT:")
            parts.append("  • Viandes certifiees halal")
            parts.append("  • Cuisine dedicee sans melange")
            parts.append("  • Respect des horaires de jeune")
            parts.append("\n  CONTACT SPECIAL:")
            parts.append("  Pour plus d'informations sur notre certification,")
            parts.append("  Telephone: +1 (514) 123-4567")
            
        elif seafood or shellfish:
            parts.append("\n  [ALLERGIE FRUITS DE MER]")
            parts.append("  ────────────────────────")
            parts.append("  Nous pouvons preparer des plats sans fruits de mer.")
            parts.append("\n  PLATS ALTERNATIFS:")
            parts.append("  • Grillades de viande")
            parts.append("  • Poulet braise ou rotis")
            parts.append("  • Pates avec sauces vegetales")
            parts.append("  • Legumes frais")
            parts.append("\n  NOTE IMPORTANTE:")
            parts.append("  Mentionnez votre allergie a la commande car nous")
            parts.append("  travaillons avec des fruits de mer en cuisine.")
            parts.append("  Risque de contamination croisee possible.")
            
        else:
            # Réponse générale allergies
            parts.append("\n  ALLERGIES & RÉGIMES SPÉCIAUX")
            parts.append("  ──────────────────────────")
            parts.append("\n  Nous accommodons de nombreuses allergies et régimes:")
            parts.append("  • Sans lactose")
            parts.append("  • Sans gluten")
            parts.append("  • Vegan")
            parts.append("  • Végétarien")
            parts.append("  • Halal")
            parts.append("  • Fruits de mer")
            parts.append("  • Et bien d'autres...")
            parts.append("\n  POUR COMMANDER:")
            parts.append("  1. Precisez votre allergie/regime lors de la commande")
            parts.append("  2. Contactez-nous a l'avance pour les cas speciaux")
            parts.append("  3. Notre cuisine s'engage a votre securite")
            parts.append("\n  CONTACT ALLERGIE:")
            parts.append("  Telephone: +1 (514) 123-4567")
            parts.append("  Email: allergies@tablefacil.ca")
        
        parts.append("\n  >> Votre sante et satisfaction sont notre priorite!")
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # GESTION DES COMMANDES AVANCÉE
    # ═══════════════════════════════════════════════════════════
    
    # 1. NOTIFICATION CHANGEMENT MODE LIVRAISON → EMPORTER
    if any(phrase in query_lower for phrase in ['pas besoin', 'je vais prendre', 'passer prendre', 'venir chercher', 'récupérer moi-même', 'emporter', 'sur place']):
        if order_info:
            parts.append("\n[CHANGEMENT DE MODE LIVRAISON]")
            parts.append(f"  Commande: {order_info.get('id')}")
            parts.append(f"  Montant: {order_info.get('total')} FCFA")
            parts.append("\n  Mode: A EMPORTER")
            parts.append("\n  ACTIONS REQUISES:")
            parts.append("  ─────────────────")
            parts.append("  1. Appelez le restaurant pour confirmer le changement")
            parts.append("     Telephone: +1 (514) 123-4567")
            parts.append("  2. Ou modifiez directement dans l'application:")
            parts.append("     > 'Mes Commandes'")
            parts.append("     > Cliquez sur 'Modifier la livraison'")
            parts.append("     > Selectionnez 'A emporter'")
            parts.append("\n  Note: Le livreur ne sera pas envoye.")
        else:
            parts.append("\n[CHANGEMENT DE MODE]")
            parts.append("  Aucune commande active trouvee.")
            parts.append("  Cette option concerne les commandes en cours uniquement.")
        return "\n".join(parts)
    
    # 2. STATUT RÉSERVATION POUR MOMENT PRÉCIS (ce soir, demain, etc.)
    reservation_time_keywords = {
        "ce soir": 0,
        "aujourd'hui": 0,
        "demain": 1,
        "après-demain": 2,
        "cette semaine": range(0, 7)
    }
    
    # Détecter aussi "statut de ma réservation ce soir"
    is_asking_reservation_status = any(word in query_lower for word in ['réservation', 'réserv', 'table', 'statut'])
    
    for keyword, day_offset in reservation_time_keywords.items():
        if keyword in query_lower and is_asking_reservation_status:
            if reservation_info:
                res_date_str = reservation_info.get('date')
                res_time = reservation_info.get('time')
                
                try:
                    res_date = datetime.strptime(res_date_str, '%Y-%m-%d').date()
                    today = datetime.now().date()
                    
                    if isinstance(day_offset, range):
                        date_range = [today + timedelta(days=d) for d in day_offset]
                        is_in_range = res_date in date_range
                    else:
                        target_date = today + timedelta(days=day_offset)
                        is_in_range = res_date == target_date
                    
                    if is_in_range:
                        # Vérification spéciale pour "ce soir" (doit être après 18h)
                        is_evening_query = keyword == "ce soir"
                        current_hour = datetime.now().hour
                        
                        if is_evening_query and current_hour < 18:
                            # Avant 18h, "ce soir" fait référence à plus tard dans la journée
                            parts.append(f"\n[RESERVATION {keyword.upper()}]")
                            parts.append(f"  Date: {res_date.strftime('%d/%m/%Y')}")
                            parts.append(f"  Heure: {res_time}")
                            parts.append(f"  Personnes: {reservation_info.get('guests', 'N/A')}")
                            parts.append(f"  Reference: {reservation_info.get('id')}")
                            parts.append(f"  Statut: {reservation_info.get('status')}")
                            parts.append("\n  >> C'est bien pour ce soir!")
                        else:
                            parts.append(f"\n[RESERVATION {keyword.upper()}]")
                            parts.append(f"  Date: {res_date.strftime('%d/%m/%Y')}")
                            parts.append(f"  Heure: {res_time}")
                            parts.append(f"  Personnes: {reservation_info.get('guests', 'N/A')}")
                            parts.append(f"  Reference: {reservation_info.get('id')}")
                            parts.append(f"  Statut: {reservation_info.get('status')}")
                        
                        # Calcul du temps restant
                        res_datetime = datetime.combine(res_date, datetime.strptime(res_time, '%H:%M').time())
                        time_diff = res_datetime - datetime.now()
                        hours_left = int(time_diff.total_seconds() / 3600)
                        
                        if hours_left > 0:
                            parts.append(f"\n  Temps restant: {hours_left}h")
                            if hours_left < 3:
                                parts.append("  >> ATTENTION: Annulation non remboursable (< 3h)")
                        elif hours_left == 0:
                            minutes_left = int(time_diff.total_seconds() / 60)
                            if minutes_left > 0:
                                parts.append(f"\n  Temps restant: {minutes_left} minutes")
                                parts.append("  >> C'est bientot! Preparez-vous")
                        
                        parts.append("\n  ACTIONS DISPONIBLES:")
                        parts.append("  ──────────────────")
                        parts.append("  > Modifier: 'Mes Reservations' > 'Modifier'")
                        parts.append("  > Annuler: 'Mes Reservations' > 'Annuler'")
                    else:
                        parts.append(f"\n[RESERVATION {keyword.upper()}]")
                        parts.append(f"  Aucune reservation trouvee pour cette periode.")
                        parts.append(f"\n  Votre prochaine reservation:")
                        parts.append(f"  Date: {res_date.strftime('%d/%m/%Y')}")
                        parts.append(f"  Heure: {res_time}")
                        parts.append("\n  Voulez-vous creer une nouvelle reservation?")
                    
                    return "\n".join(parts)
                except:
                    pass
            else:
                parts.append(f"\n[RESERVATION {keyword.upper()}]")
                parts.append("  Aucune reservation existante.")
                parts.append("\n  Pour en creer une:")
                parts.append("  > Menu principal > 'Reservations'")
                parts.append("  > Cliquez sur '+ Nouvelle Reservation'")
                return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 1. CRÉATION DE RÉSERVATION - Détection ultra-précise et courtoise
    # ═══════════════════════════════════════════════════════════
    create_reservation_keywords = ['créer une réservation', 'créer réservation', 'nouvelle réservation', 
                                   'je veux réserver', 'réserver pour', 'réserver une table', 'faire une réservation']
    
    if any(phrase in query_lower for phrase in create_reservation_keywords):
        parts.append("\n[NOUVELLE RÉSERVATION]")
        parts.append("\n  Nous sommes ravis de vous accueillir!")
        parts.append("  Veuillez suivre les etapes ci-dessous:")
        
        parts.append("\n  DÉMARCHES À SUIVRE:")
        parts.append("  ─────────────────")
        parts.append("  1️⃣  Ouvrez le menu principal de l'application")
        parts.append("  2️⃣  Selectionnez la section 'Réservations'")
        parts.append("  3️⃣  Cliquez sur '+ Nouvelle Réservation'")
        parts.append("  4️⃣  Remplissez tous les champs obligatoires:")
        parts.append("      • Date de votre visite")
        parts.append("      • Heure souhaitée")
        parts.append("      • Nombre de convives")
        parts.append("      • Vos coordonnees")
        parts.append("  5️⃣  Confirmez votre reservation")
        
        # Extraction intelligente des détails
        details_found = []
        
        # Date
        if 'demain' in query_lower:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime('%d/%m/%Y')
            details_found.append(f"  ✓ Date: Demain ({tomorrow})")
        elif "aujourd'hui" in query_lower or 'ce soir' in query_lower:
            today = datetime.now().strftime('%d/%m/%Y')
            details_found.append(f"  ✓ Date: Aujourd'hui ({today})")
        
        # Heure
        time_patterns = [r'(\d{1,2})h(\d{2})?', r'à (\d{1,2})h', r'pour (\d{1,2})h']
        for pattern in time_patterns:
            time_match = re.search(pattern, query_lower)
            if time_match:
                hour = time_match.group(1)
                minutes = time_match.group(2) if len(time_match.groups()) > 1 and time_match.group(2) else '00'
                details_found.append(f"  ✓ Heure: {hour}h{minutes}")
                break
        
        # Nombre de personnes
        person_patterns = [r'pour (\d+) personnes?', r'(\d+) personnes?', r'table de (\d+)', r'pour (\d+)']
        for pattern in person_patterns:
            person_match = re.search(pattern, query_lower)
            if person_match:
                nb_persons = person_match.group(1)
                details_found.append(f"  ✓ Nombre de convives: {nb_persons}")
                break
        
        if details_found:
            parts.append("\n  INFORMATIONS DÉTECTÉES AUTOMATIQUEMENT:")
            parts.append("  ───────────────────────────────────")
            parts.extend(details_found)
            parts.append("\n  💡 Veuillez verifier et confirmer ces informations")
            parts.append("     lors de la creation de votre reservation.")
        
        # Conseil additionnel si anniversaire détecté
        if 'anniversaire' in query_lower or 'fete' in query_lower:
            parts.append("\n  🎂 OFFRE ANNIVERSAIRE SPÉCIALE")
            parts.append("  ─────────────────────────────")
            parts.append("  Vous commemorez un anniversaire? Super!")
            parts.append("  • Gâteau gratuit offert")
            parts.append("  • 15% reduction sur l'ensemble du groupe")
            parts.append("  • Decoration festive de votre table")
            parts.append("  >> Indiquez 'Anniversaire' lors de la reservation")
            parts.append("     et joignez une piece d'identité pour confirmation")
        
        if reservation_info:
            parts.append("\n  ⚠️  NOTE IMPORTANTE")
            parts.append("  Vous possedez deja une reservation active.")
            parts.append("  Cette nouvelle sera independante de la precedente.")
        
        parts.append("\n  BESOIN D'AIDE?")
        parts.append("  Contactez notre equipe client:")
        parts.append("  Telephone: +1 (514) 123-4567")
        parts.append("  Email: contact@tablefacil.ca")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 2. MODIFICATION DE RÉSERVATION
    # ═══════════════════════════════════════════════════════════
    if any(phrase in query_lower for phrase in ['modifier', 'changer ma réservation', 'modifier réservation', 'changer réservation']):
        if reservation_info:
            parts.append("\n[MODIFICATION RESERVATION]")
            parts.append(f"\n  Reservation actuelle:")
            parts.append(f"  {reservation_info.get('text')}")
            parts.append("\n  ETAPES A SUIVRE:")
            parts.append("  ────────────────")
            parts.append("  1. Allez dans 'Mes Reservations'")
            parts.append("  2. Selectionnez la reservation concernee")
            parts.append("  3. Cliquez sur 'Modifier'")
            parts.append("  4. Modifiez date / heure / nombre de personnes")
            parts.append("  5. Confirmez les changements")
        else:
            parts.append("\n[MODIFICATION RESERVATION]")
            parts.append("  Vous n'avez pas de reservation active.")
            parts.append("  Cette option concerne vos reservations existantes.")
            parts.append("\n  Voulez-vous creer une nouvelle reservation?")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 3. ANNULATION DE RÉSERVATION
    # ═══════════════════════════════════════════════════════════
    if 'annul' in query_lower:
        if reservation_info:
            parts.append("\n[ANNULATION RESERVATION]")
            parts.append(f"\n  Reservation concernee:")
            parts.append(f"  {reservation_info.get('text')}")
            
            # Calculer si l'annulation est gratuite
            try:
                res_date_str = reservation_info.get('date')
                res_time = reservation_info.get('time')
                res_date = datetime.strptime(res_date_str, '%Y-%m-%d').date()
                res_datetime = datetime.combine(res_date, datetime.strptime(res_time, '%H:%M').time())
                time_diff = res_datetime - datetime.now()
                hours_left = time_diff.total_seconds() / 3600
                
                parts.append(f"\n  Temps restant: {int(hours_left)}h")
                if hours_left >= 3:
                    parts.append("  >> ANNULATION GRATUITE possible")
                else:
                    parts.append("  >> ATTENTION: Annulation TARDIVE - Frais applicables")
            except:
                pass
            
            parts.append("\n  ETAPES POUR ANNULER:")
            parts.append("  ──────────────────")
            parts.append("  1. Allez dans 'Mes Reservations'")
            parts.append("  2. Selectionnez la reservation")
            parts.append("  3. Cliquez sur 'Annuler'")
            parts.append("  4. Confirmez l'annulation")
            parts.append("\n  CONDITIONS:")
            parts.append("  ───────────")
            parts.append("  - Annulation GRATUITE jusqu'a 3h avant")
            parts.append("  - Frais applicables si annulation tardive")
        else:
            parts.append("\n[ANNULATION RESERVATION]")
            parts.append("  Vous n'avez pas de reservation active.")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 4. RECOMMANDATIONS GASTRONOMIQUES
    # ═══════════════════════════════════════════════════════════
    if any(phrase in query_lower for phrase in ['recommand', 'quel plat', 'quoi manger', 'conseil', 'suggère', 'propose', 'menu', 'plat']):
        parts.append("\n[RECOMMANDATIONS GASTRONOMIQUES]")
        
        # Déterminer si l'utilisateur a des préférences spéciales
        vegetarian_pref = 'végétarien' in query_lower or 'vegetarien' in query_lower
        vegan_pref = 'vegan' in query_lower
        seafood_pref = any(word in query_lower for word in ['poisson', 'fruit de mer', 'crustacé'])
        meat_pref = any(word in query_lower for word in ['viande', 'steak', 'poulet', 'boeuf', 'agneau'])
        light_pref = any(word in query_lower for word in ['leger', 'léger', 'sain', 'light', 'leger'])
        
        if meat_pref:
            parts.append("\n  SPÉCIALITÉS DE VIANDES")
            parts.append("  ─────────────────────")
        elif seafood_pref:
            parts.append("\n  SPÉCIALITÉS DE FRUITS DE MER")
            parts.append("  ───────────────────────────")
        elif vegetarian_pref:
            parts.append("\n  PLATS VÉGÉTARIENS")
            parts.append("  ─────────────────")
        elif vegan_pref:
            parts.append("\n  PLATS VEGAN")
            parts.append("  ───────────")
        elif light_pref:
            parts.append("\n  PLATS LÉGERS & ÉQUILIBRÉS")
            parts.append("  ────────────────────────")
        else:
            parts.append("\n  NOS PLATS POPULAIRES")
            parts.append("  ──────────────────")
        
        plat_count = 0
        if retrieved:
            for doc in retrieved[:10]:  # Récupérer jusqu'à 10 plats
                title = doc.get('title', '')
                text = doc.get('text', '')
                
                # Parser les plats du menu
                if text.startswith('{'):
                    try:
                        plat_data = json.loads(text)
                        if 'price' in plat_data:
                            # Filtrer selon les préférences
                            category = plat_data.get('category', '').lower()
                            name = plat_data.get('name', title).lower()
                            
                            # Appliquer les filtres de préférence
                            skip = False
                            if meat_pref and not any(w in category or w in name for w in ['viande', 'poulet', 'boeuf', 'agneau', 'steak']):
                                skip = True
                            if seafood_pref and not any(w in category or w in name for w in ['poisson', 'fruit de mer', 'crustacé', 'crevette']):
                                skip = True
                            if vegetarian_pref and 'viande' in category or 'viande' in name:
                                skip = True
                            if vegan_pref and any(w in category or w in name for w in ['fromage', 'lait', 'oeuf', 'beurre', 'creme']):
                                skip = True
                            
                            if not skip:
                                plat_count += 1
                                
                                parts.append(f"\n  [{plat_count}] {plat_data.get('name', title)}")
                                parts.append(f"       Prix: {plat_data.get('price')} FCFA")
                                
                                desc = plat_data.get('description', '')
                                if desc:
                                    desc_short = desc[:90] + '...' if len(desc) > 90 else desc
                                    parts.append(f"       {desc_short}")
                                
                                cat = plat_data.get('category', '')
                                if cat:
                                    parts.append(f"       Type: {cat}")
                                
                                # Ajouter les allergènes si disponibles
                                allergens = plat_data.get('allergens', [])
                                if allergens and isinstance(allergens, list):
                                    parts.append(f"       Allergènes: {', '.join(allergens)}")
                                
                                if plat_count >= 4:
                                    break
                    except:
                        continue
        
        if plat_count == 0:
            parts.append("\n  Consultez notre Menu complet dans l'application!")
            parts.append("  Section 'Menu' > Explorez toutes nos categories")
            parts.append("\n  CATÉGORIES DISPONIBLES:")
            parts.append("  • Viandes grillées")
            parts.append("  • Fruits de mer frais")
            parts.append("  • Plats végétariens")
            parts.append("  • Pâtes et riz")
            parts.append("  • Desserts gourmands")
        else:
            parts.append(f"\n  >> Nous avons selectionné {plat_count} plats pour vous")
            parts.append("     Consultez l'application pour voir tous les choix!")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 5. SUIVI DE COMMANDE - Statut détaillé
    # ═══════════════════════════════════════════════════════════
    if any(word in query_lower for word in ['commande', 'ma commande', 'suivre', 'suivi', 'statut']):
        if order_info:
            
            parts.append("\n[VOTRE COMMANDE]")
            parts.append(f"\n  Reference: {order_info.get('id')}")
            parts.append(f"  Montant total: {order_info.get('total')} FCFA")
            
            # Analyser le statut avec détails
            status = order_info.get('status', '').lower()
            delivery_mode = order_info.get('delivery_mode', 'delivery')  # 'delivery' ou 'takeout'
            
            if 'ready' in status or 'prêt' in status:
                parts.append("\n  STATUT: PRÊTE")
                parts.append("  ─────────────")
                parts.append("  Votre commande est prête!")
                
                if delivery_mode == 'delivery' or 'livraison' in query_lower:
                    parts.append("  En cours de livraison vers votre adresse")
                    parts.append("\n  LIVREUR ASSIGNÉ:")
                    parts.append("  Temps estimé: 15-25 minutes")
                    parts.append("  Suivez le livreur en temps réel")
                else:
                    parts.append("  Vous pouvez venir la recuperer")
                    parts.append("\n  Adresse du restaurant:")
                    parts.append("  2050 Rue Saint-Denis")
                    parts.append("  Montréal, QC H2X 3K7")
            elif 'preparing' in status or 'préparation' in status:
                parts.append("\n  STATUT: EN PREPARATION")
                parts.append("  ──────────────────────")
                parts.append("  Nos cuisiniers s'en occupent avec soin")
                parts.append("  Temps estime: 15-20 minutes")
                parts.append("\n  Vous serez notifie quand elle sera prete")
            elif 'pending' in status or 'attente' in status:
                parts.append("\n  STATUT: EN ATTENTE")
                parts.append("  ──────────────────")
                parts.append("  Commande reçue et confirmee")
                parts.append("  Elle sera preparee sous peu")
                parts.append("  Temps d'attente moyen: 5 minutes")
            elif 'delivered' in status or 'livré' in status:
                parts.append("\n  STATUT: LIVREE")
                parts.append("  ───────────────")
                parts.append("  Bon appetit!")
                parts.append("  N'oubliez pas de noter votre experience")
            elif 'cancelled' in status or 'annulé' in status:
                parts.append("\n  STATUT: ANNULEE")
                parts.append("  ────────────────")
                parts.append("  Cette commande a ete annulee")
            
            parts.append("\n  ACTIONS DISPONIBLES:")
            parts.append("  ──────────────────")
            parts.append("  > Voir details: 'Mes Commandes'")
            parts.append("  > Suivre en temps reel: Notifications activees")
            parts.append("  > Contacter: +1 (514) 123-4567")
        else:
            parts.append("\n[VOTRE COMMANDE]")
            parts.append("  Aucune commande en cours")
            parts.append("\n  HISTORIQUE:")
            parts.append("  ──────────")
            parts.append("  Consultez 'Mes Commandes' pour voir vos anciennes commandes")
            parts.append("\n  NOUVELLE COMMANDE:")
            parts.append("  ────────────────")
            parts.append("  Parcourez notre 'Menu' pour commander")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 7. CONTACT & LOCALISATION - Service client premium
    # ═══════════════════════════════════════════════════════════
    if any(word in query_lower for word in ['contact', 'téléphone', 'appeler', 'adresse', 'où', 'localisation', 'service client']):
        parts.append("\n[NOUS CONTACTER]")
        
        is_urgent = any(word in query_lower for word in ['urgent', 'immédiat', 'rapide', 'vite'])
        
        if is_urgent:
            parts.append("\n  📞 ASSISTANCE IMMÉDIATE")
            parts.append("  ───────────────────────")
            parts.append("  Telephone direct (Priorite):")
            parts.append("  +1 (514) 123-4567")
            parts.append("  Disponible 24/7 pour vos urgences")
        else:
            parts.append("\n  COORDONNÉES COMPLÈTES")
            parts.append("  ────────────────────")
            parts.append("\n  📱 Telephone: +1 (514) 123-4567")
            parts.append("  📧 Email: contact@tablefacil.ca")
            parts.append("  💬 Chat: Via l'application (24/7)")
            
            parts.append("\n  HORAIRES SUPPORT CLIENT")
            parts.append("  ──────────────────────")
            parts.append("  Lun-Ven: 09h00 - 18h00")
            parts.append("  Samedi: 10h00 - 16h00")
            parts.append("  Dimanche: 12h00 - 20h00")
        
        parts.append("\n  📍 ADRESSE PHYSIQUE")
        parts.append("  ──────────────────")
        parts.append("  TableFacil Restaurant")
        parts.append("  2050 Rue Saint-Denis")
        parts.append("  Montréal, QC H2X 3K7, Canada")
        
        parts.append("\n  🗺️  TROUVER FACILEMENT")
        parts.append("  Utilisez Google Maps depuis l'application")
        parts.append("  ou appelez pour les indications")
        
        parts.append("\n  DEPARTMENTS SPECIALISES")
        parts.append("  ──────────────────────")
        parts.append("  • Reservations: contact@tablefacil.ca")
        parts.append("  • Remboursements: remboursements@tablefacil.ca")
        parts.append("  • Evenements: events@tablefacil.ca")
        parts.append("  • Reclamations: support@tablefacil.ca")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 8. HORAIRES & ANNULATION - Réponse concise et précise
    # ═══════════════════════════════════════════════════════════
    if any(word in query_lower for word in ['horaire', 'ouvert', 'ferme', 'ouvre', 'heure', 'quand']):
        parts.append("\n[HORAIRES]")
        parts.append("  Service midi : 12h00 - 14h00")
        parts.append("  Service soir : 19h00 - 21h30")
        parts.append("  Dernière arrivée recommandée : 30 min avant fermeture cuisine")

        if any(word in query_lower for word in ['annulation', 'annuler', 'politique', 'condition']):
            parts.append("\n[POLITIQUE D'ANNULATION]")
            parts.append("  Gratuit : jusqu'à 3h avant l'heure de réservation")
            parts.append("  Tardif : -50% de l'acompte si annulation < 3h")
            parts.append("  No-show : acompte non remboursé")
            parts.append("  Comment annuler : app > Mes Réservations ou tél/email")

        parts.append("\nRéservez ou modifiez depuis l'app (Mes Réservations) ou contactez-nous : +1 (514) 123-4567 / reservations@tablefacil.ca")
        return "\n".join(parts)

    # Bloc dédié si on demande la politique d'annulation sans mention d'horaires
    if any(word in query_lower for word in ['annulation', 'annuler', 'politique', 'condition']):
        parts.append("\n[POLITIQUE D'ANNULATION]")
        parts.append("  Gratuit : jusqu'à 3h avant l'heure de réservation")
        parts.append("  Tardif : -50% de l'acompte si annulation < 3h")
        parts.append("  No-show : acompte non remboursé")
        parts.append("  Comment annuler : app > Mes Réservations ou tél/email")
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 9. PROMOTIONS & OFFRES - Événements spéciaux
    # ═══════════════════════════════════════════════════════════
    if any(word in query_lower for word in ['promo', 'promotion', 'offre', 'réduction', 'deal', 'event', 'anniversaire', 'noël', 'thanksgiving', 'special']):
        parts.append("\n[PROMOTIONS & OFFRES SPÉCIALES]")
        
        # Détection des événements spéciaux
        is_birthday = any(word in query_lower for word in ['anniversaire', 'fete', 'celebration', 'birthday'])
        is_holiday = any(word in query_lower for word in ['noël', 'noel', 'thanksgiving', 'réveillon', 'nouvel an', 'pâques'])
        
        if is_birthday:
            parts.append("\n  [OFFRE ANNIVERSAIRE]")
            parts.append("  ──────────────────")
            parts.append("  Celebrez votre anniversaire avec nous!")
            parts.append("\n  AVANTAGES EXCLUSIFS:")
            parts.append("  • Gateau offert pour toute commande groupe")
            parts.append("  • Decorations festives de la table gratuites")
            parts.append("  • Reduction 15% sur tous les plats du groupe")
            parts.append("  • Service prioritaire reservé")
            parts.append("\n  POUR BENEFICIER:")
            parts.append("  1. Reserver une table pour 4 personnes minimum")
            parts.append("  2. Indiquer 'Anniversaire' lors de la reservation")
            parts.append("  3. Envoyer une photo d'identité confirmant la date")
            parts.append("\n  CONTACT SPECIAL EVENEMENTS:")
            parts.append("  Telephone: +1 (514) 123-4567")
            parts.append("  Email: events@tablefacil.ca")
        elif is_holiday:
            parts.append("\n  [OFFRES SAISONNIÈRES]")
            parts.append("  ────────────────────")
            
            if 'noël' in query_lower or 'noel' in query_lower:
                parts.append("  MENU DE NOËL SPÉCIAL")
                parts.append("  • Plats festifs exclusifs")
                parts.append("  • Reduction 20% sur les menus groupe")
                parts.append("  • Vin blanc gratuit avec le menu prestige")
            elif 'thanksgiving' in query_lower:
                parts.append("  MENU THANKSGIVING")
                parts.append("  • Specialites americaines revisitees")
                parts.append("  • Buffet groupe a prix reduit")
                parts.append("  • Ambiance festive reservée")
            else:
                parts.append("  OFFRES DE SAISON")
                parts.append("  • Menus speciaux et limites")
                parts.append("  • Reductions pour groupes")
                parts.append("  • Atmosphere festive")
            
            parts.append("\n  RESERVE TON EXPERIENCE!")
            parts.append("  Disponibilite limitee - Reservation vivement conseillée")
        else:
            # Offres régulières
            parts.append("\n  [OFFRES RÉGULIÈRES]")
            parts.append("  ──────────────────")
            parts.append("\n  [1] HAPPY HOUR (17h-19h)")
            parts.append("      30% de reduction sur toutes les boissons")
            parts.append("      Parfait pour un apéritif en fin de journée")
            parts.append("\n  [2] MENU DU JOUR (Lun-Ven)")
            parts.append("      Entree + Plat + Dessert = 4500 FCFA")
            parts.append("      Formule economique et savoureuse")
            parts.append("\n  [3] OFFRE GROUPE (6+ personnes)")
            parts.append("      10% de reduction automatique")
            parts.append("      Service attentif et convivial")
            parts.append("\n  [4] OFFRE ANNIVERSAIRE")
            parts.append("      Gateau GRATUIT + 15% reduction")
            parts.append("      Pour la celebrer dignement")
            parts.append("\n  >> Profite de ces offres exclusives!")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # 10. REMBOURSEMENTS & LITIGES
    # ═══════════════════════════════════════════════════════════
    if any(word in query_lower for word in ['remboursement', 'remboursé', 'acompte', 'argent', 'paiement', 'litige', 'problème', 'reclamation']):
        parts.append("\n[GESTION DES REMBOURSEMENTS]")
        
        is_advance_payment = any(word in query_lower for word in ['acompte', 'reserve', 'depot'])
        
        if is_advance_payment:
            parts.append("\n  REMBOURSEMENT DE L'ACOMPTE")
            parts.append("  ──────────────────────────")
            parts.append("\n  Voici notre politique de remboursement:")
            parts.append("\n  ANNULATION GRATUITE (sans frais):")
            parts.append("  • Jusqu'a 3 heures avant votre reservation")
            parts.append("  • Acompte remboursé INTÉGRALEMENT dans 2-3 jours")
            parts.append("\n  ANNULATION TARDIVE (frais applicables):")
            parts.append("  • Moins de 3 heures avant")
            parts.append("  • 50% de l'acompte conservé comme frais de dossier")
            parts.append("  • 50% remboursé sous 2-3 jours")
            parts.append("\n  REMBOURSEMENT EN COURS?")
            parts.append("  Si vous avez annulé votre reservation et n'avez")
            parts.append("  pas reçu votre acompte, veuillez contacter:")
            parts.append("\n  SERVICE CLIENT - Remboursements")
            parts.append("  Telephone: +1 (514) 123-4567")
            parts.append("  Email: remboursements@tablefacil.ca")
            parts.append("  Horaires: Lun-Ven 09h00-18h00")
            parts.append("\n  POUR FACILITER LE TRAITEMENT:")
            parts.append("  Fournissez:")
            parts.append("  • Numero de reservation")
            parts.append("  • Date et montant de l'acompte")
            parts.append("  • Numero de compte pour le remboursement")
        else:
            parts.append("\n  RÉCLAMATIONS & LITIGES")
            parts.append("  ─────────────────────")
            parts.append("\n  Nous prenons tous les problemes au serieux.")
            parts.append("\n  PROCEDURE DE RECLAMATION:")
            parts.append("  1. Contactez notre service clientele immediatement")
            parts.append("  2. Decrire votre probleme en detail")
            parts.append("  3. Fournir les justificatifs (photo, facture, etc.)")
            parts.append("  4. Notre equipe traite dans les 24-48h")
            parts.append("\n  CANAUX DE CONTACT:")
            parts.append("  Chat direct: via l'application (24/7)")
            parts.append("  Email: support@tablefacil.ca")
            parts.append("  Telephone: +1 (514) 123-4567")
        
        return "\n".join(parts)
    
    # ═══════════════════════════════════════════════════════════
    # RÉPONSE PAR DÉFAUT - Utiliser les documents RAG récupérés
    # ═══════════════════════════════════════════════════════════
    if not parts:  # Si aucune condition spécifique n'a été remplie
        if retrieved and len(retrieved) > 0:
            # Analyser le contenu pour un formatage intelligent
            query_keywords = query_lower.split()
            is_reservation_query = any(kw in query_keywords for kw in ['réservation', 'réserver', 'reservation', 'table', 'booking'])
            is_how_to_query = any(kw in query_keywords for kw in ['comment', 'how', 'faire', 'créer', 'créer'])
            
            # Extraire et formater le contenu pertinent
            for doc in retrieved[:2]:
                doc_text = doc.get('text', '').strip()
                doc_title = doc.get('title', '')
                
                if doc_text and not doc_text.startswith('{'):
                    # Si c'est une question "comment faire"
                    if is_how_to_query and is_reservation_query:
                        parts.append("\nCOMMENT FAIRE UNE RÉSERVATION:")
                        parts.append("\n1. Cliquez sur 'Réserver une table' ci-dessous")
                        parts.append("2. Choisissez la date et l'heure souhaitées")
                        parts.append("3. Indiquez le nombre de personnes")
                        parts.append("4. Ajoutez vos préférences (allergies, occasions spéciales)")
                        parts.append("5. Validez votre réservation")
                        parts.append("\nDélai de confirmation: Sous 24h")
                        parts.append("Annulation gratuite: Jusqu'à 3h avant votre arrivée")
                        parts.append("\nVous recevrez une confirmation par email.")
                        break  # Ne pas afficher le texte brut du document
                    else:
                        # Afficher le texte du document avec formatage simple
                        lines = doc_text.split('\n')
                        for line in lines[:6]:
                            if line.strip() and not line.strip().startswith('#'):
                                parts.append(line.strip())
            
            parts.append("\n>> Besoin de plus de détails?")
            
            # Suggestions contextuelles
            if is_reservation_query:
                parts.append("Utilisez le bouton 'Réserver une table' ci-dessous pour commencer.")
            else:
                parts.append("Posez-moi une question plus spécifique!")
                parts.append("Ex: 'Statut de ma réservation ce soir' ou 'Quels sont vos horaires?'")
        else:
            # Aucun document trouvé
            parts.append("\nJe n'ai pas trouvé d'information spécifique pour votre question.")
            parts.append("\nJe peux vous renseigner sur:")
            parts.append("  - Le menu et les plats")
            parts.append("  - Les réservations")
            parts.append("  - Les commandes")
            parts.append("  - Les allergènes")
            parts.append("  - Les promotions")
            parts.append("\nReformulez votre question ou choisissez un sujet.")
    
    return "\n".join(parts)


@assist_bp.route('/api/assist/client/query', methods=['POST'])
def client_assistant_query():
    """Retourne une réponse assistant côté client avec retrieval et fusion live."""
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

        body = request.get_json() or {}
        user_query = body.get('message') or ''
        client_id = user_data.get('user_id') or user_data.get('id')
        user_name = user_data.get('name') or user_data.get('username', '')
        
        # Vérifier si c'est le premier message du jour
        first_message_today = is_first_message_today(client_id)

        try:
            orders = _filter_client_items(load_data('orders.json'), client_id)
        except Exception:
            orders = []
        try:
            reservations = _filter_client_items(load_data('reservations.json'), client_id)
        except Exception:
            reservations = []

        # Déterminer si on doit afficher le menu ou les réservations
        query_lower = user_query.lower() if user_query else ""
        
        # Obtenir les résultats RAG une seule fois
        rag = get_rag_client()
        retrieved = rag.retrieve(user_query, top_k=5)
        live_summary = _summarize_live(orders, reservations)
        
        # ═══════════════════════════════════════════════════════════
        # DÉTECTION DE RECHERCHE DE PLAT SPÉCIFIQUE - Avant RAG
        # ═══════════════════════════════════════════════════════════
        
        # Mots clairement hors contexte restaurant (non exhaustif, uniquement les plus évidents)
        hors_contexte_keywords = [
            'voiture', 'auto', 'véhicule', 'conduire', 'démarrer une voiture', 'moteur',
            'ordinateur', 'windows', 'logiciel', 'programmer', 'informatique',
            'football', 'basket', 'sport', 'match', 'équipe', 'joueur',
            'gouvernement', 'élection', 'président', 'député', 'ministre',
            'vêtement', 'chaussure', 'pantalon', 'mode', 'fashion',
            'immobilier', 'maison à vendre', 'appartement', 'loyer',
            'médecine', 'hôpital', 'docteur', 'médicament', 'traitement'
        ]
        
        # Mots clés FORTEMENT liés au restaurant (termes spécifiques)
        restaurant_keywords = [
            'restaurant', 'tablefacil', 'resto',
            'horaire', 'heure', 'ouvert', 'fermé', 'fermeture', 'ouverture',
            'réservation', 'réserver', 'table', 'créneau', 'disponibilité',
            'menu', 'plat', 'repas', 'manger', 'nourriture', 'cuisine',
            'commander', 'commande', 'livraison', 'emporter', 'service',
            'annulation', 'annuler', 'modifier', 'reporter',
            'allergène', 'allergie', 'végétarien', 'vegan', 'ingrédient',
            'acompte', 'dépôt', 'remboursement',
            'serveur', 'gérant', 'chef', 'personnel',
            'boisson', 'vin', 'bière', 'cocktail', 'dessert', 'entrée'
        ]
        
        # Question est hors contexte SEULEMENT si elle contient un mot hors contexte
        # ET qu'elle ne contient AUCUN mot lié au restaurant
        has_off_topic = any(kw in query_lower for kw in hors_contexte_keywords)
        has_restaurant_context = any(kw in query_lower for kw in restaurant_keywords)
        
        is_hors_contexte = has_off_topic and not has_restaurant_context
        
        # Détection pour questions spécifiques sur un plat (seulement si contexte restaurant valide)
        if not is_hors_contexte and any(phrase in query_lower for phrase in ['avez', 'servez', 'proposez', 'avez-vous', 'tu as', 'y a', 'existe']):
            # L'utilisateur demande un plat spécifique
            try:
                recipes = load_data('recipes.json') or []
                found_plats = []
                
                # Extraire les mots clés du plat demandé (filtrer les mots courants)
                words = re.findall(r'\b\w+\b', query_lower)
                stop_words = ['est', 'ce', 'que', 'vous', 'servez', 'avez', 'proposez', 'des', 'du', 'de', 'la', 'le', 'un', 'une', 'et', 'ou', 'y', 'a', 'existe', 'tu', 'as', 'il', 'comment', 'faire', 'demarrer', 'démarrer']
                dish_keywords = [w for w in words if w not in stop_words and len(w) > 2]
                
                if dish_keywords:
                    # Chercher les recettes correspondant aux mots clés
                    for recipe in recipes:
                        recipe_name_lower = recipe.get('name', '').lower()
                        recipe_desc_lower = recipe.get('description', '').lower()
                        
                        # Vérifier si au moins un mot clé correspond
                        matches = sum(1 for keyword in dish_keywords if keyword in recipe_name_lower or keyword in recipe_desc_lower)
                        if matches > 0 or any(keyword in recipe_name_lower for keyword in dish_keywords):
                            found_plats.append(recipe)
                    
                    # Si on a trouvé des plats, afficher les résultats
                    if found_plats:
                        parts = []
                        parts.append("\n[PLATS DISPONIBLES]")
                        parts.append("  ──────────────────")
                        
                        for plat in found_plats[:3]:
                            parts.append(f"\n  ✓ {plat.get('name')}")
                            parts.append(f"    Prix: {plat.get('price')}")
                            parts.append(f"    {plat.get('description')}")
                            if plat.get('allergens'):
                                parts.append(f"    ⚠️  {plat.get('allergens')}")
                        
                        parts.append("\n  >> Cliquez sur 'Accéder au menu' pour commander!")
                        
                        answer_text_temp = "\n".join(parts)
                        rich_response = _build_rich_response(
                            text=answer_text_temp,
                            recipes=found_plats[:3],
                            include_menu_link=True,
                            include_reservation_link=False
                        )
                        
                        # Sauvegarder et retourner
                        save_message(
                            user_id=client_id,
                            message=user_query,
                            response=json.dumps(rich_response),
                            role='client'
                        )
                        
                        return jsonify({
                            'answer': rich_response,
                            'sources': retrieved,
                            'timestamp': _now_iso()
                        })
                    else:
                        # Aucun plat trouvé - répondre poliment
                        parts = []
                        parts.append("\n[PLAT NON TROUVÉ]")
                        parts.append("  ──────────────")
                        parts.append(f"\n  Nous n'avons pas trouvé '{' '.join(dish_keywords)}'")
                        parts.append("  dans notre menu actuel.")
                        parts.append("\n  SUGGESTIONS:")
                        parts.append("  • Consultez notre menu complet pour voir tous les plats")
                        parts.append("  • Parcourez les différentes catégories (viande, poisson, etc)")
                        parts.append("  • Nos plats populaires: Poulet Rôti, Steak Grillé, Saumon")
                        parts.append("\n  >> Accédez au menu pour découvrir toutes nos spécialités!")
                        
                        answer_text_temp = "\n".join(parts)
                        rich_response = _build_rich_response(
                            text=answer_text_temp,
                            recipes=[],
                            include_menu_link=True,
                            include_reservation_link=False
                        )
                        
                        save_message(
                            user_id=client_id,
                            message=user_query,
                            response=answer_text_temp,
                            role='client'
                        )
                        
                        return jsonify({
                            'answer': rich_response,
                            'sources': retrieved,
                            'timestamp': _now_iso()
                        })
            except Exception as e:
                print(f"Erreur recherche plat: {e}")
                # Continuer avec le flot normal si erreur
        
        # ═══════════════════════════════════════════════════════════
        # FILTRER LES QUESTIONS HORS CONTEXTE
        # ═══════════════════════════════════════════════════════════
        if is_hors_contexte:
            parts = []
            parts.append("\n[HORS CONTEXTE]")
            parts.append("  ───────────────")
            parts.append("\n  Cette question ne concerne pas notre restaurant.")
            parts.append("\n  Je peux vous aider avec :")
            parts.append("  • Menu et plats disponibles")
            parts.append("  • Réservations de tables")
            parts.append("  • Commandes et livraisons")
            parts.append("  • Avis et recommandations")
            parts.append("  • Programme de fidélité")
            parts.append("  • Informations sur le restaurant")
            parts.append("\n  Exemples : \"Avez-vous du poulet rôti ?\" / \"Comment faire une réservation ?\"")
            
            answer_text = "\n".join(parts)
            rich_response = _build_rich_response(
                text=answer_text,
                recipes=None,
                include_menu_link=True,
                include_reservation_link=True
            )
            
            save_message(
                user_id=client_id,
                message=user_query,
                response=answer_text,
                role='client'
            )
            
            return jsonify({
                'answer': rich_response,
                'sources': [],
                'timestamp': _now_iso()
            })
        
        # Continuer avec le flot normal
        answer_text = _compose_answer(
            user_query, 
            retrieved, 
            live_summary,
            user_id=client_id,
            user_name=user_name,
            is_first_today=first_message_today
        )

        show_menu = any(word in query_lower for word in ['menu', 'plat', 'manger', 'commander', 'recette', 'recommand', 'spécial', 'what to eat', 'recommandé'])
        show_reservations = any(word in query_lower for word in ['réservation', 'réserv', 'table', 'book', 'disponib', 'quand', 'ce soir', 'demain'])
        
        # Récupérer les recettes recommandées si le menu est demandé
        recommended_recipes = None
        if show_menu:
            recommended_recipes = _get_menu_recommendations()

        # Construire la réponse enrichie
        rich_response = _build_rich_response(
            text=answer_text,
            recipes=recommended_recipes,
            include_menu_link=show_menu or any(word in query_lower for word in ['menu', 'browse', 'parcourir']),
            include_reservation_link=show_reservations or any(word in query_lower for word in ['réserv', 'table', 'book'])
        )

        # DEBUG: Vérifier la réponse
        print(f"[DEBUG] answer_text length: {len(answer_text)}")
        print(f"[DEBUG] answer_text preview: {answer_text[:200] if answer_text else 'EMPTY'}")
        print(f"[DEBUG] rich_response: {rich_response}")

        # Sauvegarder la conversation dans l'historique (avec le JSON enrichi si applicable)
        import json as json_module
        response_to_save = json_module.dumps(rich_response) if rich_response.get('hasRecipes') or rich_response.get('hasMenuLink') else answer_text
        save_message(
            user_id=client_id,
            message=user_query,
            response=response_to_save,
            role='client'
        )

        return jsonify({
            'answer': rich_response,
            'sources': retrieved,
            'live': {
                'orders': orders[:3],
                'reservations': reservations[:3]
            },
            'timestamp': _now_iso()
        })
    except Exception as e:
        print(f"Erreur assist client: {e}")
        return jsonify({'error': str(e)}), 500


def _ensure_manager(user_data):
    if not user_data:
        return False
    return user_data.get('role') in ['gerant', 'admin', 'service_client']


def _analyze_critical_alerts(orders, reservations, inventory):
    """
    Analyse automatique des problèmes critiques nécessitant l'attention du gérant.
    Retourne une liste d'alertes avec niveau de priorité.
    """
    alerts = []
    from datetime import datetime, timedelta
    
    # 1. STOCK CRITIQUE - Produits en rupture ou niveau bas
    if inventory:
        for item in inventory:
            quantity = item.get('quantity', 0)
            min_stock = item.get('minStock', 10)
            
            if quantity == 0:
                alerts.append({
                    'type': 'stock',
                    'priority': 'critical',
                    'title': f'RUPTURE DE STOCK: {item.get("name")}',
                    'description': 'Produit épuisé - Réapprovisionnement urgent requis',
                    'action': 'Commander immédiatement',
                    'itemId': item.get('id')
                })
            elif quantity <= min_stock:
                alerts.append({
                    'type': 'stock',
                    'priority': 'warning',
                    'title': f'STOCK BAS: {item.get("name")}',
                    'description': f'Quantité: {quantity} (seuil: {min_stock})',
                    'action': 'Planifier réapprovisionnement',
                    'itemId': item.get('id')
                })
    
    # 2. RÉSERVATIONS NON CONFIRMÉES - Moins de 24h
    if reservations:
        now = datetime.now()
        for res in reservations:
            if res.get('status') in ['pending', 'en_attente']:
                try:
                    res_date = datetime.fromisoformat(res.get('date', '').replace('Z', '+00:00'))
                    hours_until = (res_date - now).total_seconds() / 3600
                    
                    if 0 < hours_until <= 24:
                        alerts.append({
                            'type': 'reservation',
                            'priority': 'urgent',
                            'title': f'RÉSERVATION NON CONFIRMÉE',
                            'description': f'{res.get("clientName")} - Table {res.get("tableId")} - Dans {int(hours_until)}h',
                            'action': 'Confirmer ou contacter le client',
                            'itemId': res.get('id')
                        })
                    elif hours_until <= 4:
                        alerts.append({
                            'type': 'reservation',
                            'priority': 'critical',
                            'title': f'RÉSERVATION URGENTE NON CONFIRMÉE',
                            'description': f'{res.get("clientName")} - Dans {int(hours_until)}h',
                            'action': 'CONFIRMER IMMÉDIATEMENT',
                            'itemId': res.get('id')
                        })
                except Exception:
                    pass
    
    # 3. COMMANDES EN RETARD - Plus de 45 minutes
    if orders:
        now = datetime.now()
        for order in orders:
            if order.get('status') in ['pending', 'preparing']:
                try:
                    order_time = datetime.fromisoformat(order.get('createdAt', '').replace('Z', '+00:00'))
                    minutes_elapsed = (now - order_time).total_seconds() / 60
                    
                    if minutes_elapsed > 45:
                        alerts.append({
                            'type': 'order',
                            'priority': 'urgent',
                            'title': f'COMMANDE EN RETARD',
                            'description': f'Commande #{order.get("id")} - {int(minutes_elapsed)} min',
                            'action': 'Vérifier avec la cuisine',
                            'itemId': order.get('id')
                        })
                except Exception:
                    pass
    
    # 4. TROP DE COMMANDES EN ATTENTE - Surcharge cuisine
    pending_orders = [o for o in orders if o.get('status') in ['pending', 'preparing']]
    if len(pending_orders) > 10:
        alerts.append({
            'type': 'operations',
            'priority': 'warning',
            'title': f'SURCHARGE CUISINE',
            'description': f'{len(pending_orders)} commandes en préparation',
            'action': 'Prioriser ou refuser nouvelles commandes',
            'itemId': None
        })
    
    # 5. RÉSERVATIONS SANS TABLE ASSIGNÉE - Moins de 6h
    if reservations:
        now = datetime.now()
        for res in reservations:
            if res.get('status') == 'confirmed' and not res.get('tableId'):
                try:
                    res_date = datetime.fromisoformat(res.get('date', '').replace('Z', '+00:00'))
                    hours_until = (res_date - now).total_seconds() / 3600
                    
                    if 0 < hours_until <= 6:
                        alerts.append({
                            'type': 'reservation',
                            'priority': 'urgent',
                            'title': f'TABLE NON ASSIGNÉE',
                            'description': f'{res.get("clientName")} - {res.get("guests")} personnes - Dans {int(hours_until)}h',
                            'action': 'Assigner une table',
                            'itemId': res.get('id')
                        })
                except Exception:
                    pass
    
    # Trier par priorité (critical > urgent > warning)
    priority_order = {'critical': 0, 'urgent': 1, 'warning': 2}
    alerts.sort(key=lambda x: priority_order.get(x['priority'], 3))
    
    return alerts


# Manager assistant functions and endpoint removed - feature deprecated


# ═══════════════════════════════════════════════════════════
# ENDPOINTS POUR LA GESTION DES CONVERSATIONS
# ═══════════════════════════════════════════════════════════

@assist_bp.route('/api/assist/conversation/history', methods=['GET'])
def get_user_conversation_history():
    """
    Récupère l'historique de conversation de l'utilisateur connecté.
    Les conversations sont conservées pendant 3 jours.
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

        user_id = user_data.get('user_id') or user_data.get('id')
        
        # Récupérer l'historique (limite configurable via query param)
        limit = request.args.get('limit', 50, type=int)
        history = get_conversation_history(user_id, limit=limit)
        
        return jsonify({
            'user_id': user_id,
            'messages': history,
            'total': len(history),
            'retention_days': 3,
            'timestamp': _now_iso()
        })
    except Exception as e:
        print(f"Erreur récupération historique: {e}")
        return jsonify({'error': str(e)}), 500


@assist_bp.route('/api/assist/conversation/delete', methods=['DELETE'])
def delete_conversation():
    """
    Supprime l'historique de conversation de l'utilisateur connecté.
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

        user_id = user_data.get('user_id') or user_data.get('id')
        
        # Supprimer la conversation
        success = delete_user_conversation(user_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Conversation supprimée avec succès',
                'timestamp': _now_iso()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Aucune conversation à supprimer'
            }), 404
    except Exception as e:
        print(f"Erreur suppression conversation: {e}")
        return jsonify({'error': str(e)}), 500


@assist_bp.route('/api/assist/conversation/clean', methods=['POST'])
def clean_conversations():
    """
    Nettoie les conversations plus anciennes que 3 jours.
    Endpoint admin pour maintenance manuelle.
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

        # Vérifier que c'est un admin/gérant
        role = user_data.get('role', '')
        if role not in ['gerant', 'admin']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        # Nettoyer les anciennes conversations
        deleted_count = clean_old_conversations()
        
        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'{deleted_count} conversation(s) supprimée(s)',
            'timestamp': _now_iso()
        })
    except Exception as e:
        print(f"Erreur nettoyage conversations: {e}")
        return jsonify({'error': str(e)}), 500
