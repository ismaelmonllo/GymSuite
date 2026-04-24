import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Redirigir al dashboard propio si el rol no coincide con la ruta
function RutaRol({ rol }) {
  const { usuario } = useAuth()

  if (usuario?.rol !== rol) return <Navigate to={`/${usuario?.rol}`} replace />

  return <Outlet />
}

export default RutaRol
