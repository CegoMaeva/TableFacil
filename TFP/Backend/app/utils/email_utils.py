"""
Utilitaires pour l'envoi d'emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

# Configuration email (à adapter selon votre serveur SMTP)
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'noreply@restaurant.com')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Restaurant Management')

def send_password_reset_email(to_email: str, employee_name: str, reset_token: str, reset_url: str) -> bool:
    """
    Envoie un email de réinitialisation de mot de passe
    
    Args:
        to_email: Email du destinataire
        employee_name: Nom de l'employé
        reset_token: Token de réinitialisation
        reset_url: URL de réinitialisation (frontend)
    
    Returns:
        bool: True si l'email a été envoyé avec succès
    """
    try:
        # Créer le message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Réinitialisation de votre mot de passe'
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>'
        msg['To'] = to_email
        
        # Construire l'URL complète
        full_reset_url = f"{reset_url}?token={reset_token}"
        
        # Corps du message en texte
        text_body = f"""
Bonjour {employee_name},

Vous avez demandé à réinitialiser votre mot de passe.

Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
{full_reset_url}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.

Cordialement,
L'équipe de gestion du restaurant
"""
        
        # Corps du message en HTML
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{employee_name}</strong>,</p>
            
            <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte employé.</p>
            
            <p style="text-align: center;">
                <a href="{full_reset_url}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            
            <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong>.
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #0ea5e9;">{full_reset_url}</p>
            
            <p style="margin-top: 30px; color: #666;">Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.</p>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} Restaurant Management System. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Attacher les deux versions
        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # Si pas de configuration SMTP, simuler l'envoi (mode développement)
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("=" * 80)
            print("MODE DÉVELOPPEMENT - EMAIL NON ENVOYÉ")
            print("=" * 80)
            print(f"To: {to_email}")
            print(f"Subject: {msg['Subject']}")
            print(f"Reset URL: {full_reset_url}")
            print("=" * 80)
            return True
        
        # Envoyer l'email via SMTP
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
        
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email: {str(e)}")
        return False


def send_password_changed_confirmation(to_email: str, employee_name: str) -> bool:
    """
    Envoie un email de confirmation après changement de mot de passe
    
    Args:
        to_email: Email du destinataire
        employee_name: Nom de l'employé
    
    Returns:
        bool: True si l'email a été envoyé avec succès
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Votre mot de passe a été modifié'
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>'
        msg['To'] = to_email
        
        text_body = f"""
Bonjour {employee_name},

Votre mot de passe a été modifié avec succès.

Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement votre gestionnaire.

Cordialement,
L'équipe de gestion du restaurant
"""
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .success {{ background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Mot de passe modifié</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{employee_name}</strong>,</p>
            
            <div class="success">
                Votre mot de passe a été modifié avec succès.
            </div>
            
            <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            
            <p style="margin-top: 30px; color: #dc2626; font-weight: bold;">⚠️ Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement votre gestionnaire.</p>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} Restaurant Management System. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
"""
        
        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("=" * 80)
            print("MODE DÉVELOPPEMENT - EMAIL DE CONFIRMATION NON ENVOYÉ")
            print("=" * 80)
            print(f"To: {to_email}")
            print(f"Subject: {msg['Subject']}")
            print("=" * 80)
            return True
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
        
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email: {str(e)}")
        return False


def send_table_reserved_notification(to_email: str, reservation: dict, table_number: str) -> bool:
    """
    Envoie une notification au service clientèle pour indiquer qu'une table a été réservée

    Args:
        to_email: adresse email du destinataire
        reservation: objet réservation
        table_number: numéro de la table

    Returns:
        bool: True si envoi simulé/réussi
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Table {table_number} réservée - Réservation {reservation.get('id')}"
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>'
        msg['To'] = to_email

        text_body = f"""
Bonjour,

La table {table_number} a été réservée.

Détails de la réservation:
- ID: {reservation.get('id')}
- Client: {reservation.get('customer')}
- Téléphone: {reservation.get('phone')}
- Email: {reservation.get('email')}
- Date: {reservation.get('date')}
- Heure: {reservation.get('time')}

Merci de placer un signe sur la table et de la tenir indisponible ±3 heures autour de l'horaire.

Cordialement,
Système de réservation
"""

        html_body = f"""
<html><body>
<p>Bonjour,</p>
<p>La table <strong>{table_number}</strong> a été réservée.</p>
<ul>
  <li><strong>ID</strong>: {reservation.get('id')}</li>
  <li><strong>Client</strong>: {reservation.get('customer')}</li>
  <li><strong>Téléphone</strong>: {reservation.get('phone')}</li>
  <li><strong>Email</strong>: {reservation.get('email')}</li>
  <li><strong>Date</strong>: {reservation.get('date')}</li>
  <li><strong>Heure</strong>: {reservation.get('time')}</li>
</ul>
<p>Merci de placer un signe sur la table et de la tenir indisponible ±3 heures autour de l'horaire.</p>
<p>Cordialement,<br/>Système de réservation</p>
</body></html>
"""

        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print('=' * 80)
            print('MODE DÉVELOPPEMENT - EMAIL NON ENVOYÉ (notification de réservation)')
            print('=' * 80)
            print(f'To: {to_email}')
            print(f'Subject: {msg["Subject"]}')
            print(text_body)
            print('=' * 80)
            return True

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f'Erreur lors de l\'envoi de la notification de réservation: {str(e)}')
        return False
