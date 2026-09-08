"""
Routes pour les analytics et statistiques
"""
from flask import Blueprint, request, jsonify
from app.models.database import load_data
from app.utils.jwt_utils import verify_token
from datetime import datetime, timedelta
from collections import defaultdict

analytics_bp = Blueprint('analytics', __name__)


def parse_iso_datetime(value):
    """Convertit une chaîne ISO en objet datetime"""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace('Z', ''))
    except ValueError:
        for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%S'):
            try:
                return datetime.strptime(str(value), fmt)
            except ValueError:
                continue
    return None

def check_manager_permission(token):
    """Vérifier que l'utilisateur est un gérant"""
    user_data = verify_token(token)
    # Vérifier si verify_token a retourné une erreur (tuple)
    if isinstance(user_data, tuple):
        return user_data
    if not user_data or user_data.get('role') != 'gerant':
        return None
    return user_data

@analytics_bp.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Récupérer les statistiques pour le dashboard"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        # Charger les données
        orders = load_data('orders.json')
        reservations = load_data('reservations.json')
        users = load_data('users.json')
        
        # Date d'aujourd'hui
        today = datetime.now().date().isoformat()
        
        # Commandes aujourd'hui
        orders_today = [o for o in orders if o.get('createdAt', '')[:10] == today]
        orders_count_today = len(orders_today)
        
        # Revenus aujourd'hui
        revenue_today = sum(o.get('total', 0) for o in orders_today)
        
        # Réservations aujourd'hui
        reservations_today = [r for r in reservations if r.get('date') == today]
        reservations_count = len(reservations_today)
        reservations_pending = len([r for r in reservations_today if r.get('status') == 'pending'])
        
        # Clients actifs (avec au moins une commande)
        client_ids = set(o.get('clientId') for o in orders if o.get('clientId'))
        active_clients = len(client_ids)
        
        # Panier moyen
        if orders_today:
            average_basket = revenue_today / orders_count_today
        else:
            average_basket = 0
        
        # Statistiques de la semaine dernière pour comparaison
        last_week_start = (datetime.now() - timedelta(days=7)).date().isoformat()
        last_week_end = (datetime.now() - timedelta(days=1)).date().isoformat()
        
        orders_last_week = [
            o for o in orders 
            if last_week_start <= o.get('createdAt', '')[:10] <= last_week_end
        ]
        orders_count_last_week = len(orders_last_week)
        
        # Calculer les variations en %
        orders_variation = calculate_variation(orders_count_today, orders_count_last_week)
        
        stats = {
            'ordersToday': orders_count_today,
            'ordersVariation': orders_variation,
            'reservationsToday': reservations_count,
            'reservationsPending': reservations_pending,
            'revenueToday': revenue_today,
            'revenueFormatted': f"{revenue_today:,.0f} FCFA",
            'averageBasket': average_basket,
            'averageBasketFormatted': f"{average_basket:,.0f} FCFA",
            'activeClients': active_clients,
            'date': today
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {str(e)}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/api/analytics/orders', methods=['GET'])
def get_orders_analytics():
    """Récupérer les analytics des commandes"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        # Paramètres de période
        period = request.args.get('period', 'week')  # day, week, month, year
        
        orders = load_data('orders.json')
        
        # Filtrer par période
        now = datetime.now()
        if period == 'day':
            start_date = now.date().isoformat()
            orders_filtered = [o for o in orders if o.get('createdAt', '')[:10] == start_date]
        elif period == 'week':
            start_date = (now - timedelta(days=7)).date().isoformat()
            orders_filtered = [o for o in orders if o.get('createdAt', '')[:10] >= start_date]
        elif period == 'month':
            start_date = (now - timedelta(days=30)).date().isoformat()
            orders_filtered = [o for o in orders if o.get('createdAt', '')[:10] >= start_date]
        else:  # year
            start_date = (now - timedelta(days=365)).date().isoformat()
            orders_filtered = [o for o in orders if o.get('createdAt', '')[:10] >= start_date]
        
        # Grouper par statut
        status_counts = defaultdict(int)
        for order in orders_filtered:
            status = order.get('status', 'unknown')
            status_counts[status] += 1
        
        # Grouper par type
        type_counts = defaultdict(int)
        type_revenue = defaultdict(float)
        for order in orders_filtered:
            order_type = order.get('type', 'unknown')
            type_counts[order_type] += 1
            type_revenue[order_type] += order.get('total', 0)
        
        # Revenus par jour
        daily_revenue = defaultdict(float)
        for order in orders_filtered:
            date = order.get('createdAt', '')[:10]
            daily_revenue[date] += order.get('total', 0)
        
        analytics = {
            'totalOrders': len(orders_filtered),
            'totalRevenue': sum(o.get('total', 0) for o in orders_filtered),
            'statusDistribution': dict(status_counts),
            'typeDistribution': dict(type_counts),
            'typeRevenue': dict(type_revenue),
            'dailyRevenue': dict(sorted(daily_revenue.items())),
            'period': period
        }
        
        return jsonify(analytics), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/api/analytics/popular-items', methods=['GET'])
def get_popular_items():
    """Récupérer les plats les plus commandés"""
    try:
        # Vérifier le token manager
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        # Vérifier si verify_token a retourné une erreur (tuple)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403
        
        orders = load_data('orders.json')
        
        # Compter les items
        item_counts = defaultdict(int)
        item_revenue = defaultdict(float)
        
        for order in orders:
            for item in order.get('items', []):
                item_name = item.get('name', 'Unknown')
                item_counts[item_name] += item.get('quantity', 1)
                item_revenue[item_name] += item.get('price', 0) * item.get('quantity', 1)
        
        # Trier par popularité
        popular_items = [
            {
                'name': name,
                'orders': count,
                'revenue': item_revenue[name]
            }
            for name, count in sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        return jsonify(popular_items), 200
        
    except Exception as e:
        print(f"Erreur lors de la récupération des items populaires: {str(e)}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/api/analytics/customers', methods=['GET'])
def get_customer_stats():
    """Statistiques clients réelles"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401

        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403

        users = load_data('users.json')
        orders = load_data('orders.json')
        reviews = load_data('reviews.json')

        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)

        orders_by_client = defaultdict(list)
        for order in orders:
            client_id = order.get('clientId') or order.get('userId')
            if not client_id:
                continue
            order_date = parse_iso_datetime(order.get('createdAt') or order.get('created_at'))
            if order_date:
                orders_by_client[client_id].append(order_date)

        new_clients = 0
        loyal_clients = 0
        inactive_clients = 0
        loyalty_threshold = 3

        for user in users:
            if user.get('user_type') and user.get('user_type') != 'client':
                continue

            client_id = user.get('id')
            created_at = parse_iso_datetime(user.get('created_at') or user.get('createdAt'))
            user_orders = orders_by_client.get(client_id, [])
            orders_count = max(len(user_orders), int(user.get('orders_count', 0) or 0))

            if created_at and created_at >= thirty_days_ago:
                new_clients += 1

            if orders_count >= loyalty_threshold:
                loyal_clients += 1

            if not user_orders:
                if created_at and created_at < thirty_days_ago:
                    inactive_clients += 1
            else:
                last_order = max(user_orders)
                if last_order < thirty_days_ago:
                    inactive_clients += 1

        ratings = [float(review.get('rating', 0)) for review in reviews if review.get('rating') is not None]
        satisfaction = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

        return jsonify({
            'newClients': new_clients,
            'loyalClients': loyal_clients,
            'inactiveClients': inactive_clients,
            'satisfaction': satisfaction
        }), 200

    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques clients: {str(e)}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/api/analytics/top-staff', methods=['GET'])
def get_top_staff():
    """Classement des employés performants"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401

        token = auth_header.replace('Bearer ', '')
        user_data = check_manager_permission(token)
        if isinstance(user_data, tuple):
            return user_data
        if not user_data:
            return jsonify({'error': 'Accès non autorisé - Réservé aux gérants'}), 403

        staff = load_data('staff_performance.json')
        sorted_staff = sorted(
            staff,
            key=lambda member: (
                member.get('ordersHandled', 0),
                member.get('rating', 0)
            ),
            reverse=True
        )[:3]

        return jsonify(sorted_staff), 200

    except Exception as e:
        print(f"Erreur lors de la récupération des performances employés: {str(e)}")
        return jsonify({'error': str(e)}), 500


def calculate_variation(current, previous):
    """Calculer la variation en pourcentage"""
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100, 1)
