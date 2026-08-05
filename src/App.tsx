import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './stores/authStore'
import AuthLayout from './components/layouts/AuthLayout'
import AppLayout from './components/layouts/AppLayout'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import PasswordRecovery from './pages/auth/PasswordRecovery'
import Dashboard from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Profile from './pages/Profile'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <AuthLayout>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/password-recovery" element={<PasswordRecovery />} />
        </Routes>
      </AuthLayout>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <Toaster />
    </AppLayout>
  )
}

export default App
