import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Guardia de rutas: redirigir a /login si no hay sesión activa.
 * @returns {JSX.Element}
 */
function RutaProtegida() {
  const { usuario } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  return <Outlet />
}

export default RutaProtegida
