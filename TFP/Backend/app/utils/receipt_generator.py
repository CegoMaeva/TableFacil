"""
Générateur de reçus PDF pour les paiements
"""
from datetime import datetime
import json
import os

def calculate_order_total(items, delivery_required=False):
    """
    Calcule le total d'une commande avec taxes et frais de livraison
    """
    # Calculer le sous-total
    subtotal = sum(item.get('price', 0) * item.get('quantity', 1) for item in items)
    
    # Taxe (18% - TVA Sénégal)
    tax_rate = 0.18
    tax_amount = subtotal * tax_rate
    
    # Frais de livraison (7$ si commande < 25$)
    delivery_fee = 0
    if delivery_required:
        # Convertir en USD pour la comparaison (600 FCFA = 1 USD)
        subtotal_usd = subtotal / 600
        if subtotal_usd < 25:
            delivery_fee = 7 * 600  # 7 USD = 4200 FCFA
    
    # Total
    total = subtotal + tax_amount + delivery_fee
    
    return {
        'subtotal': subtotal,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
        'delivery_fee': delivery_fee,
        'total': total
    }


def generate_receipt_html(payment_data):
    """
    Génère un reçu HTML pour un paiement
    """
    # Calculer les totaux si des items sont présents
    breakdown = payment_data.get('breakdown', {})
    has_breakdown = bool(breakdown)
    
    receipt_html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reçu de paiement - {payment_data['receipt_number']}</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 40px;
                background-color: #f5f5f5;
            }}
            .receipt-container {{
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 32px;
                font-weight: 700;
            }}
            .header p {{
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 14px;
            }}
            .receipt-number {{
                background: rgba(255,255,255,0.2);
                display: inline-block;
                padding: 8px 20px;
                border-radius: 20px;
                margin-top: 15px;
                font-weight: 600;
            }}
            .content {{
                padding: 40px;
            }}
            .section {{
                margin-bottom: 30px;
            }}
            .section-title {{
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #10b981;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }}
            .info-item {{
                padding: 15px;
                background: #f9fafb;
                border-radius: 8px;
                border-left: 4px solid #10b981;
            }}
            .info-label {{
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }}
            .info-value {{
                font-size: 16px;
                color: #1f2937;
                font-weight: 600;
            }}
            .amount-section {{
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                padding: 30px;
                border-radius: 12px;
                margin: 30px 0;
            }}
            .amount-breakdown {{
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }}
            .breakdown-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
            }}
            .breakdown-row:last-child {{
                border-bottom: none;
                padding-top: 15px;
                margin-top: 10px;
                border-top: 2px solid #10b981;
                font-weight: 700;
                font-size: 18px;
            }}
            .breakdown-label {{
                color: #6b7280;
            }}
            .breakdown-value {{
                color: #1f2937;
                font-weight: 600;
            }}
            .breakdown-row:last-child .breakdown-label,
            .breakdown-row:last-child .breakdown-value {{
                color: #065f46;
            }}
            .amount-label {{
                font-size: 14px;
                color: #059669;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
                text-align: center;
            }}
            .amount-value {{
                font-size: 48px;
                color: #065f46;
                font-weight: 700;
                text-align: center;
            }}
            .payment-method {{
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 10px 20px;
                background: #dbeafe;
                color: #1e40af;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 15px;
            }}
            .status-badge {{
                display: inline-block;
                padding: 8px 16px;
                background: #d1fae5;
                color: #065f46;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
            }}
            .footer {{
                background: #f9fafb;
                padding: 30px 40px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 13px;
                line-height: 1.6;
            }}
            .footer strong {{
                color: #1f2937;
            }}
            .divider {{
                height: 1px;
                background: #e5e7eb;
                margin: 30px 0;
            }}
            .print-button {{
                background: #10b981;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                margin: 20px 0;
            }}
            .tax-info {{
                background: #eff6ff;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
                margin: 15px 0;
                font-size: 13px;
                color: #1e40af;
            }}
            @media print {{
                body {{
                    background: white;
                    padding: 0;
                }}
                .receipt-container {{
                    box-shadow: none;
                }}
                .print-button {{
                    display: none;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <!-- Header -->
            <div class="header">
                <h1>🧾 REÇU DE PAIEMENT</h1>
                <p>TableFacil Restaurant</p>
                <div class="receipt-number">
                    N° {payment_data['receipt_number']}
                </div>
            </div>

            <!-- Content -->
            <div class="content">
                <!-- Status -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <span class="status-badge">✓ PAIEMENT CONFIRMÉ</span>
                </div>

                <!-- Informations Client -->
                <div class="section">
                    <div class="section-title">📋 Informations Client</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nom du client</div>
                            <div class="info-value">{payment_data['customer_name']}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email</div>
                            <div class="info-value">{payment_data.get('customer_email', 'N/A')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Téléphone</div>
                            <div class="info-value">{payment_data.get('customer_phone', 'N/A')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date du paiement</div>
                            <div class="info-value">{payment_data['payment_date']}</div>
                        </div>
                    </div>
                </div>

                <!-- Détails de la Réservation/Commande -->
                <div class="section">
                    <div class="section-title">🎫 Détails {'de la Réservation' if payment_data.get('type') == 'reservation' else 'de la Commande'}</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Numéro {'de réservation' if payment_data.get('type') == 'reservation' else 'de commande'}</div>
                            <div class="info-value">{payment_data.get('reservation_id', payment_data.get('order_id', 'N/A'))}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date</div>
                            <div class="info-value">{payment_data.get('reservation_date', payment_data.get('order_date', 'N/A'))}</div>
                        </div>
                        {'<div class="info-item"><div class="info-label">Heure</div><div class="info-value">' + payment_data.get('reservation_time', 'N/A') + '</div></div>' if payment_data.get('type') == 'reservation' else ''}
                        {'<div class="info-item"><div class="info-label">Nombre de personnes</div><div class="info-value">' + str(payment_data.get('guests', 0)) + ' personnes</div></div>' if payment_data.get('type') == 'reservation' else ''}
                        {'<div class="info-item"><div class="info-label">Type de commande</div><div class="info-value">' + payment_data.get('order_type', 'N/A') + '</div></div>' if payment_data.get('type') != 'reservation' else ''}
                    </div>
                </div>

                <!-- Montant avec détails -->
                <div class="amount-section">"""
    
    # Ajouter la ventilation si disponible
    if has_breakdown:
        receipt_html += f"""
                    <div class="amount-breakdown">
                        <div class="breakdown-row">
                            <span class="breakdown-label">Sous-total</span>
                            <span class="breakdown-value">{breakdown.get('subtotal', 0):,.0f} FCFA</span>
                        </div>
                        <div class="breakdown-row">
                            <span class="breakdown-label">Taxes (TVA {breakdown.get('tax_rate', 0) * 100:.0f}%)</span>
                            <span class="breakdown-value">{breakdown.get('tax_amount', 0):,.0f} FCFA</span>
                        </div>"""
        
        if breakdown.get('delivery_fee', 0) > 0:
            receipt_html += f"""
                        <div class="breakdown-row">
                            <span class="breakdown-label">Frais de livraison</span>
                            <span class="breakdown-value">{breakdown.get('delivery_fee', 0):,.0f} FCFA</span>
                        </div>"""
        
        receipt_html += f"""
                        <div class="breakdown-row">
                            <span class="breakdown-label">TOTAL</span>
                            <span class="breakdown-value">{breakdown.get('total', 0):,.0f} FCFA</span>
                        </div>
                    </div>
                    
                    <div class="tax-info">
                        ℹ️ <strong>TVA {breakdown.get('tax_rate', 0) * 100:.0f}%</strong> incluse conformément à la réglementation fiscale du Sénégal.
                        {f'<br>📦 <strong>Frais de livraison:</strong> 7$ (4,200 FCFA) appliqués pour les commandes inférieures à 25$ (15,000 FCFA)' if breakdown.get('delivery_fee', 0) > 0 else ''}
                    </div>"""
    else:
        receipt_html += f"""
                    <div class="amount-label">Montant Payé {'(Acompte)' if payment_data.get('type') == 'reservation' else ''}</div>
                    <div class="amount-value">{payment_data['amount']:,} FCFA</div>"""
    
    receipt_html += f"""
                    <div style="text-align: center;">
                        <div class="payment-method">
                            💳 {payment_data['payment_method']}
                        </div>
                    </div>
                </div>

                <!-- Informations de Transaction -->
                <div class="section">
                    <div class="section-title">🔐 Informations de Transaction</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">ID Transaction</div>
                            <div class="info-value">{payment_data['transaction_id']}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Méthode de paiement</div>
                            <div class="info-value">{payment_data['payment_method']}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Statut</div>
                            <div class="info-value" style="color: #10b981;">Confirmé ✓</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date & Heure</div>
                            <div class="info-value">{payment_data['payment_datetime']}</div>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Note Importante -->
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <strong style="color: #92400e; display: block; margin-bottom: 8px;">⚠️ Important</strong>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        {'Cet acompte vous sera <strong>intégralement remboursé</strong> si vous honorez votre réservation. En cas d\'absence sans annulation préalable, l\'acompte sera conservé par le restaurant. Pour toute annulation, veuillez nous contacter au moins 24h à l\'avance.' if payment_data.get('type') == 'reservation' else 'Ce reçu atteste du paiement de votre commande. Veuillez le conserver pour toute réclamation. Les taxes sont incluses dans le montant total.'}
                    </p>
                </div>

                <!-- Button Print -->
                <div style="text-align: center; margin-top: 30px;">
                    <button class="print-button" onclick="window.print()">
                        🖨️ Imprimer le reçu
                    </button>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <strong>TableFacil Restaurant</strong><br>
                Plateau, Dakar, Sénégal<br>
                Tél: +221 33 123 45 67 | Email: contact@tablefacil.sn<br>
                <br>
                <em>Merci pour votre confiance !</em><br>
                Ce reçu a été généré automatiquement le {datetime.now().strftime('%d/%m/%Y à %H:%M')}
            </div>
        </div>
    </body>
    </html>
    """
    return receipt_html


def save_receipt(payment_data):
    """
    Sauvegarde le reçu dans un fichier JSON
    """
    receipts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'receipts')
    os.makedirs(receipts_dir, exist_ok=True)
    
    receipt_file = os.path.join(receipts_dir, f"{payment_data['receipt_number']}.json")
    
    with open(receipt_file, 'w', encoding='utf-8') as f:
        json.dump(payment_data, f, ensure_ascii=False, indent=2)
    
    return receipt_file


def generate_receipt_number(reservation_id):
    """
    Génère un numéro de reçu unique
    """
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"RCP-{reservation_id}-{timestamp}"
