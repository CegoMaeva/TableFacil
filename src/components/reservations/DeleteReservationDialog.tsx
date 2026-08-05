import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteReservationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  reservationName: string
}

export function DeleteReservationDialog({
  isOpen,
  onClose,
  onConfirm,
  reservationName,
}: DeleteReservationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
            Supprimer la réservation
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer la réservation de{' '}
            <span className="font-medium">{reservationName}</span> ?
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
