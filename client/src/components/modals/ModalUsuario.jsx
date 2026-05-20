import { useState, useEffect } from 'react'
import ModalBase from './ModalBase'
import ModalCambiarContrasena from './ModalCambiarContrasena'
import ModalReactivar from './ModalReactivar'
import ModalResultado from './ModalResultado'
import CampoFormulario from '../ui/CampoFormulario'
import api from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { color, s } from '../../styles'
import { formatearImporte } from '../../utils'

// Determinar el endpoint de API según el rol
const endpointPorRol = (rol) => {
  if (rol === 'admin')      return 'administradores'
  if (rol === 'entrenador') return 'entrenadores'
  return 'clientes'
}

// Construir el estado inicial del formulario a partir del usuario (o vacío si es crear).
// fecha_nacimiento se recorta a YYYY-MM-DD porque el backend devuelve ISO 8601 completo
// y el input type="date" solo acepta ese formato corto.
// rol: si no hay usuario, el valor por defecto depende de si el rol es editable (trabajador) o no (cliente)
const formInicial = (usuario, rolEditable) => ({
  nombre:           usuario?.nombre           ?? '',
  apellidos:        usuario?.apellidos        ?? '',
  correo:           usuario?.correo           ?? '',
  direccion:        usuario?.direccion        ?? '',
  fecha_nacimiento: usuario?.fecha_nacimiento ? usuario.fecha_nacimiento.slice(0, 10) : '',
  telefono:         usuario?.telefono         ?? '',
  DNI:              usuario?.DNI              ?? '',
  rol:              usuario?.rol              ?? (rolEditable ? 'entrenador' : 'cliente'),
  sexo:             usuario?.sexo             ?? '',
  nivel:            usuario?.nivel            ?? '',
  tipo_cuota:       usuario?.tipo_cuota?._id  ?? usuario?.tipo_cuota ?? '',
})

const erroresIniciales = {
  nombre: '', apellidos: '', correo: '',
  DNI: '', telefono: '', fecha_nacimiento: '', sexo: '',
}

// Validar el formulario; devuelve objeto de errores (campos vacíos = sin error)
const validarForm = (form) => {
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

  // Teléfono es opcional, pero si se rellena debe tener exactamente 9 dígitos
  if (form.telefono && !/^\d{9}$/.test(form.telefono.trim())) {
    e.telefono = 'El teléfono debe tener exactamente 9 dígitos.'
  }

  // Fecha de nacimiento es opcional, pero no puede ser futura
  if (form.fecha_nacimiento && new Date(form.fecha_nacimiento) > new Date()) {
    e.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.'
  }

  // Sexo obligatorio para clientes
  if (form.rol === 'cliente' && !form.sexo) {
    e.sexo = 'El sexo es obligatorio.'
  }

  return e
}

// Comprobar si hay algún error en el objeto de errores
const hayErrores = (errores) => Object.values(errores).some(valor => valor !== '')

// Modal de creación, visualización y edición de usuarios.
// - esCrear: no se pasa usuario → formulario en blanco, modo edición activo desde el inicio
// - soloLectura: muestra los datos sin botón de editar (usado cuando el cliente ve su propio perfil)
// - rolEditable: permite cambiar el rol al crear un empleado (solo admin)
function ModalUsuario({ usuario, onClose, onGuardar, rolEditable = false, soloLectura = false }) {
  const { usuario: usuarioAuth } = useAuth()
  const esCrear = !usuario
  // Detectar si el usuario que tiene el modal abierto es el mismo que el que se está visualizando
  const esPropio = usuarioAuth?.id === usuario?._id
  const [editando, setEditando]               = useState(esCrear)
  const [modalContrasena, setModalContrasena] = useState(false)
  // confirmandoReset controla si se muestra el bloque de confirmación inline antes de resetear
  const [confirmandoReset, setConfirmandoReset] = useState(false)
  const [resetando, setResetando]             = useState(false)
  const [form, setForm]           = useState(formInicial(usuario, rolEditable))
  const [errores, setErrores]     = useState(erroresIniciales)
  const [cuotas, setCuotas]       = useState([])
  const [guardando, setGuardando] = useState(false)
  // resultado: { exito: bool, mensaje: string, datos: obj } — abre ModalResultado cuando no es null
  const [resultado, setResultado] = useState(null)
  // Lista de usuarios de baja que coinciden por DNI o correo al crear; abre ModalReactivar cuando no es null
  const [inactivosReactivar, setInactivosReactivar] = useState(null)

  // Cargar cuotas solo al crear un usuario (el select solo aparece al crear cliente)
  useEffect(() => {
    if (esCrear) {
      api.get('/api/cuotas').then(res => setCuotas(res.data.cuotas)).catch(() => {})
    }
  }, [esCrear])

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

  // Guardar: valida en local primero; solo llama a la API si todo es correcto.
  // Filtra campos vacíos para no sobreescribir datos opcionales con string vacío.
  // Excluye contrasena del PUT — se gestiona en su propio modal.
  const guardar = async () => {
    const e = validarForm(form)
    if (hayErrores(e)) {
      setErrores(e)
      return
    }

    setGuardando(true)
    try {
      const endpoint = endpointPorRol(esCrear ? form.rol : usuario.rol)
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
      // 409: el backend ha encontrado usuarios de baja con el mismo DNI o correo; abrir modal para ofrecer reactivar
      if (err.response?.status === 409 && Array.isArray(data?.inactivos) && data.inactivos.length > 0) {
        setInactivosReactivar(data.inactivos)
      } else if (data?.campo && data?.mensaje) {
        // Si el servidor indica qué campo tiene el conflicto (correo/DNI duplicado), mostrarlo como error de campo
        setErrores(prev => ({ ...prev, [data.campo]: data.mensaje }))
      } else {
        setResultado({ exito: false, mensaje: data?.mensaje ?? 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.' })
      }
    } finally {
      setGuardando(false)
    }
  }

  // Resetear la contraseña del usuario: el backend genera una temporal y la manda por email
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
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1">

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

        {/* Cambiar contraseña propia / resetear como admin (no aplica en creación).
            El usuario propio ve "Cambiar contraseña" que abre su modal dedicado.
            El admin viendo a otro usuario ve "Resetear contraseña" con confirmación inline. */}
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
            <input className={inputClass(true)} disabled type="date" value={usuario.fecha_alta?.slice(0, 10) ?? ''} />
          </CampoFormulario>
        )}

        {/* Rol — solo para trabajadores; solo editable al crear con rolEditable activo */}
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

        {/* Sexo y nivel — solo para clientes */}
        {form.rol === 'cliente' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <CampoFormulario label="Sexo" error={errores.sexo} className="flex-1">
              <select className={inputClass(!editando)} disabled={!editando} value={form.sexo} onChange={e => actualizarCampo('sexo', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </CampoFormulario>
            <CampoFormulario label="Nivel" className="flex-1">
              <select className={inputClass(!editando)} disabled={!editando} value={form.nivel} onChange={e => actualizarCampo('nivel', e.target.value)}>
                <option value="">Sin especificar</option>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </CampoFormulario>
          </div>
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
              {cuotas.map(cuota => (
                <option key={cuota._id} value={cuota._id}>
                  {cuota.nombre} — {cuota.meses} {cuota.meses === 1 ? 'mes' : 'meses'} / {formatearImporte(cuota.importe)}
                </option>
              ))}
            </select>
          </CampoFormulario>
        )}

      </div>

      {/* Botones de acción: en modo lectura solo "Editar"; en modo edición "Cancelar" + "Guardar" */}
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

      {/* Modal de resultado: si fue exitoso notifica al padre y cierra la edición; si no, deja el modal abierto para corregir */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => {
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

    {/* Modal de reactivación: cuando se ha intentado crear y existen usuarios de baja con esos datos.
        Al reactivar uno, se notifica al padre y se cierra el modal de creación. */}
    {inactivosReactivar && (
      <ModalReactivar
        inactivos={inactivosReactivar}
        onClose={() => setInactivosReactivar(null)}
        onReactivado={(datos) => {
          setInactivosReactivar(null)
          onGuardar?.(datos)
          onClose()
        }}
      />
    )}
    </>
  )
}

export default ModalUsuario
