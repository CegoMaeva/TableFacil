from app import create_app
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Créer l'application
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"""
         TableFacil Backend API - Démarré      

         Port: {port}                              
         Debug: {debug}                           
         Frontend: http://localhost:5174          
    
         Endpoints disponibles:                      
         • POST /api/auth/login/client               
         • POST /api/auth/login/employee             
         • POST /api/auth/register/employee          
         • POST /api/auth/logout                     
         • GET  /api/auth/verify                     
         • GET  /api/auth/employee-types             
    ╚═══════════════════════════════════════════╝
    """)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
