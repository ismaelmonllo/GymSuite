import { useState, useEffect } from 'react'
import { UserPen } from 'lucide-react'
import ModalBase from './ModalBase'
import api from '../../services/api'
import { color, s } from '../../styles'

// Determinar el endpoint de API según el rol
const endpointPorRol = (rol) => {
  if (rol === 'admin')      return 'administradores'
  if (rol === 'entrenador') return 'entrenadores'
  return 'clientes'
}

// Construir el estado inicial del formulario a partir del usuario (o vacío si es crear)
const formInicial = (usuario, rolEditable) => ({
  nombre:           usuario?.nombre           ?? '',
  apellidos:        usuario?.apellidos        ?? '',
  correo:           usuario?.correo           ?? '',
  contrasena:       '',
  direccion:        usuario?.direccion        ?? '',
  fecha_nacimiento: usuario?.fecha_nacimiento ? usuario.fecha_nacimiento.slice(0, 10) : '',
  telefono:         usuario?.telefono         ?? '',
  DNI:              usuario?.DNI              ?? '',
  rol:              usuario?.rol              ?? (rolEditable ? 'entrenador' : 'cliente'),
  nivel:            usuario?.nivel            ?? '',
  tipo_cuota:       usuario?.tipo_cuota?._id  ?? usuario?.tipo_cuota ?? '',
})

// Modal de creación, visualización y edición de usuarios
function ModalUsuario({ usuario, onClose, onGuardar, rolEditable = false }) {
  const esCrear = !usuario
  const [editando, setEditando]   = useState(esCrear)
  const [form, setForm]           = useState(formInicial(usuario, rolEditable))
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const [resultado, setResultado] = useState(null) // { exito: bool, mensaje: string, datos: obj }
  const [cuotas, setCuotas]       = useState([])

  useEffect(() => {
    api.get('/api/cuotas')
      .then(res => setCuotas(res.data.cuotas ?? []))
      .catch(() => {})
  }, [])

  const actualizarCampo = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  // Cancelar edición: si es crear cierra el modal, si es editar restaura los valores originales
  const cancelar = () => {
    if (esCrear) {
      onClose()
    } else {
      setForm(formInicial(usuario))
      setEditando(false)
      setError(null)
    }
  }

  // Guardar: POST si es nuevo, PUT si ya existe
  const guardar = async () => {
    setGuardando(true)
    setError(null)
    // Validar campos obligatorios antes de llamar a la API
    if (!form.nombre.trim() || !form.apellidos.trim() || !form.correo.trim() || !form.DNI.trim()) {
      setError('Nombre, apellidos, correo y DNI son obligatorios.')
      setGuardando(false)
      return
    }
    if (esCrear && !form.contrasena.trim()) {
      setError('La contraseña es obligatoria.')
      setGuardando(false)
      return
    }

    try {
      const endpoint = endpointPorRol(esCrear ? form.rol : usuario.rol)
      // Eliminar campos opcionales vacíos; excluir contrasena del PUT (se gestiona en su propio modal)
      const body = Object.fromEntries(
        Object.entries(form).filter(([k, v]) => v !== '' && (esCrear || k !== 'contrasena'))
      )
      const res = esCrear
        ? await api.post(`/api/${endpoint}`, body)
        : await api.put(`/api/${endpoint}/${usuario._id}`, body)
      setResultado({
        exito: true,
        mensaje: esCrear ? 'Usuario creado correctamente.' : 'Usuario guardado correctamente.',
        datos: res.data,
      })
    } catch (err) {
      console.error('Error al guardar usuario:', err.response?.data ?? err.message)
      setResultado({ exito: false, mensaje: 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  // Clases del input según si está habilitado o no
  const inputClass = (deshabilitado) =>
    `${s.input} w-full ${deshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`

  const titulo = esCrear
    ? `Nuevo ${form.rol === 'admin' ? 'administrador' : form.rol}`
    : `${usuario.nombre} ${usuario.apellidos}`

  return (
    <ModalBase titulo={titulo} onClose={onClose}>

      {/* Campos con scroll si hay muchos */}
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">

        {/* Nombre + Apellidos en la misma fila */}
        <div className="flex gap-3">
          <div className={`${s.fieldGroup} flex-1`}>
            <label className={s.label}>Nombre</label>
            <input
              className={inputClass(!editando)}
              disabled={!editando}
              value={form.nombre}
              onChange={e => actualizarCampo('nombre', e.target.value)}
            />
          </div>
          <div className={`${s.fieldGroup} flex-1`}>
            <label className={s.label}>Apellidos</label>
            <input
              className={inputClass(!editando)}
              disabled={!editando}
              value={form.apellidos}
              onChange={e => actualizarCampo('apellidos', e.target.value)}
            />
          </div>
        </div>

        {/* Correo */}
        <div className={s.fieldGroup}>
          <label className={s.label}>Correo</label>
          <input
            className={inputClass(!editando)}
            disabled={!editando}
            type="email"
            value={form.correo}
            onChange={e => actualizarCampo('correo', e.target.value)}
          />
        </div>

        {/* Contraseña al crear / botón cambiar al editar */}
        {esCrear ? (
          <div className={s.fieldGroup}>
            <label className={s.label}>Contraseña</label>
            <input
              className={inputClass(false)}
              type="password"
              value={form.contrasena}
              onChange={e => actualizarCampo('contrasena', e.target.value)}
            />
          </div>
        ) : (
          <button
            onClick={() => console.log('abrir modal contraseña')}
            className={`w-full py-2 rounded-lg border ${color.borde} ${color.texto} text-sm ${color.bgHover} transition-colors`}
          >
            Cambiar contraseña
          </button>
        )}

        {/* Dirección */}
        <div className={s.fieldGroup}>
          <label className={s.label}>Dirección</label>
          <input
            className={inputClass(!editando)}
            disabled={!editando}
            value={form.direccion}
            onChange={e => actualizarCampo('direccion', e.target.value)}
          />
        </div>

        {/* Fecha de nacimiento */}
        <div className={s.fieldGroup}>
          <label className={s.label}>Fecha de nacimiento</label>
          <input
            className={inputClass(!editando)}
            disabled={!editando}
            type="date"
            value={form.fecha_nacimiento}
            onChange={e => actualizarCampo('fecha_nacimiento', e.target.value)}
          />
        </div>

        {/* Teléfono */}
        <div className={s.fieldGroup}>
          <label className={s.label}>Teléfono</label>
          <input
            className={inputClass(!editando)}
            disabled={!editando}
            value={form.telefono}
            onChange={e => actualizarCampo('telefono', e.target.value)}
          />
        </div>

        {/* DNI */}
        <div className={s.fieldGroup}>
          <label className={s.label}>DNI</label>
          <input
            className={inputClass(!editando)}
            disabled={!editando}
            value={form.DNI}
            onChange={e => actualizarCampo('DNI', e.target.value)}
          />
        </div>

        {/* Fecha de alta — siempre deshabilitada, no aparece en modo crear */}
        {!esCrear && (
          <div className={s.fieldGroup}>
            <label className={s.label}>Fecha de alta</label>
            <input
              className={inputClass(true)}
              disabled
              value={usuario.fecha_alta
                ? new Date(usuario.fecha_alta).toLocaleDateString('es-ES')
                : '—'}
            />
          </div>
        )}

        {/* Rol */}
        <div className={s.fieldGroup}>
          <label className={s.label}>Rol</label>
          <select
            className={inputClass(!(esCrear && rolEditable))}
            disabled={!(esCrear && rolEditable)}
            value={form.rol}
            onChange={e => actualizarCampo('rol', e.target.value)}
          >
            {rolEditable ? (
              <>
                <option value="entrenador">Entrenador</option>
                <option value="admin">Administrador</option>
              </>
            ) : (
              <>
                <option value="cliente">Cliente</option>
                <option value="entrenador">Entrenador</option>
                <option value="admin">Administrador</option>
              </>
            )}
          </select>
        </div>

        {/* Nivel y tipo de cuota — solo si el rol es cliente */}
        {form.rol === 'cliente' && (
          <>
            <div className={s.fieldGroup}>
              <label className={s.label}>Nivel</label>
              <select
                className={inputClass(!editando)}
                disabled={!editando}
                value={form.nivel}
                onChange={e => actualizarCampo('nivel', e.target.value)}
              >
                <option value="">Sin especificar</option>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.label}>Tipo de cuota</label>
              <select
                className={inputClass(!editando)}
                disabled={!editando}
                value={form.tipo_cuota}
                onChange={e => actualizarCampo('tipo_cuota', e.target.value)}
              >
                <option value="">Sin asignar</option>
                {cuotas.map(cuota => (
                  <option key={cuota._id} value={cuota._id}>
                    {cuota.nombre} — {cuota.meses} {cuota.meses === 1 ? 'mes' : 'meses'} — {cuota.importe} €
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Error de guardado */}
        {error && <p className={`text-sm ${color.error}`}>{error}</p>}

      </div>

      {/* Botones de acción */}
      {!editando ? (
        <button className={s.btnPrimary} onClick={() => setEditando(true)}>
          Editar
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={cancelar}
            className={`flex-1 py-3 rounded-lg border ${color.borde} ${color.texto} ${color.bgHover} transition-colors`}
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
      )}

      {/* Resultado del guardado */}
      {resultado && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative z-10 w-full max-w-sm mx-4 rounded-xl ${s.card} p-6 flex flex-col gap-4`}>
            <h3 className={`font-semibold ${color.texto}`}>Resultado</h3>
            <p className={`text-sm ${resultado.exito ? 'text-green-400' : color.error}`}>
              {resultado.exito ? '✓' : '✗'} {resultado.mensaje}
            </p>
            <button
              onClick={() => {
                // Si fue exitoso notificar al padre (actualiza lista y cierra modal); si no, dejar abierto para corregir
                if (resultado.exito) {
                  onGuardar?.(resultado.datos)
                  if (!esCrear) setEditando(false)
                }
                setResultado(null)
              }}
              className={s.btnPrimary}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </ModalBase>
  )
}

export default ModalUsuario
