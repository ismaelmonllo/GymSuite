import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

/**
 * Acceder al contexto de autenticación (usuario, login, logout, etc).
 * @returns {object} Valor expuesto por AuthProvider
 */
export function useAuth() {
  return useContext(AuthContext)
}
