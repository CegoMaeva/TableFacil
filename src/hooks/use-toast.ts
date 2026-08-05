import { useState } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastState {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (toastId: string) => void
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { id, title, description, variant }
    
    setToasts((prev) => [...prev, newToast])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismiss(id)
    }, 5000)
  }

  const dismiss = (toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
  }

  return {
    toasts,
    toast,
    dismiss,
  }
}
