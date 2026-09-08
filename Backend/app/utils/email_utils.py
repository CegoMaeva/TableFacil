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


def send_reservation_confirmation(to_email: str, customer_name: str, reservation: dict) -> bool:
    """
    Envoie une confirmation de réservation au client avec les détails
    
    Args:
        to_email: Email du client
        customer_name: Nom du client
        reservation: Données de la réservation
    
    Returns:
        bool: True si envoi réussi/simulé
    """
    try:
        from email.mime.base import MIMEBase
        from email import encoders
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Confirmation de votre réservation - {reservation.get('id')}"
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>'
        msg['To'] = to_email
        
        res_date = reservation.get('date', 'N/A')
        res_time = reservation.get('time', 'N/A')
        res_guests = reservation.get('guests', 'N/A')
        res_table = reservation.get('table', 'N/A')
        res_occasion = reservation.get('occasion', '')
        
        text_body = f"""
Bonjour {customer_name},

Merci pour votre réservation! Voici les détails de votre réservation:

═══════════════════════════════════════
📅 DATE ET HEURE
═══════════════════════════════════════
Date: {res_date}
Heure: {res_time}

👥 DÉTAILS
═══════════════════════════════════════
Nombre de personnes: {res_guests}
Table: {res_table}
Occasion: {res_occasion or 'Non spécifiée'}

📝 RÉFÉRENCE
═══════════════════════════════════════
ID de réservation: {reservation.get('id')}

💡 REMARQUES IMPORTANTES
═══════════════════════════════════════
• Veuillez arriver 10-15 minutes avant l'heure prévue
• Votre table est réservée pour 2 heures maximum
• En cas d'annulation, veuillez nous prévenir au moins 24h à l'avance

Si vous avez besoin de modifier votre réservation, contactez-nous par téléphone ou email.

Merci et à bientôt!

Cordialement,
L'équipe du restaurant
"""
        
        html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #7c2d12 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ background: #f9fafb; padding: 30px; }}
        .section {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #991b1b; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #991b1b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
        .info-row:last-child {{ border-bottom: none; }}
        .info-label {{ color: #6b7280; font-weight: 600; }}
        .info-value {{ color: #1f2937; font-weight: 700; }}
        .footer {{ background: white; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; border-top: 2px solid #e5e7eb; }}
        .reference-box {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }}
        .reference-id {{ font-size: 18px; font-weight: 700; color: #92400e; font-family: monospace; }}
        .important {{ background: #fee2e2; border-left: 4px solid #991b1b; padding: 15px; margin: 15px 0; border-radius: 4px; }}
        .important li {{ color: #7c2d12; margin: 8px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Réservation Confirmée</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{customer_name}</strong>,</p>
            <p>Merci pour votre réservation! Nous sommes heureux de vous accueillir bientôt.</p>
            
            <div class="section">
                <div class="section-title">📅 Date et Heure</div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">{res_date}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Heure:</span>
                    <span class="info-value">{res_time}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">👥 Détails</div>
                <div class="info-row">
                    <span class="info-label">Nombre de personnes:</span>
                    <span class="info-value">{res_guests}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Table:</span>
                    <span class="info-value">{res_table}</span>
                </div>
                {f'<div class="info-row"><span class="info-label">Occasion:</span><span class="info-value">{res_occasion}</span></div>' if res_occasion else ''}
            </div>
            
            <div class="reference-box">
                <strong>📝 Votre numéro de réservation:</strong><br>
                <div class="reference-id">{reservation.get('id')}</div>
                <small>Conservez ce numéro pour votre dossier</small>
            </div>
            
            <div class="important">
                <strong>💡 Remarques importantes:</strong>
                <ul>
                    <li>Veuillez arriver 10-15 minutes avant l'heure prévue</li>
                    <li>Votre table est réservée pour 2 heures maximum</li>
                    <li>Pour toute modification, contactez-nous au moins 24h à l'avance</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} TableFacil Restaurant. Tous droits réservés.</p>
            <p>Si vous avez des questions, veuillez nous contacter directement.</p>
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
            print('=' * 80)
            print('MODE DÉVELOPPEMENT - EMAIL NON ENVOYÉ (confirmation réservation)')
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
        print(f'Erreur lors de l\'envoi de la confirmation de réservation: {str(e)}')
        return False


def send_order_confirmation(to_email: str, customer_name: str, order: dict) -> bool:
    """
    Envoie une confirmation de commande avec facture au client
    
    Args:
        to_email: Email du client
        customer_name: Nom du client
        order: Données de la commande
    
    Returns:
        bool: True si envoi réussi/simulé
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Confirmation de commande - Numéro {order.get('id')[:8].upper()}"
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>'
        msg['To'] = to_email
        
        # Construire la liste des items
        items_text = ""
        items_html = ""
        subtotal = 0
        
        for item in order.get('items', []):
            qty = item.get('quantity', 1)
            price = item.get('price', 0)
            name = item.get('name', 'Article')
            options = item.get('options', [])
            allergens = item.get('allergens', [])
            
            item_total = qty * price
            subtotal += item_total
            
            items_text += f"\n• {name} x{qty} ............ {item_total:.2f} FCFA"
            if options:
                items_text += f" (Options: {', '.join(options)})"
            if allergens:
                items_text += f" [Allergènes: {', '.join(allergens)}]"
            
            options_html = f"<small style='color: #6b7280;'>{', '.join(options)}</small>" if options else ""
            allergens_html = f"<small style='color: #dc2626;'>⚠️ Allergènes: {', '.join(allergens)}</small>" if allergens else ""
            
            items_html += f"""
            <tr>
                <td style='padding: 12px; border-bottom: 1px solid #e5e7eb;'>{name}</td>
                <td style='padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;'>{qty}</td>
                <td style='padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;'>{price:.2f} FCFA</td>
                <td style='padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;'>{item_total:.2f} FCFA</td>
            </tr>
            """
            if options or allergens:
                items_html += f"<tr><td colspan='4' style='padding: 8px; background: #f9fafb; font-size: 12px;'>{options_html}{allergens_html}</td></tr>"
        
        # Calculs
        tax_rate = 0.18
        tax_amount = subtotal * tax_rate
        total = subtotal + tax_amount
        
        order_type = order.get('type', 'dine-in')
        delivery_info = ""
        if order_type == 'delivery':
            delivery_info = f"""

📍 Adresse de livraison:
{order.get('address', 'N/A')}
Téléphone: {order.get('phone', 'N/A')}"""
        
        text_body = f"""
Bonjour {customer_name},

Merci pour votre commande! Voici les détails:

═══════════════════════════════════════
📝 DÉTAILS DE LA COMMANDE
═══════════════════════════════════════
ID Commande: {order.get('id')[:8].upper()}
Date: {order.get('createdAt', 'N/A')}
Type: {'Livraison' if order_type == 'delivery' else 'Sur place' if order_type == 'dine-in' else 'À emporter'}{delivery_info}

═══════════════════════════════════════
🍽️ ARTICLES COMMANDÉS
═══════════════════════════════════════
{items_text}

═══════════════════════════════════════
💰 FACTURE
═══════════════════════════════════════
Sous-total: {subtotal:.2f} FCFA
Taxes (18%): {tax_amount:.2f} FCFA
─────────────────────────
TOTAL: {total:.2f} FCFA

Statut de paiement: {'Payée' if order.get('paymentStatus') == 'paid' else 'En attente'}

═══════════════════════════════════════
💡 PROCHAINES ÉTAPES
═══════════════════════════════════════
Votre commande a été reçue et est en cours de traitement.
Vous recevrez une notification de mise à jour bientôt.

Merci de votre confiance!

Cordialement,
L'équipe du restaurant
"""
        
        html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 650px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #7c2d12 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ background: #f9fafb; padding: 30px; }}
        .section {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #991b1b; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #991b1b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }}
        .order-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        .order-table th {{ background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #991b1b; color: #7c2d12; }}
        .invoice-section {{ background: #fef3c7; padding: 20px; border-radius: 8px; margin: 15px 0; }}
        .invoice-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
        .invoice-total {{ display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #f59e0b; margin-top: 12px; font-size: 18px; font-weight: 700; color: #92400e; }}
        .footer {{ background: white; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; border-top: 2px solid #e5e7eb; }}
        .delivery-info {{ background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 4px; margin: 15px 0; }}
        .status-box {{ padding: 12px; border-radius: 4px; margin: 15px 0; }}
        .status-paid {{ background: #dcfce7; color: #166534; border-left: 4px solid #22c55e; }}
        .status-pending {{ background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Commande Confirmée</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{customer_name}</strong>,</p>
            <p>Merci pour votre commande! Nous allons la préparer avec soin.</p>
            
            <div class="section">
                <div class="section-title">📝 Détails de la Commande</div>
                <div style='margin: 10px 0;'><strong>ID:</strong> {order.get('id')[:8].upper()}</div>
                <div style='margin: 10px 0;'><strong>Type:</strong> {'🚗 Livraison' if order_type == 'delivery' else '🍽️ Sur place' if order_type == 'dine-in' else '📦 À emporter'}</div>
                <div style='margin: 10px 0;'><strong>Date:</strong> {order.get('createdAt', 'N/A')}</div>
            </div>
            
            {f'''
            <div class="delivery-info">
                <strong>📍 Livraison à:</strong><br>
                {order.get('address', 'N/A')}<br>
                Téléphone: {order.get('phone', 'N/A')}
            </div>
            ''' if order_type == 'delivery' else ''}
            
            <div class="section">
                <div class="section-title">🍽️ Articles Commandés</div>
                <table class="order-table">
                    <thead>
                        <tr>
                            <th>Article</th>
                            <th style='text-align: center;'>Qté</th>
                            <th style='text-align: right;'>Prix</th>
                            <th style='text-align: right;'>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
            </div>
            
            <div class="invoice-section">
                <div class="section-title">💰 Facture</div>
                <div class="invoice-row">
                    <span>Sous-total:</span>
                    <span>{subtotal:.2f} FCFA</span>
                </div>
                <div class="invoice-row">
                    <span>Taxes (18%):</span>
                    <span>{tax_amount:.2f} FCFA</span>
                </div>
                <div class="invoice-total">
                    <span>TOTAL:</span>
                    <span>{total:.2f} FCFA</span>
                </div>
            </div>
            
            <div class="status-box {'status-paid' if order.get('paymentStatus') == 'paid' else 'status-pending'}">
                <strong>💳 Statut de paiement:</strong> {'Payée ✓' if order.get('paymentStatus') == 'paid' else 'En attente de paiement'}
            </div>
        </div>
        <div class="footer">
            <p>© {datetime.now().year} TableFacil Restaurant. Tous droits réservés.</p>
            <p>Numéro de commande pour suivi: <strong>{order.get('id')[:8].upper()}</strong></p>
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
            print('=' * 80)
            print('MODE DÉVELOPPEMENT - EMAIL NON ENVOYÉ (confirmation commande)')
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
        print(f'Erreur lors de l\'envoi de la confirmation de commande: {str(e)}')
        return False
