import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { ReservationModal } from '../components/reservations/ReservationModal'
import { DeleteReservationDialog } from '../components/reservations/DeleteReservationDialog'
import { useReservationStore } from '../stores/reservationStore'

export default function Reservations() {
  const { reservations, deleteReservation } = useReservationStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch = reservation.customerName
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      reservation.customerEmail
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleEdit = (id: string) => {
    setEditingReservation(id)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setReservationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (reservationToDelete) {
      deleteReservation(reservationToDelete)
      setReservationToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-600">Gérez toutes vos réservations</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle réservation
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmées</option>
                <option value="cancelled">Annulées</option>
                <option value="completed">Terminées</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations List */}
      <div className="grid gap-4">
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Aucune réservation ne correspond aux critères de recherche.'
                  : 'Aucune réservation trouvée.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-lg font-medium text-primary-foreground">
                          {reservation.customerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {reservation.customerName}
                      </h3>
                      <p className="text-sm text-gray-500">{reservation.customerEmail}</p>
                      <p className="text-sm text-gray-500">{reservation.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Table {reservation.tableNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(reservation.date).toLocaleDateString('fr-FR')} à {reservation.time}
                      </p>
                      <p className="text-sm text-gray-500">
                        {reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(reservation.status)}>
                      {getStatusLabel(reservation.status)}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(reservation.id)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(reservation.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
                {reservation.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {reservation.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingReservation(null)
        }}
        reservationId={editingReservation}
      />

      <DeleteReservationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setReservationToDelete(null)
        }}
        onConfirm={confirmDelete}
        reservationName={reservationToDelete ? reservations.find(r => r.id === reservationToDelete)?.customerName || '' : ''}
      />
    </div>
  )
}
