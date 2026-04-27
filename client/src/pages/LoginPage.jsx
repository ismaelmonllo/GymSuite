import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import Header from '../components/layout/Header'
import CardLogin from '../components/auth/CardLogin'
import Modal2FA from '../components/auth/Modal2FA'
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
  const [correoOTP, setCorreoOTP] = useState(null) // no null = modal 2FA visible
  const [error2FA, setError2FA] = useState('')
  const [cargando2FA, setCargando2FA] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleCambiarTab = (nuevaTab) => {
    setTab(nuevaTab)
    setError('')
  }

  // Decodificar token, validar rol según pestaña y guardar sesión
  const completarLogin = (token) => {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!rolEsValido(payload.rol, tab)) {
      setError(
        tab === 'cliente'
          ? 'Esta cuenta no es de cliente. Usa la pestaña Trabajador.'
          : 'Esta cuenta no es de trabajador. Usa la pestaña Cliente.'
      )
      setCorreoOTP(null)
      return
    }
    login({ ...payload, token })
    navigate(RUTAS_ROL[payload.rol])
  }

  // Enviar credenciales al backend; abrir modal 2FA si el servidor lo requiere
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data } = await api.post('/api/auth/login', { correo, contrasena })
      if (data.requiere2FA) {
        setCorreoOTP(correo)
      } else {
        completarLogin(data.token)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  // Enviar el código OTP al backend y completar el login si es correcto
  const handleVerificar2FA = async (codigo) => {
    setError2FA('')
    setCargando2FA(true)
    try {
      const { data } = await api.post('/api/auth/verificar-2fa', { correo: correoOTP, codigo })
      completarLogin(data.token)
    } catch (err) {
      setError2FA(err.response?.data?.mensaje ?? 'Código incorrecto')
    } finally {
      setCargando2FA(false)
    }
  }

  const handleCerrarModal = () => {
    setCorreoOTP(null)
    setError2FA('')
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

      {correoOTP && (
        <Modal2FA
          correo={correoOTP}
          onVerificar={handleVerificar2FA}
          onCerrar={handleCerrarModal}
          error={error2FA}
          cargando={cargando2FA}
        />
      )}
    </div>
  )
}

export default LoginPage
