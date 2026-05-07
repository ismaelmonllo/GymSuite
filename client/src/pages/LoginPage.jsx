import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import Header from '../components/layout/Header'
import CardLogin from '../components/auth/CardLogin'
import Modal2FA from '../components/auth/Modal2FA'
import { color } from '../styles'

// Rutas a las que se redirige según el rol tras un login exitoso
const RUTAS_ROL = {
  admin: '/admin',
  entrenador: '/entrenador',
  cliente: '/cliente',
}

// Comprobar que el rol del token coincide con la pestaña seleccionada en el formulario.
// Evita que un trabajador entre por la pestaña Cliente y viceversa, aunque las credenciales sean correctas.
const rolEsValido = (rol, tab) => {
  if (tab === 'cliente') return rol === 'cliente'
  if (tab === 'trabajador') return rol === 'admin' || rol === 'entrenador'
  return false
}

function LoginPage() {
  // Pestaña activa: 'cliente' o 'trabajador'
  const [tab, setTab] = useState('cliente')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Cuando correoOTP no es null, el modal de 2FA está visible.
  // Guardamos el correo para enviarlo junto al código OTP en el segundo paso.
  const [correoOTP, setCorreoOTP] = useState(null)
  const [error2FA, setError2FA] = useState('')
  const [cargando2FA, setCargando2FA] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  // Limpiar el error al cambiar de pestaña para no mostrar mensajes obsoletos
  const handleCambiarTab = (nuevaTab) => {
    setTab(nuevaTab)
    setError('')
  }

  // Paso final del login: decodificar el JWT, validar que el rol corresponde a la pestaña
  // seleccionada y, si todo es correcto, guardar la sesión y redirigir al dashboard.
  // Se ejecuta tanto en login directo como tras verificar el código 2FA.
  const completarLogin = (token) => {
    // El payload del JWT contiene id, rol, nombre y apellidos
    const payload = JSON.parse(atob(token.split('.')[1]))

    // Si el rol no encaja con la pestaña, mostrar error y no iniciar sesión
    if (!rolEsValido(payload.rol, tab)) {
      setError(
        tab === 'cliente'
          ? 'Esta cuenta no es de cliente. Usa la pestaña Trabajador.'
          : 'Esta cuenta no es de trabajador. Usa la pestaña Cliente.'
      )
      // Cerrar el modal 2FA si estaba abierto, para que el usuario vea el error en el formulario
      setCorreoOTP(null)
      return
    }

    // Guardar token y datos del usuario en el contexto global y en la cookie
    login({ ...payload, token })
    navigate(RUTAS_ROL[payload.rol])
  }

  // Primer paso del login: enviar correo y contraseña al backend.
  // Si el servidor requiere 2FA, abre el modal para introducir el código OTP.
  // Si no, completa el login directamente con el token recibido.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data } = await api.post('/api/auth/login', { correo, contrasena, tab })

      if (data.requiere2FA) {
        // El servidor ha enviado un código OTP al correo del usuario; guardamos el correo
        // para usarlo en la verificación y abrimos el modal
        setCorreoOTP(correo)
      } else {
        // Login sin 2FA: completar directamente
        completarLogin(data.token)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  // Segundo paso del login con 2FA: enviar el código OTP introducido por el usuario.
  // Si el código es correcto, el servidor devuelve el token y se completa el login.
  const handleVerificar2FA = async (codigo) => {
    setError2FA('')
    setCargando2FA(true)
    try {
      const { data } = await api.post('/api/auth/verificar-2fa', { correo: correoOTP, codigo })
      completarLogin(data.token)
    } catch (err) {
      // El servidor responde 401 si el código es incorrecto o ha expirado (5 minutos)
      setError2FA(err.response?.data?.mensaje ?? 'Código incorrecto')
    } finally {
      setCargando2FA(false)
    }
  }

  // Cerrar el modal 2FA sin completar el login; el usuario puede volver a intentarlo
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

      {/* El modal solo se monta cuando hay un correoOTP guardado (2FA pendiente) */}
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
