import { useState } from 'react'
import ModalBase from './ModalBase'
import ModalResultado from './ModalResultado'
import api from '../../services/api'
import { color, s } from '../../styles'
import { formatearFecha } from '../../utils'

// Mapear rol a su segmento de URL en la API
const endpointPorRol = (rol) => {
  if (rol === 'admin')      return 'administradores'
  if (rol === 'entrenador') return 'entrenadores'
  return 'clientes'
}

// Etiqueta legible del rol
const etiquetaRol = (rol) => {
  if (rol === 'admin')      return 'Administrador'
  if (rol === 'entrenador') return 'Entrenador'
  return 'Cliente'
}

// Card resumen de un usuario inactivo candidato a reactivar
function CardInactivo({ usuario, onReactivar, reactivando }) {
  return (
    <div className={`rounded-lg border ${color.borde} p-4 flex flex-col gap-2`}>

      <div className="flex flex-col gap-1">
        <p className={`${color.texto} font-medium`}>
          {usuario.nombre} {usuario.apellidos}
          <span className={`ml-2 text-xs ${color.textoApagado}`}>· {etiquetaRol(usuario.rol)}</span>
        </p>
        <p className={`text-sm ${color.textoApagado}`}>{usuario.correo}</p>
        <p className={`text-sm ${color.textoApagado}`}>DNI: {usuario.DNI}</p>
        <p className={`text-sm ${color.textoApagado}`}>
          Nacimiento: {formatearFecha(usuario.fecha_nacimiento)}
        </p>
      </div>

      <button
        onClick={() => onReactivar(usuario)}
        disabled={reactivando}
        className={s.btnPrimary}
      >
        {reactivando ? 'Reactivando...' : 'Dar de alta'}
      </button>

    </div>
  )
}

// Modal que aparece al crear un usuario cuando hay coincidencia con uno o más usuarios de baja.
// Muestra los candidatos y permite reactivar uno; cancelar vuelve al formulario para que el admin cambie los datos.
function ModalReactivar({ inactivos, onClose, onReactivado }) {
  const [reactivandoId, setReactivandoId] = useState(null)
  const [resultado, setResultado] = useState(null)

  const reactivar = async (usuario) => {
    setReactivandoId(usuario._id)
    try {
      const endpoint = endpointPorRol(usuario.rol)
      const res = await api.patch(`/api/${endpoint}/${usuario._id}/alta`)
      setResultado({
        exito: true,
        mensaje: `${usuario.nombre} ${usuario.apellidos} ha sido dado de alta.`,
        datos: res.data,
      })
    } catch (err) {
      setResultado({
        exito: false,
        mensaje: err.response?.data?.mensaje ?? 'No se pudo dar de alta. Inténtalo de nuevo.',
      })
    } finally {
      setReactivandoId(null)
    }
  }

  // Texto del encabezado que explica por qué se está mostrando este modal
  const explicacion = inactivos.length === 1
    ? 'Existe un usuario dado de baja con los mismos datos. Puedes reactivarlo en vez de crear uno nuevo.'
    : 'Hay varios usuarios dados de baja que coinciden con los datos introducidos. Elige cuál reactivar.'

  return (
    <>
      <ModalBase titulo="Usuario ya existente" onClose={onClose}>

        <p className={`text-sm ${color.textoApagado}`}>{explicacion}</p>

        <div className="flex flex-col gap-3">
          {inactivos.map(usr => (
            <CardInactivo
              key={usr._id}
              usuario={usr}
              onReactivar={reactivar}
              reactivando={reactivandoId === usr._id}
            />
          ))}
        </div>

        <button onClick={onClose} className={s.btnSecundario}>
          Cancelar
        </button>

      </ModalBase>

      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => {
            if (resultado.exito) onReactivado?.(resultado.datos)
            setResultado(null)
          }}
        />
      )}
    </>
  )
}

export default ModalReactivar
