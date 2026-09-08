import { create } from 'zustand'

export interface Reservation {
  id: string
  tableNumber: number
  customerName: string
  customerEmail: string
  customerPhone: string
  date: string
  time: string
  partySize: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  createdAt: string
  updatedAt: string
}

interface ReservationState {
  reservations: Reservation[]
  isLoading: boolean
  error: string | null
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateReservation: (id: string, updates: Partial<Reservation>) => void
  deleteReservation: (id: string) => void
  getReservation: (id: string) => Reservation | undefined
  getReservationsByDate: (date: string) => Reservation[]
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  reservations: [],
  isLoading: false,
  error: null,
  
  addReservation: (reservationData) => {
    const newReservation: Reservation = {
      ...reservationData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((state) => ({
      reservations: [...state.reservations, newReservation],
    }))
  },
  
  updateReservation: (id, updates) => {
    set((state) => ({
      reservations: state.reservations.map((reservation) =>
        reservation.id === id
          ? { ...reservation, ...updates, updatedAt: new Date().toISOString() }
          : reservation
      ),
    }))
  },
  
  deleteReservation: (id) => {
    set((state) => ({
      reservations: state.reservations.filter((reservation) => reservation.id !== id),
    }))
  },
  
  getReservation: (id) => {
    return get().reservations.find((reservation) => reservation.id === id)
  },
  
  getReservationsByDate: (date) => {
    return get().reservations.filter((reservation) => reservation.date === date)
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))
