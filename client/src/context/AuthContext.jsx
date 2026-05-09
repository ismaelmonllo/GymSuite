import { useState, useEffect } from 'react'
import api, { setSesionExpiradaCallback } from '../services/api'
import { AuthContext } from './authContext'

// Leer el token de la cookie al cargar la página
const leerCookie = () => {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
  return match ? match[1] : null
}

// Decodificar payload del JWT sin verificar firma
const decodificarToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

const tokenInicial = leerCookie()
const usuarioInicial = tokenInicial ? { ...decodificarToken(tokenInicial), token: tokenInicial } : null

// Proveer usuario autenticado a toda la app, persistiendo el token en una cookie
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioInicial)

  // Limpiar solo el estado local; usada por el interceptor cuando el refresh falla
  const limpiarSesion = () => {
    document.cookie = 'token=; path=/; max-age=0'
    setUsuario(null)
  }

  // Registrar el callback en el interceptor de axios al montar el proveedor
  useEffect(() => {
    setSesionExpiradaCallback(limpiarSesion)
  }, [])

  const login = (datos) => {
    document.cookie = `token=${datos.token}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict`
    setUsuario(datos)
  }

  // Sustituir el token actual por uno nuevo sin reloguear (usado tras cambiar la contraseña forzosa)
  // El nuevo token trae forzar_cambio_password = false, lo que cierra el modal forzado
  const actualizarToken = (nuevoToken) => {
    if (!nuevoToken) return
    document.cookie = `token=${nuevoToken}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict`
    setUsuario({ ...decodificarToken(nuevoToken), token: nuevoToken })
  }

  // Cerrar sesión: pedir al servidor que limpie la cookie del refresh token, luego limpiar estado local
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
