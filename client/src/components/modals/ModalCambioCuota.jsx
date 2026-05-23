import { useState } from 'react'
import ModalBase from './ModalBase'
import ModalResultado from './ModalResultado'
import api from '../../services/api'
import { color, s } from '../../styles'
import { formatearImporte } from '../../utils'

/**
 * Mostrar las cuotas disponibles y permitir seleccionar una nueva para el cliente.
 * Preselecciona la cuota actual del cliente; al guardar muestra modal de resultado.
 * @param {{cliente: object, cuotas: object[], onClose: () => void, onGuardar?: (clienteActualizado: object) => void}} props
 * @returns {JSX.Element}
 */
function ModalCambioCuota({ cliente, cuotas, onClose, onGuardar }) {
  // Preseleccionar la cuota actual del cliente si existe
  const [seleccionada, setSeleccionada] = useState(
    cliente.tipo_cuota?._id ?? cliente.tipo_cuota ?? ''
  )
  const [guardando, setGuardando]   = useState(false)
  const [resultado, setResultado]   = useState(null) // { exito: bool, mensaje: string, datos: obj }

  /**
   * Enviar la nueva cuota al servidor y mostrar el resultado en un modal superpuesto.
   * @returns {Promise<void>}
   */
  const guardar = async () => {
    if (!seleccionada) return
    setGuardando(true)
    try {
      const res = await api.patch(`/api/clientes/${cliente._id}/cuota`, { nuevaCuota: seleccionada })
      setResultado({ exito: true, mensaje: 'Cuota cambiada correctamente.', datos: res.data.cliente })
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo cambiar la cuota.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalBase titulo={`Cuota de ${cliente.nombre} ${cliente.apellidos}`} onClose={onClose}>

      {/* Una card por cada tipo de cuota disponible; borde naranja en la seleccionada */}
      <div className="flex flex-col gap-3">
        {cuotas.map(cuota => {
          const activa = seleccionada === cuota._id
          return (
            <button
              key={cuota._id}
              onClick={() => setSeleccionada(cuota._id)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors text-sm w-full ${
                activa
                  ? 'border-orange-500 bg-orange-950/30'
                  : `border-transparent ${color.bgCard} ${color.bgHover}`
              }`}
            >
              <span className={`font-medium ${color.texto}`}>{cuota.nombre}</span>
              <div className={`flex gap-6 ${color.textoApagado}`}>
                <span>{cuota.meses} {cuota.meses === 1 ? 'mes' : 'meses'}</span>
                <span>{formatearImporte(cuota.importe)}</span>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={guardar}
        disabled={guardando || !seleccionada}
        className={s.btnPrimary}
      >
        {guardando ? 'Guardando...' : 'Guardar cambio'}
      </button>

      {/* Resultado: si fue exitoso notifica al padre y cierra; si no, permite corregir */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => {
            if (resultado.exito) {
              onGuardar?.(resultado.datos)
              onClose()
            } else {
              setResultado(null)
            }
          }}
        />
      )}

    </ModalBase>
  )
}

export default ModalCambioCuota
