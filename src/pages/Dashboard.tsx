import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react'
import { useReservationStore } from '../stores/reservationStore'

export default function Dashboard() {
  const { reservations } = useReservationStore()

  const todayReservations = reservations.filter(
    (reservation) => reservation.date === new Date().toISOString().split('T')[0]
  )

  const pendingReservations = reservations.filter(
    (reservation) => reservation.status === 'pending'
  )

  const confirmedReservations = reservations.filter(
    (reservation) => reservation.status === 'confirmed'
  )

  const stats = [
    {
      title: 'Réservations aujourd\'hui',
      value: todayReservations.length,
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      title: 'En attente',
      value: pendingReservations.length,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Confirmées',
      value: confirmedReservations.length,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Total clients',
      value: reservations.length,
      icon: Users,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble de vos réservations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Réservations récentes</CardTitle>
          <CardDescription>
            Les dernières réservations ajoutées au système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Aucune réservation
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par ajouter une nouvelle réservation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {reservation.customerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {reservation.customerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Table {reservation.tableNumber} • {reservation.partySize} personnes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        reservation.status === 'confirmed'
                          ? 'default'
                          : reservation.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {reservation.status === 'confirmed' && 'Confirmée'}
                      {reservation.status === 'pending' && 'En attente'}
                      {reservation.status === 'cancelled' && 'Annulée'}
                      {reservation.status === 'completed' && 'Terminée'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(reservation.date).toLocaleDateString('fr-FR')} à {reservation.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
