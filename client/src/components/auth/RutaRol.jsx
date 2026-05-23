import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Guardia de rol: redirigir al dashboard propio si el rol del usuario no coincide con la ruta.
 * @param {{rol: 'admin'|'entrenador'|'cliente'}} props Rol requerido por la ruta
 * @returns {JSX.Element}
 */
function RutaRol({ rol }) {
  const { usuario } = useAuth()

  if (usuario?.rol !== rol) return <Navigate to={`/${usuario?.rol}`} replace />

  return <Outlet />
}

export default RutaRol
