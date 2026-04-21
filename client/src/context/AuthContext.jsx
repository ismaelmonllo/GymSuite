import { createContext, useState } from 'react'

export const AuthContext = createContext(null)

// Proveer usuario autenticado a toda la app
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)

  const login = (datos) => setUsuario(datos)
  const logout = () => setUsuario(null)

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
