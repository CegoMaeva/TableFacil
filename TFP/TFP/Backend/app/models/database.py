import json
import os
from typing import List, Dict, Optional
from datetime import datetime

class JSONDatabase:
    """Gestionnaire de base de données JSON NoSQL"""
    
    def __init__(self, data_dir: str = 'data'):
        self.data_dir = data_dir
        self.users_file = os.path.join(data_dir, 'users.json')
        self.employees_file = os.path.join(data_dir, 'employees.json')
        self.sessions_file = os.path.join(data_dir, 'sessions.json')
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """Assure que tous les fichiers JSON existent"""
        files = {
            self.users_file: {"users": []},
            self.employees_file: {"employees": []},
            self.sessions_file: {"sessions": []}
        }
        
        for filepath, default_data in files.items():
            if not os.path.exists(filepath):
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(default_data, f, indent=2, ensure_ascii=False)
    
    def _read_json(self, filepath: str) -> Dict:
        """Lit un fichier JSON"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}
    
    def _write_json(self, filepath: str, data: Dict):
        """Écrit dans un fichier JSON"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    # ===== GESTION DES UTILISATEURS (CLIENTS) =====
    
    def get_all_users(self) -> List[Dict]:
        """Récupère tous les utilisateurs clients"""
        data = self._read_json(self.users_file)
        return data.get('users', [])
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Trouve un utilisateur par email"""
        users = self.get_all_users()
        for user in users:
            if user.get('email', '').lower() == email.lower():
                return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Trouve un utilisateur par ID"""
        users = self.get_all_users()
        for user in users:
            if user.get('id') == user_id:
                return user
        return None
    
    def create_user(self, user_data: Dict) -> Dict:
        """Crée un nouvel utilisateur client"""
        data = self._read_json(self.users_file)
        users = data.get('users', [])
        
        # Vérifier si l'email existe déjà
        if any(u.get('email', '').lower() == user_data.get('email', '').lower() for u in users):
            raise ValueError("Cet email est déjà utilisé")
        
        # Ajouter timestamps
        user_data['created_at'] = datetime.utcnow().isoformat() + 'Z'
        user_data['updated_at'] = user_data['created_at']
        
        users.append(user_data)
        data['users'] = users
        self._write_json(self.users_file, data)
        
        return user_data
    
    def update_user(self, user_id: str, update_data: Dict) -> Optional[Dict]:
        """Met à jour un utilisateur"""
        data = self._read_json(self.users_file)
        users = data.get('users', [])
        
        for i, user in enumerate(users):
            if user.get('id') == user_id:
                users[i].update(update_data)
                users[i]['updated_at'] = datetime.utcnow().isoformat() + 'Z'
                data['users'] = users
                self._write_json(self.users_file, data)
                return users[i]
        
        return None
    
    # ===== GESTION DES EMPLOYÉS =====
    
    def get_all_employees(self) -> List[Dict]:
        """Récupère tous les employés"""
        data = self._read_json(self.employees_file)
        return data.get('employees', [])
    
    def get_employee_by_code(self, code: str) -> Optional[Dict]:
        """Trouve un employé par son code unique"""
        employees = self.get_all_employees()
        for employee in employees:
            if employee.get('code') == code:
                return employee
        return None
    
    def get_employee_by_id(self, employee_id: str) -> Optional[Dict]:
        """Trouve un employé par ID"""
        employees = self.get_all_employees()
        for employee in employees:
            if employee.get('id') == employee_id:
                return employee
        return None
    
    def get_employee_by_email(self, email: str) -> Optional[Dict]:
        """Trouve un employé par email"""
        employees = self.get_all_employees()
        for employee in employees:
            if employee.get('email', '').lower() == email.lower():
                return employee
        return None
    
    def get_employees_by_type(self, employee_type: str) -> List[Dict]:
        """Récupère tous les employés d'un type donné"""
        employees = self.get_all_employees()
        return [emp for emp in employees if emp.get('type') == employee_type]
    
    def create_employee(self, employee_data: Dict) -> Dict:
        """Crée un nouvel employé"""
        data = self._read_json(self.employees_file)
        employees = data.get('employees', [])
        
        # Vérifier si le code existe déjà
        if any(e.get('code') == employee_data.get('code') for e in employees):
            raise ValueError("Ce code employé est déjà utilisé")
        
        # Ajouter timestamps
        employee_data['created_at'] = datetime.utcnow().isoformat() + 'Z'
        employee_data['updated_at'] = employee_data['created_at']
        employee_data['is_active'] = employee_data.get('is_active', True)
        
        employees.append(employee_data)
        data['employees'] = employees
        self._write_json(self.employees_file, data)
        
        return employee_data
    
    def update_employee(self, employee_id: str, update_data: Dict) -> Optional[Dict]:
        """Met à jour un employé"""
        data = self._read_json(self.employees_file)
        employees = data.get('employees', [])
        
        for i, employee in enumerate(employees):
            if employee.get('id') == employee_id:
                employees[i].update(update_data)
                employees[i]['updated_at'] = datetime.utcnow().isoformat() + 'Z'
                data['employees'] = employees
                self._write_json(self.employees_file, data)
                return employees[i]
        
        return None
    
    def delete_employee(self, employee_id: str) -> bool:
        """Supprime (désactive) un employé"""
        return self.update_employee(employee_id, {'is_active': False}) is not None
    
    # ===== GESTION DES SESSIONS =====
    
    def create_session(self, session_data: Dict) -> Dict:
        """Crée une nouvelle session"""
        data = self._read_json(self.sessions_file)
        sessions = data.get('sessions', [])
        
        session_data['created_at'] = datetime.utcnow().isoformat() + 'Z'
        sessions.append(session_data)
        
        data['sessions'] = sessions
        self._write_json(self.sessions_file, data)
        
        return session_data
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Récupère une session par ID"""
        data = self._read_json(self.sessions_file)
        sessions = data.get('sessions', [])
        
        for session in sessions:
            if session.get('id') == session_id:
                return session
        
        return None
    
    def delete_session(self, session_id: str) -> bool:
        """Supprime une session"""
        data = self._read_json(self.sessions_file)
        sessions = data.get('sessions', [])
        
        sessions = [s for s in sessions if s.get('id') != session_id]
        data['sessions'] = sessions
        self._write_json(self.sessions_file, data)
        
        return True
    
    def cleanup_expired_sessions(self, expiry_hours: int = 24):
        """Nettoie les sessions expirées"""
        from datetime import timedelta
        
        data = self._read_json(self.sessions_file)
        sessions = data.get('sessions', [])
        
        now = datetime.utcnow()
        active_sessions = []
        
        for session in sessions:
            created = datetime.fromisoformat(session['created_at'].replace('Z', ''))
            if now - created < timedelta(hours=expiry_hours):
                active_sessions.append(session)
        
        data['sessions'] = active_sessions
        self._write_json(self.sessions_file, data)
        
        return len(sessions) - len(active_sessions)

# Instance globale
db = JSONDatabase()

# ===== FONCTIONS UTILITAIRES POUR LES FICHIERS JSON =====

def load_data(filename: str) -> list:
    """Charge les données d'un fichier JSON"""
    filepath = os.path.join('data', filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Si c'est une liste, retourner directement
            if isinstance(data, list):
                return data
            # Sinon chercher la clé principale
            for key in data:
                if isinstance(data[key], list):
                    return data[key]
            return []
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []

def save_data(filename: str, data: list):
    """Sauvegarde les données dans un fichier JSON"""
    filepath = os.path.join('data', filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
