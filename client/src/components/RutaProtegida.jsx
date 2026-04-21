import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Redirigir a /login si no hay sesión activa
function RutaProtegida() {
  const { usuario } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  return <Outlet />
}

export default RutaProtegida
