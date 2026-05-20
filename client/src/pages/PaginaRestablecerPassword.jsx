import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { color } from '../styles'

// Página pública accesible desde el link de restablecimiento enviado por email
// Extrae el token de la URL y lo envía junto con la nueva contraseña al backend
function PaginaRestablecerPassword() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [contrasenaNueva, setContrasenaNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (contrasenaNueva !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (contrasenaNueva.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    try {
      setCargando(true)
      await api.post('/auth/restablecer-password', { token, contrasenaNueva })
      setExito(true)
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al restablecer la contraseña.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex items-center justify-center px-4`}>
      <div className={`w-full max-w-md ${color.bgCard} rounded-2xl p-8 shadow-xl`}>
        <h1 className={`text-2xl font-bold ${color.texto} mb-6 text-center`}>
          Restablecer contraseña
        </h1>

        {exito ? (
          <div className="text-center space-y-4">
            <p className="text-green-400">Contraseña actualizada correctamente.</p>
            <button
              onClick={() => navigate('/login')}
              className={`${color.acento} ${color.acentoHover} ${color.texto} font-semibold py-2 px-6 rounded-lg transition`}
            >
              Ir al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${color.texto} mb-1`}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={contrasenaNueva}
                onChange={(e) => setContrasenaNueva(e.target.value)}
                required
                className={`w-full ${color.bgInput} border ${color.borde} ${color.texto} rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${color.texto} mb-1`}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                className={`w-full ${color.bgInput} border ${color.borde} ${color.texto} rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
              />
            </div>

            {error && <p className={`text-sm ${color.error}`}>{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className={`w-full ${color.acento} ${color.acentoHover} ${color.texto} font-semibold py-2 rounded-lg transition disabled:opacity-50`}
            >
              {cargando ? 'Guardando...' : 'Establecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default PaginaRestablecerPassword
