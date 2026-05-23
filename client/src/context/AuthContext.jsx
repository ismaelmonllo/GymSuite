import { createContext, useState, useEffect, useCallback } from 'react'
import api, { setSesionExpiradaCallback } from '../services/api'

export const AuthContext = createContext(null)

/**
 * Leer el token JWT de la cookie "token".
 * @returns {string|null}
 */
const leerCookie = () => {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Decodificar el payload de un JWT sin verificar firma.
 * URL-safe base64 → standard base64; decodeURIComponent para soportar caracteres UTF-8 (ñ, tildes, etc.).
 * @param {string} token JWT en formato "header.payload.signature"
 * @returns {object|null} Payload decodificado o null si el token es inválido
 */
const decodificarToken = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

const tokenInicial = leerCookie()
const usuarioInicial = tokenInicial ? { ...decodificarToken(tokenInicial), token: tokenInicial } : null

/**
 * Proveer el usuario autenticado a toda la app, persistiendo el token en una cookie.
 * Expone login, logout, actualizarToken y el objeto usuario actual.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioInicial)

  /**
   * Limpiar solo el estado local; usada por el interceptor cuando el refresh falla.
   * useCallback con [] garantiza referencia estable para registrarla una sola vez en el interceptor.
   */
  const limpiarSesion = useCallback(() => {
    document.cookie = 'token=; path=/; max-age=0'
    setUsuario(null)
  }, [])

  // Registrar el callback en el interceptor de axios al montar el proveedor
  useEffect(() => {
    setSesionExpiradaCallback(limpiarSesion)
  }, [limpiarSesion])

  /**
   * Iniciar sesión guardando el token en cookie y el usuario en el estado.
   * @param {{token: string} & Record<string, unknown>} datos Datos del usuario autenticado incluyendo el JWT
   */
  const login = (datos) => {
    document.cookie = `token=${datos.token}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict`
    setUsuario(datos)
  }

  /**
   * Sustituir el token actual por uno nuevo sin reloguear (usado tras cambiar la contraseña forzosa).
   * El nuevo token trae `forzar_cambio_password = false`, lo que cierra el modal forzado.
   * @param {string} nuevoToken JWT recién emitido por el backend
   */
  const actualizarToken = (nuevoToken) => {
    if (!nuevoToken) return
    document.cookie = `token=${nuevoToken}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict`
    setUsuario({ ...decodificarToken(nuevoToken), token: nuevoToken })
  }

  /**
   * Cerrar sesión: pedir al servidor que limpie la cookie del refresh token y luego limpiar el estado local.
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch { /* ignorar si ya expiró */ }
    limpiarSesion()
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarToken }}>
      {children}
    </AuthContext.Provider>
  )
}
