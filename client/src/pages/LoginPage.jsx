import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import Header from '../components/layout/Header'
import CardLogin from '../components/auth/CardLogin'
import Modal2FA from '../components/auth/Modal2FA'
import { color } from '../styles'
import { RUTAS_ROL } from '../constants'

/**
 * Comprobar que el rol del token coincide con la pestaña seleccionada en el formulario.
 * Evita que un trabajador entre por la pestaña Cliente y viceversa.
 * @param {'admin'|'entrenador'|'cliente'} rol
 * @param {'cliente'|'trabajador'} tab
 * @returns {boolean}
 */
const rolEsValido = (rol, tab) => {
  if (tab === 'cliente') return rol === 'cliente'
  if (tab === 'trabajador') return rol === 'admin' || rol === 'entrenador'
  return false
}

/**
 * Página de login con pestañas Cliente/Trabajador y soporte 2FA por email.
 * Tras un login válido redirige al dashboard correspondiente al rol.
 * @returns {JSX.Element}
 */
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

  /**
   * Cambiar la pestaña activa y limpiar el error para no mostrar mensajes obsoletos.
   * @param {'cliente'|'trabajador'} nuevaTab
   */
  const handleCambiarTab = (nuevaTab) => {
    setTab(nuevaTab)
    setError('')
  }

  /**
   * Paso final del login: decodificar el JWT, validar el rol contra la pestaña,
   * guardar la sesión y redirigir al dashboard. Se ejecuta tanto en login directo
   * como tras verificar el código 2FA.
   * @param {string} token JWT firmado por el backend
   */
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

  /**
   * Primer paso del login: enviar correo y contraseña al backend.
   * Si el servidor requiere 2FA abre el modal del OTP; si no completa el login con el token.
   * @param {React.FormEvent} e
   * @returns {Promise<void>}
   */
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

  /**
   * Segundo paso del login con 2FA: enviar el código OTP introducido por el usuario.
   * Si el código es correcto el servidor devuelve el token y se completa el login.
   * @param {string} codigo Código OTP de 6 dígitos
   * @returns {Promise<void>}
   */
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

  /**
   * Cerrar el modal 2FA sin completar el login; el usuario puede volver a intentarlo.
   */
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
