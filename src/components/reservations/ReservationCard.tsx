import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Reservation } from '../../stores/reservationStore'
import { Calendar, Clock, Users, Phone, Mail, User, Edit, Trash2 } from 'lucide-react'

interface ReservationCardProps {
  reservation: Reservation
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ReservationCard({ reservation, onEdit, onDelete }: ReservationCardProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'completed':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmée'
      case 'pending':
        return 'En attente'
      case 'cancelled':
        return 'Annulée'
      case 'completed':
        return 'Terminée'
      default:
        return status
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {reservation.customerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">{reservation.customerName}</CardTitle>
              <CardDescription className="flex items-center">
                <Mail className="mr-1 h-3 w-3" />
                {reservation.customerEmail}
              </CardDescription>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(reservation.status)}>
            {getStatusLabel(reservation.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="mr-2 h-4 w-4" />
            {new Date(reservation.date).toLocaleDateString('fr-FR')}
          </div>
          <div className="flex items-center text-gray-600">
            <Clock className="mr-2 h-4 w-4" />
            {reservation.time}
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="mr-2 h-4 w-4" />
            {reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''}
          </div>
          <div className="flex items-center text-gray-600">
            <Phone className="mr-2 h-4 w-4" />
            {reservation.customerPhone}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Table {reservation.tableNumber}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(reservation.id)}
            >
              <Edit className="mr-1 h-3 w-3" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(reservation.id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Supprimer
            </Button>
          </div>
        </div>

        {reservation.notes && (
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">
              <strong>Notes:</strong> {reservation.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
