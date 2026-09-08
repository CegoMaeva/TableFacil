import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import math

class DeliveryTrackingService:
    """Service de suivi de livraison en temps réel."""

    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), '../../data')
        self.tracking_file = os.path.join(self.data_dir, 'tracking.json')
        self.deliveries_file = os.path.join(self.data_dir, 'deliveries.json')
        # Garder les positions en mémoire pour WebSocket
        self.active_deliveries: Dict[str, Dict] = {}
        self._load_tracking()

    def _load_tracking(self) -> Dict:
        """Charger les données de suivi."""
        try:
            if os.path.exists(self.tracking_file):
                with open(self.tracking_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {}

    def _save_tracking(self, data: Dict) -> bool:
        """Sauvegarder les données de suivi."""
        try:
            os.makedirs(self.data_dir, exist_ok=True)
            with open(self.tracking_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Erreur sauvegarde tracking: {e}")
            return False

    def load_json_file(self, filepath: str) -> Dict:
        """Charger un fichier JSON."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}

    def get_tracking(self, order_id: str) -> Optional[Dict]:
        """Obtenir le suivi d'une commande."""
        tracking = self._load_tracking()
        return tracking.get(order_id)

    def update_driver_location(self, order_id: str, latitude: float, longitude: float, driver_id: str) -> Dict:
        """Mettre à jour la position du livreur."""
        tracking = self._load_tracking()
        
        if order_id not in tracking:
            tracking[order_id] = {
                "orderId": order_id,
                "status": "out-for-delivery",
                "currentLocation": {"latitude": latitude, "longitude": longitude, "timestamp": datetime.now().isoformat()},
                "driver": {"id": driver_id},
                "updatedAt": datetime.now().isoformat()
            }
        else:
            tracking[order_id]["currentLocation"] = {
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.now().isoformat()
            }
            tracking[order_id]["updatedAt"] = datetime.now().isoformat()

        # Garder en mémoire aussi
        self.active_deliveries[order_id] = tracking[order_id]
        
        self._save_tracking(tracking)
        return tracking[order_id]

    def update_delivery_status(self, order_id: str, status: str) -> Dict:
        """Mettre à jour le statut de livraison."""
        tracking = self._load_tracking()
        
        if order_id in tracking:
            tracking[order_id]["status"] = status
            tracking[order_id]["updatedAt"] = datetime.now().isoformat()

            # Ajouter timestamps pour certains statuts
            if status == "delivered":
                tracking[order_id]["deliveredAt"] = datetime.now().isoformat()

        self._save_tracking(tracking)
        return tracking.get(order_id, {})

    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculer la distance entre deux points (formule Haversine)."""
        R = 6371  # Rayon de la Terre en km
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = (math.sin(dLat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dLon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def calculate_eta(self, current_lat: float, current_lon: float, dest_lat: float, dest_lon: float, speed_kmh: float = 40) -> str:
        """Calculer l'ETA (temps d'arrivée estimé)."""
        distance = self.calculate_distance(current_lat, current_lon, dest_lat, dest_lon)
        hours = distance / speed_kmh
        minutes = int(hours * 60)
        
        eta = datetime.now() + timedelta(minutes=minutes)
        return eta.isoformat()

    def start_delivery(self, order_id: str, driver_id: str, driver_name: str, origin: Dict, destination: Dict) -> Dict:
        """Démarrer une livraison."""
        tracking = self._load_tracking()
        
        tracking[order_id] = {
            "orderId": order_id,
            "status": "out-for-delivery",
            "currentLocation": {
                "latitude": origin.get("latitude", 0),
                "longitude": origin.get("longitude", 0),
                "timestamp": datetime.now().isoformat()
            },
            "originLocation": {
                "latitude": origin.get("latitude", 0),
                "longitude": origin.get("longitude", 0),
                "name": origin.get("name", "Restaurant")
            },
            "destinationLocation": {
                "address": destination.get("address", ""),
                "latitude": destination.get("latitude", 0),
                "longitude": destination.get("longitude", 0)
            },
            "driver": {
                "id": driver_id,
                "name": driver_name,
                "phone": None,
                "vehicle": None
            },
            "estimatedDeliveryTime": self.calculate_eta(
                origin.get("latitude", 0),
                origin.get("longitude", 0),
                destination.get("latitude", 0),
                destination.get("longitude", 0)
            ),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }

        self.active_deliveries[order_id] = tracking[order_id]
        self._save_tracking(tracking)
        return tracking[order_id]

    def get_active_deliveries(self) -> List[Dict]:
        """Obtenir toutes les livraisons actives."""
        tracking = self._load_tracking()
        active = []
        
        for order_id, data in tracking.items():
            if data.get("status") in ["out-for-delivery", "in-progress"]:
                active.append(data)
        
        return active
