
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppRoutes from './routes'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function AppGate() {
  const { authLoading, isAuthenticated } = useAuth()
  const path = window.location.pathname

  if (authLoading) {
    return <div className="nf-loading">Loading NexusFlow...</div>
  }

  if (path === '/forgot-password') return <ForgotPassword />
  if (path === '/reset-password') return <ResetPassword />
  if (!isAuthenticated) return <SignIn />

  return <AppRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </BrowserRouter>
  )
}
