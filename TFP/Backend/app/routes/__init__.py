from flask import Blueprint

# Importer les blueprints des différentes routes
from app.routes.auth import auth_bp
from app.routes.employees import employees_bp
from app.routes.password_reset import password_reset_bp
from app.routes.recipes import recipes_bp
from app.routes.orders import orders_bp
from app.routes.reservations import reservations_bp
from app.routes.tables import tables_bp
from app.routes.availabilities import availabilities_bp
from app.routes.inventory import inventory_bp
from app.routes.inventory_proposals import inventory_proposals_bp
from app.routes.analytics import analytics_bp
from app.routes.loyalty import loyalty_bp
from app.routes.reviews import reviews_bp
from app.routes.settings import settings_bp
from app.routes.receipts import receipts_bp
from app.routes.communications import communications_bp
from app.routes.calls import calls_bp
from app.routes.deliveries import deliveries_bp

def register_blueprints(app):
    """Enregistre tous les blueprints de l'application"""
    # Routes d'authentification avec préfixe /api/auth
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Routes de gestion des employés avec préfixe /api/employees
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    
    # Routes de réinitialisation de mot de passe avec préfixe /api/password
    app.register_blueprint(password_reset_bp, url_prefix='/api/password')
    
    # Routes de gestion des recettes
    app.register_blueprint(recipes_bp)
    
    # Routes de gestion des commandes
    app.register_blueprint(orders_bp)
    
    # Routes de gestion des réservations
    app.register_blueprint(reservations_bp)
    
    # Routes de gestion des tables
    app.register_blueprint(tables_bp)
    
    # Routes de gestion des disponibilités de réservation
    app.register_blueprint(availabilities_bp)
    
    # Routes de gestion de l'inventaire
    app.register_blueprint(inventory_bp)
    # Routes des propositions d'inventaire (cuisiniers soumettent, gérant valide)
    app.register_blueprint(inventory_proposals_bp)
    
    # Routes d'analytics et statistiques
    app.register_blueprint(analytics_bp)
    
    # Routes du programme de fidélité
    app.register_blueprint(loyalty_bp)
    
    # Routes des avis clients
    app.register_blueprint(reviews_bp)
    
    # Routes des paramètres système
    app.register_blueprint(settings_bp)
    
    # Routes des reçus de paiement
    app.register_blueprint(receipts_bp)
    
    # Routes de communications (messages clients / employés)
    app.register_blueprint(communications_bp, url_prefix='/api/communications')
    
    # Routes de gestion des appels (file d'attente, assignation)
    app.register_blueprint(calls_bp, url_prefix='/api/calls')
    
    # Routes de gestion des livraisons (preuves, positions, suivi)
    app.register_blueprint(deliveries_bp)
