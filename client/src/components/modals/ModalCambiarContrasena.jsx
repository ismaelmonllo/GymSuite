import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import ModalBase from './ModalBase'
import ValidacionContrasena from '../ui/ValidacionContrasena'
import api from '../../services/api'
import { color, s } from '../../styles'

// Determinar endpoint según rol del usuario
const endpointPorRol = (rol) => {
  if (rol === 'admin')      return 'administradores'
  if (rol === 'entrenador') return 'entrenadores'
  return 'clientes'
}

// Modal para cambiar contraseña: con campo actual (propio) o sin él (admin sobre otro)
function ModalCambiarContrasena({ usuario, esPropio, onClose }) {
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [nuevaContrasena, setNuevaContrasena]   = useState('')
  const [repetir, setRepetir]                   = useState('')
  const [error, setError]                       = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [exito, setExito]                       = useState(false)

  const titulo = esPropio
    ? 'Cambiar contraseña'
    : `${usuario.nombre} ${usuario.apellidos}`

  const validar = () => {
    if (esPropio && !contrasenaActual) return 'Introduce la contraseña actual.'
    if (!nuevaContrasena)              return 'Introduce la nueva contraseña.'
    if (nuevaContrasena.length < 8)    return 'La contraseña debe tener al menos 8 caracteres.'
    if (nuevaContrasena !== repetir)   return 'Las contraseñas no coinciden.'
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }

    setError('')
    setGuardando(true)
    try {
      const endpoint = endpointPorRol(usuario.rol)
      const body = { nuevaContrasena }
      if (esPropio) body.contrasenaActual = contrasenaActual
      await api.patch(`/api/${endpoint}/${usuario._id}/contrasena`, body)
      setExito(true)
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'No se pudo cambiar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  if (exito) {
    return (
      <ModalBase titulo={titulo} onClose={onClose}>
        <p className="text-sm text-green-400">✓ Contraseña cambiada correctamente.</p>
        <button onClick={onClose} className={s.btnPrimary}>Cerrar</button>
      </ModalBase>
    )
  }

  return (
    <ModalBase titulo={titulo} onClose={onClose}>

      <div className="flex flex-col gap-4">

        {esPropio && (
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
        )}

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
          <button
            onClick={onClose}
            className={s.btnSecundario}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className={`flex-1 ${s.btnPrimary}`}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>

    </ModalBase>
  )
}

export default ModalCambiarContrasena
