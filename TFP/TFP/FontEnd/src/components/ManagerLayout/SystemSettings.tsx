import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

export function SystemSettings() {
  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-gray-400">Configure your restaurant options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horaires d'ouverture */}
        <Card>
          <CardHeader>
            <CardTitle>🕒 Horaires d'ouverture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => (
                <div key={day} className="flex items-center justify-between gap-4">
                  <Label className="w-24 text-gray-300">{day}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="time" defaultValue="11:00" className="w-32" />
                    <span className="text-gray-500">-</span>
                    <Input type="time" defaultValue="23:00" className="w-32" />
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleSave} className="w-full">
              Enregistrer les horaires
            </Button>
          </CardContent>
        </Card>

        {/* Services disponibles */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Services disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Service de livraison</Label>
                <p className="text-sm text-gray-500">Activer les commandes avec livraison</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Commandes à emporter</Label>
                <p className="text-sm text-gray-500">Permettre la commande à emporter</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Réservations en ligne</Label>
                <p className="text-sm text-gray-500">Activer le système de réservation</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Paiement en ligne</Label>
                <p className="text-sm text-gray-500">Accepter les paiements en ligne</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Informations du restaurant */}
        <Card>
          <CardHeader>
            <CardTitle>🏪 Informations du restaurant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resto-name">Nom du restaurant</Label>
              <Input id="resto-name" defaultValue="Mon Restaurant" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resto-address">Adresse</Label>
              <Input id="resto-address" defaultValue="Dakar, Sénégal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resto-phone">Téléphone</Label>
              <Input id="resto-phone" defaultValue="+221 33 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resto-email">Email</Label>
              <Input id="resto-email" type="email" defaultValue="contact@restaurant.sn" />
            </div>
            <Button onClick={handleSave} className="w-full">
              Enregistrer les informations
            </Button>
          </CardContent>
        </Card>

        {/* Configuration de la livraison */}
        <Card>
          <CardHeader>
            <CardTitle>🚚 Configuration de la livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-radius">Rayon de livraison (km)</Label>
              <Input id="delivery-radius" type="number" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-fee">Frais de livraison (FCFA)</Label>
              <Input id="delivery-fee" type="number" defaultValue="1500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-order">Commande minimum (FCFA)</Label>
              <Input id="min-order" type="number" defaultValue="5000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-time">Temps de livraison estimé (min)</Label>
              <Input id="delivery-time" type="number" defaultValue="30" />
            </div>
            <Button onClick={handleSave} className="w-full">
              Enregistrer la configuration
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>🔔 Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Nouvelles commandes</Label>
                <p className="text-sm text-gray-500">Email + notification push</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Réservations</Label>
                <p className="text-sm text-gray-500">Alertes pour nouvelles réservations</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Stock faible</Label>
                <p className="text-sm text-gray-500">Alertes d'inventaire</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Customer reviews</Label>
                <p className="text-sm text-gray-500">Notifications for new reviews</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Programme de fidélité */}
        <Card>
          <CardHeader>
            <CardTitle>⭐ Programme de fidélité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Activer le programme</Label>
                <p className="text-sm text-gray-500">Système de points et récompenses</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="points-euro">Points par 1000 FCFA dépensés</Label>
              <Input id="points-euro" type="number" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-reward">Points pour une récompense</Label>
              <Input id="points-reward" type="number" defaultValue="100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-value">Valeur de la récompense (FCFA)</Label>
              <Input id="reward-value" type="number" defaultValue="2500" />
            </div>
            <Button onClick={handleSave} className="w-full">
              Enregistrer le programme
            </Button>
          </CardContent>
        </Card>

        {/* Taxes et Paiements */}
        <Card>
          <CardHeader>
            <CardTitle>💰 Taxes et Paiements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Taux de TVA (%)</Label>
              <Input id="tax-rate" type="number" step="0.1" defaultValue="18" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-fee">Frais de service (%)</Label>
              <Input id="service-fee" type="number" step="0.1" defaultValue="10" />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-white">Moyens de paiement acceptés</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">💵 Espèces</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">💳 Carte bancaire</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">📱 Wave Money</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">📱 Orange Money</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              Enregistrer les paramètres
            </Button>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle>🔒 Sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input id="current-password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input id="new-password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Authentification à deux facteurs</Label>
                <p className="text-sm text-gray-500">Sécurité renforcée</p>
              </div>
              <Switch />
            </div>
            <Button onClick={handleSave} className="w-full">
              Mettre à jour la sécurité
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
