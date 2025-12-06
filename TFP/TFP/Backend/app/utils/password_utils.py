import bcrypt

def hash_password(password: str) -> str:
    """
    Hache un mot de passe avec bcrypt
    
    Args:
        password: Le mot de passe en clair
        
    Returns:
        Le mot de passe haché en format string
    """
    # Générer un salt et hacher le mot de passe
    salt = bcrypt.gensalt(rounds=12)  # 12 rounds = bon équilibre sécurité/performance
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Vérifie si un mot de passe correspond au hash
    
    Args:
        password: Le mot de passe en clair à vérifier
        hashed_password: Le hash stocké en base de données
        
    Returns:
        True si le mot de passe est correct, False sinon
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        print(f"Erreur lors de la vérification du mot de passe: {e}")
        return False

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Valide la force d'un mot de passe
    
    Règles:
    - Minimum 8 caractères
    - Au moins une majuscule
    - Au moins une minuscule
    - Au moins un chiffre
    - Au moins un caractère spécial
    
    Args:
        password: Le mot de passe à valider
        
    Returns:
        (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    
    if not any(c.isupper() for c in password):
        return False, "Le mot de passe doit contenir au moins une majuscule"
    
    if not any(c.islower() for c in password):
        return False, "Le mot de passe doit contenir au moins une minuscule"
    
    if not any(c.isdigit() for c in password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False, "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)"
    
    return True, ""

def generate_secure_password(length: int = 12) -> str:
    """
    Génère un mot de passe sécurisé aléatoire
    
    Args:
        length: Longueur du mot de passe (minimum 8)
        
    Returns:
        Un mot de passe sécurisé
    """
    import secrets
    import string
    
    if length < 8:
        length = 8
    
    # Caractères disponibles
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Garantir au moins un caractère de chaque type
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    
    # Compléter avec des caractères aléatoires
    all_chars = lowercase + uppercase + digits + special
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))
    
    # Mélanger le mot de passe
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)
