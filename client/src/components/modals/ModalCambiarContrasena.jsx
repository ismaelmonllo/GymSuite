import { useState } from 'react'
import ModalBase from './ModalBase'
import ValidacionContrasena from '../ui/ValidacionContrasena'
import api from '../../services/api'
import { color, s } from '../../styles'
import { useAuth } from '../../hooks/useAuth'

// Modal para que el usuario autenticado cambie su propia contraseña
// forzado=true se usa tras un alta o reseteo: no se puede cerrar y no muestra botón Cancelar
function ModalCambiarContrasena({ onClose, forzado = false }) {
  const { actualizarToken } = useAuth()

  const [contrasenaActual, setContrasenaActual] = useState('')
  const [nuevaContrasena, setNuevaContrasena]   = useState('')
  const [repetir, setRepetir]                   = useState('')
  const [error, setError]                       = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [exito, setExito]                       = useState(false)

  const validar = () => {
    if (!contrasenaActual)           return 'Introduce la contraseña actual.'
    if (!nuevaContrasena)            return 'Introduce la nueva contraseña.'
    if (nuevaContrasena.length < 12) return 'La contraseña debe tener al menos 12 caracteres.'
    if (nuevaContrasena !== repetir) return 'Las contraseñas no coinciden.'
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }

    setError('')
    setGuardando(true)
    try {
      // El backend devuelve un token nuevo con forzar_cambio_password = false; lo aplicamos para refrescar la sesión
      const { data } = await api.patch('/api/auth/cambiar-contrasena', { contrasenaActual, contrasenaNueva: nuevaContrasena })
      if (data?.token) actualizarToken(data.token)
      setExito(true)
    } catch (err) {
      const data = err.response?.data
      const msg = data?.mensaje ?? data?.errores?.[0]?.error ?? 'No se pudo cambiar la contraseña.'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  // Tras éxito: en modo forzado el modal se desmonta automáticamente desde el padre (App.jsx)
  // al refrescar el token sin la flag, por lo que no necesita botón "Cerrar" propio
  if (exito) {
    return (
      <ModalBase titulo="Cambiar contraseña" onClose={onClose} cerrable={!forzado}>
        <p className="text-sm text-green-400">✓ Contraseña cambiada correctamente.</p>
        {!forzado && <button onClick={onClose} className={s.btnPrimary}>Cerrar</button>}
      </ModalBase>
    )
  }

  return (
    <ModalBase titulo="Cambiar contraseña" onClose={onClose} cerrable={!forzado}>
      <div className="flex flex-col gap-4">

        {forzado && (
          <p className={`text-sm ${color.texto}`}>
            Por seguridad debes cambiar tu contraseña temporal antes de continuar.
          </p>
        )}

        <div className={s.fieldGroup}>
          <label className={s.label}>Contraseña actual</label>
          <input
            type="password"
            className={`${s.input} w-full`}
            value={contrasenaActual}
            onChange={e => { setContrasenaActual(e.target.value); setError('') }}
            placeholder="••••••••"
          />
        </div>

        <div className={s.fieldGroup}>
          <label className={s.label}>Nueva contraseña</label>
          <input
            type="password"
            className={`${s.input} w-full`}
            value={nuevaContrasena}
            onChange={e => { setNuevaContrasena(e.target.value); setError('') }}
            placeholder="••••••••"
          />
          <ValidacionContrasena valor={nuevaContrasena} />
        </div>

        <div className={s.fieldGroup}>
          <label className={s.label}>Repetir nueva contraseña</label>
          <input
            type="password"
            className={`${s.input} w-full`}
            value={repetir}
            onChange={e => { setRepetir(e.target.value); setError('') }}
            placeholder="••••••••"
          />
        </div>

        {error && <p className={`text-sm ${color.error}`}>{error}</p>}

        <div className="flex gap-3">
          {!forzado && <button onClick={onClose} className={s.btnSecundario}>Cancelar</button>}
          <button onClick={guardar} disabled={guardando} className={`flex-1 ${s.btnPrimary}`}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>
    </ModalBase>
  )
}

export default ModalCambiarContrasena
