import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import Header from '../components/Header'
import CardLogin from '../components/CardLogin'
import { color } from '../styles'

const RUTAS_ROL = {
  admin: '/admin',
  entrenador: '/entrenador',
  cliente: '/cliente',
}

// Comprobar que el rol del usuario coincide con la pestaña seleccionada
const rolEsValido = (rol, tab) => {
  if (tab === 'cliente') return rol === 'cliente'
  if (tab === 'trabajador') return rol === 'admin' || rol === 'entrenador'
  return false
}

function LoginPage() {
  const [tab, setTab] = useState('cliente')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleCambiarTab = (nuevaTab) => {
    setTab(nuevaTab)
    setError('')
  }

  // Enviar credenciales al backend, validar rol según pestaña y redirigir
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data } = await api.post('/api/auth/login', { correo, contrasena })

      // Decodificar el payload del JWT (no necesita verificación — el servidor ya lo firmó)
      const payload = JSON.parse(atob(data.token.split('.')[1]))
      const { rol } = payload

      // Impedir que un trabajador entre por la pestaña de cliente y viceversa
      if (!rolEsValido(rol, tab)) {
        setError(
          tab === 'cliente'
            ? 'Esta cuenta no es de cliente. Usa la pestaña Trabajador.'
            : 'Esta cuenta no es de trabajador. Usa la pestaña Cliente.'
        )
        return
      }

      login({ ...payload, token: data.token })
      navigate(RUTAS_ROL[rol])
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <CardLogin
            tab={tab}
            onCambiarTab={handleCambiarTab}
            correo={correo}
            onCorreo={setCorreo}
            contrasena={contrasena}
            onContrasena={setContrasena}
            error={error}
            cargando={cargando}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
