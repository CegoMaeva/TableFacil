import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { useReservationStore, Reservation } from '../../stores/reservationStore'
import { Calendar, Clock, Users, Phone, Mail, User } from 'lucide-react'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  reservationId?: string | null
}

export function ReservationModal({ isOpen, onClose, reservationId }: ReservationModalProps) {
  const { addReservation, updateReservation, getReservation } = useReservationStore()
  const [formData, setFormData] = useState({
    tableNumber: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    partySize: 1,
    status: 'pending' as const,
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!reservationId

  useEffect(() => {
    if (isEditing && reservationId) {
      const reservation = getReservation(reservationId)
      if (reservation) {
        setFormData({
          tableNumber: reservation.tableNumber,
          customerName: reservation.customerName,
          customerEmail: reservation.customerEmail,
          customerPhone: reservation.customerPhone,
          date: reservation.date,
          time: reservation.time,
          partySize: reservation.partySize,
          status: reservation.status,
          notes: reservation.notes || '',
        })
      }
    } else {
      // Reset form for new reservation
      setFormData({
        tableNumber: 1,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        partySize: 1,
        status: 'pending',
        notes: '',
      })
    }
  }, [isEditing, reservationId, getReservation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isEditing && reservationId) {
        updateReservation(reservationId, formData)
      } else {
        addReservation(formData)
      }
      onClose()
    } catch (error) {
      console.error('Error saving reservation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      tableNumber: 1,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      partySize: 1,
      status: 'pending',
      notes: '',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations de la réservation.'
              : 'Remplissez le formulaire pour créer une nouvelle réservation.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informations client
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="customerName">Nom complet</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Détails de la réservation
              </h3>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Heure</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partySize">Nombre de personnes</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="partySize"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.partySize}
                    onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tableNumber">Numéro de table</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  min="1"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="cancelled">Annulée</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ajoutez des notes spéciales pour cette réservation..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la réservation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
