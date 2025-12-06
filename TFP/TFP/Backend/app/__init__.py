from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from flask import request

# Charger les variables d'environnement
load_dotenv()

def create_app():
    """Factory pour créer l'application Flask"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    
    # CORS - Activer pour tous les domaines
    CORS(app, 
         origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         expose_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    )
    
    # Enregistrer les blueprints
    from app.routes import register_blueprints
    register_blueprints(app)
    
    # Global handler for OPTIONS preflight to avoid auth middleware blocking preflight
    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            return ('', 200)
    
    # Route de test
    @app.route('/')
    def index():
        return {
            'status': 'online',
            'message': 'TasteFoods API - Backend d\'authentification',
            'version': '1.0.0',
            'endpoints': {
                'auth': {
                    'login_client': 'POST /api/auth/login/client',
                    'login_employee': 'POST /api/auth/login/employee',
                    'register_employee': 'POST /api/auth/register/employee',
                    'logout': 'POST /api/auth/logout',
                    'verify': 'GET /api/auth/verify',
                    'employee_types': 'GET /api/auth/employee-types',
                    'generate_code': 'GET /api/auth/generate-code/<type>'
                }
            }
        }
    
    # Route de santé
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'service': 'TasteFoods API'}, 200
    
    return app
