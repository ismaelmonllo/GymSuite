import { useState, useEffect } from 'react'
import ModalBase from './ModalBase'
import ModalCambiarContrasena from './ModalCambiarContrasena'
import ModalResultado from './ModalResultado'
import CampoFormulario from '../ui/CampoFormulario'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
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
  direccion:        usuario?.direccion        ?? '',
  fecha_nacimiento: usuario?.fecha_nacimiento ? usuario.fecha_nacimiento.slice(0, 10) : '',
  telefono:         usuario?.telefono         ?? '',
  DNI:              usuario?.DNI              ?? '',
  rol:              usuario?.rol              ?? (rolEditable ? 'entrenador' : 'cliente'),
  nivel:            usuario?.nivel            ?? '',
  tipo_cuota:       usuario?.tipo_cuota?._id  ?? usuario?.tipo_cuota ?? '',
})

const erroresIniciales = {
  nombre: '', apellidos: '', correo: '',
  DNI: '', telefono: '', fecha_nacimiento: '',
}

// Validar el formulario; devuelve objeto de errores (campos vacíos = sin error)
const validarForm = (form, esCrear) => {
  const e = { ...erroresIniciales }

  if (!form.nombre.trim())    e.nombre    = 'El nombre es obligatorio.'
  if (!form.apellidos.trim()) e.apellidos = 'Los apellidos son obligatorios.'

  if (!form.correo.trim()) {
    e.correo = 'El correo es obligatorio.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
    e.correo = 'Formato de correo no válido.'
  }

  if (!form.DNI.trim()) {
    e.DNI = 'El DNI es obligatorio.'
  } else if (!/^\d{8}[A-Za-z]$/.test(form.DNI.trim())) {
    e.DNI = 'Formato DNI no válido (8 dígitos + letra).'
  }

  if (form.telefono && !/^\d{9}$/.test(form.telefono.trim())) {
    e.telefono = 'El teléfono debe tener exactamente 9 dígitos.'
  }

  if (form.fecha_nacimiento && new Date(form.fecha_nacimiento) > new Date()) {
    e.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.'
  }

  return e
}

// Comprobar si hay algún error en el objeto de errores
const hayErrores = (e) => Object.values(e).some(v => v !== '')

// Modal de creación, visualización y edición de usuarios
function ModalUsuario({ usuario, onClose, onGuardar, rolEditable = false, soloLectura = false }) {
  const { usuario: usuarioAuth } = useAuth()
  const esCrear = !usuario
  const esPropio = usuarioAuth?.id === usuario?._id
  const [editando, setEditando]               = useState(esCrear)
  const [modalContrasena, setModalContrasena] = useState(false)
  const [confirmandoReset, setConfirmandoReset] = useState(false)
  const [resetando, setResetando]             = useState(false)
  const [form, setForm]           = useState(formInicial(usuario, rolEditable))
  const [errores, setErrores]     = useState(erroresIniciales)
  const [cuotas, setCuotas]       = useState([])
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState(null) // { exito: bool, mensaje: string, datos: obj }

  // Cargar las cuotas disponibles para el select de alta de cliente
  useEffect(() => {
    api.get('/api/cuotas').then(res => setCuotas(res.data.cuotas)).catch(() => {})
  }, [])

  // Actualizar campo y limpiar su error al escribir
  const actualizarCampo = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  // Cancelar edición: si es crear cierra el modal, si es editar restaura los valores originales
  const cancelar = () => {
    if (esCrear) {
      onClose()
    } else {
      setForm(formInicial(usuario))
      setErrores(erroresIniciales)
      setEditando(false)
    }
  }

  // Guardar: valida en local primero; solo llama a la API si todo es correcto
  const guardar = async () => {
    const e = validarForm(form, esCrear)
    if (hayErrores(e)) {
      setErrores(e)
      return
    }

    setGuardando(true)
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
      const data = err.response?.data
      // Si el servidor indica qué campo tiene el conflicto, mostrarlo como error de campo
      if (data?.campo && data?.mensaje) {
        setErrores(prev => ({ ...prev, [data.campo]: data.mensaje }))
      } else {
        setResultado({ exito: false, mensaje: data?.mensaje ?? 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.' })
      }
    } finally {
      setGuardando(false)
    }
  }

  // Llamar al endpoint de reset y mostrar resultado
  const handleResetearPassword = async () => {
    setResetando(true)
    try {
      await api.patch(`/api/auth/resetear-password/${usuario._id}`)
      setConfirmandoReset(false)
      setResultado({ exito: true, mensaje: 'Contraseña reseteada. El usuario recibirá la nueva contraseña por email.' })
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo resetear la contraseña.' })
    } finally {
      setResetando(false)
    }
  }

  // Clases del input según si está habilitado o no
  const inputClass = (deshabilitado) =>
    `${s.input} w-full ${deshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`

  const titulo = esCrear
    ? `Nuevo ${form.rol === 'admin' ? 'administrador' : form.rol}`
    : `${usuario.nombre} ${usuario.apellidos}`

  return (
    <>
    <ModalBase titulo={titulo} onClose={onClose}>

      {/* Campos con scroll si hay muchos */}
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">

        {/* Nombre + Apellidos: apilados en móvil, misma fila en desktop */}
        <div className="flex flex-col sm:flex-row gap-3">
          <CampoFormulario label="Nombre" error={errores.nombre} className="flex-1">
            <input className={inputClass(!editando)} disabled={!editando} value={form.nombre} onChange={e => actualizarCampo('nombre', e.target.value)} />
          </CampoFormulario>
          <CampoFormulario label="Apellidos" error={errores.apellidos} className="flex-1">
            <input className={inputClass(!editando)} disabled={!editando} value={form.apellidos} onChange={e => actualizarCampo('apellidos', e.target.value)} />
          </CampoFormulario>
        </div>

        {/* Correo */}
        <CampoFormulario label="Correo" error={errores.correo}>
          <input className={inputClass(!editando)} disabled={!editando} type="email" value={form.correo} onChange={e => actualizarCampo('correo', e.target.value)} />
        </CampoFormulario>

        {/* Cambiar contraseña propia / resetear como admin (no aplica en creación) */}
        {!esCrear && (esPropio ? (
          <button
            onClick={() => setModalContrasena(true)}
            className={`w-full py-2 rounded-lg border ${color.borde} ${color.texto} text-sm ${color.bgHover} transition-colors`}
          >
            Cambiar contraseña
          </button>
        ) : usuarioAuth?.rol === 'admin' && (
          confirmandoReset ? (
            <div className={`flex flex-col gap-2 rounded-lg border ${color.borde} p-3`}>
              <p className={`${color.textoApagado} text-sm text-center`}>
                ¿Seguro que quieres resetear la contraseña de este usuario?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmandoReset(false)}
                  className={s.btnSecundario}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetearPassword}
                  disabled={resetando}
                  className={`flex-1 ${s.btnPrimary}`}
                >
                  {resetando ? 'Reseteando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmandoReset(true)}
              className={`w-full py-2 rounded-lg border ${color.borde} ${color.texto} text-sm ${color.bgHover} transition-colors`}
            >
              Resetear contraseña
            </button>
          )
        ))}

        {/* Dirección */}
        <CampoFormulario label="Dirección">
          <input className={inputClass(!editando)} disabled={!editando} value={form.direccion} onChange={e => actualizarCampo('direccion', e.target.value)} />
        </CampoFormulario>

        {/* Fecha de nacimiento */}
        <CampoFormulario label="Fecha de nacimiento" error={errores.fecha_nacimiento}>
          <input className={inputClass(!editando)} disabled={!editando} type="date" value={form.fecha_nacimiento} onChange={e => actualizarCampo('fecha_nacimiento', e.target.value)} />
        </CampoFormulario>

        {/* Teléfono */}
        <CampoFormulario label="Teléfono" error={errores.telefono}>
          <input className={inputClass(!editando)} disabled={!editando} value={form.telefono} onChange={e => actualizarCampo('telefono', e.target.value)} />
        </CampoFormulario>

        {/* DNI */}
        <CampoFormulario label="DNI" error={errores.DNI}>
          <input className={inputClass(!editando)} disabled={!editando} value={form.DNI} onChange={e => actualizarCampo('DNI', e.target.value)} />
        </CampoFormulario>

        {/* Fecha de alta — siempre deshabilitada, no aparece en modo crear */}
        {!esCrear && (
          <CampoFormulario label="Fecha de alta">
            <input className={inputClass(true)} disabled value={usuario.fecha_alta ? new Date(usuario.fecha_alta).toLocaleDateString('es-ES') : '—'} />
          </CampoFormulario>
        )}

        {/* Rol — solo para trabajadores */}
        {form.rol !== 'cliente' && (
          <CampoFormulario label="Rol">
            <select className={inputClass(!(esCrear && rolEditable))} disabled={!(esCrear && rolEditable)} value={form.rol} onChange={e => actualizarCampo('rol', e.target.value)}>
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
          </CampoFormulario>
        )}

        {/* Nivel — solo si el rol es cliente */}
        {form.rol === 'cliente' && (
          <CampoFormulario label="Nivel">
            <select className={inputClass(!editando)} disabled={!editando} value={form.nivel} onChange={e => actualizarCampo('nivel', e.target.value)}>
              <option value="">Sin especificar</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </CampoFormulario>
        )}

        {/* Cuota — solo al crear un cliente; en edición se gestiona desde ModalPagos */}
        {esCrear && form.rol === 'cliente' && (
          <CampoFormulario label="Cuota">
            <select
              className={inputClass(false)}
              value={form.tipo_cuota}
              onChange={e => actualizarCampo('tipo_cuota', e.target.value)}
            >
              <option value="">Seleccionar cuota</option>
              {cuotas.map(c => (
                <option key={c._id} value={c._id}>
                  {c.nombre} — {c.meses} {c.meses === 1 ? 'mes' : 'meses'} / {c.importe}€
                </option>
              ))}
            </select>
          </CampoFormulario>
        )}

      </div>

      {/* Botones de acción */}
      {!editando ? (
        !soloLectura && (
          <button className={s.btnPrimary} onClick={() => setEditando(true)}>
            Editar
          </button>
        )
      ) : (
        <div className="flex gap-3">
          <button
            onClick={cancelar}
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
      )}

      {/* Resultado del guardado */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => {
            // Si fue exitoso notificar al padre (actualiza lista y cierra modal); si no, dejar abierto para corregir
            if (resultado.exito) {
              onGuardar?.(resultado.datos)
              if (!esCrear) setEditando(false)
            }
            setResultado(null)
          }}
        />
      )}

    </ModalBase>

    {modalContrasena && (
      <ModalCambiarContrasena onClose={() => setModalContrasena(false)} />
    )}
    </>
  )
}

export default ModalUsuario
