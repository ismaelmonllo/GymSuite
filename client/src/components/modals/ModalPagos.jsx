import { useState, useEffect } from 'react'
import { CheckCircle, Clock } from 'lucide-react'
import ModalBase from './ModalBase'
import ModalCambioCuota from './ModalCambioCuota'
import ModalResultado from './ModalResultado'
import ModalConfirmarPago from './ModalConfirmarPago'
import api from '../../services/api'
import { color } from '../../styles'
import { formatearImporte } from '../../utils'

// Icono según si el pago está confirmado o pendiente
const iconoPago = (pendiente) =>
  pendiente
    ? <Clock size={16} className="text-red-400 shrink-0" />
    : <CheckCircle size={16} className="text-green-400 shrink-0" />

// Agrupar array de pagos por grupo_pago preservando el orden de llegada
const agruparPorGrupo = (pagos) => {
  const map = new Map()
  for (const pago of pagos) {
    const key = pago.grupo_pago ?? pago._id
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(pago)
  }
  return [...map.values()]
}

// Historial de pagos de un cliente: cuota actual, botones de acción e historial agrupado
// soloLectura: modo cliente — usa /api/pagos/mis-pagos y oculta botones de empleado
// bloqueadoEdicion: empleado viendo a un cliente en baja — usa endpoint de empleado pero oculta acciones de edición
function ModalPagos({ cliente, cuotas = [], onClose, onPagoConfirmado, onCuotaCambiada, soloLectura = false, bloqueadoEdicion = false }) {
  const [pagos, setPagos]             = useState([])
  const [cargando, setCargando]       = useState(true)
  const [registrando, setRegistrando]       = useState(false)
  const [resultado, setResultado]           = useState(null)  // { exito: bool, mensaje: string }
  const [modalCuota, setModalCuota]         = useState(false)
  const [confirmando, setConfirmando]       = useState(false)

  // Cargar historial: ruta propia del cliente o ruta de empleado según el modo
  useEffect(() => {
    const endpoint = soloLectura
      ? '/api/pagos/mis-pagos'
      : `/api/pagos/cliente/${cliente._id}`
    api.get(endpoint)
      .then(res => setPagos(res.data))
      .catch(err => {
        // 404 significa sin pagos aún; cualquier otro error se registra
        if (err.response?.status !== 404) console.error('Error cargando pagos:', err)
      })
      .finally(() => setCargando(false))
  }, [cliente._id, soloLectura])

  // En modo soloLectura la cuota ya viene populada en el objeto cliente
  const cuotaActual = soloLectura
    ? cliente.tipo_cuota
    : cuotas.find(cuota => cuota._id === (cliente.tipo_cuota?._id ?? cliente.tipo_cuota))

  // Primer pago pendiente (para saber si hay algo que confirmar)
  const primerPendiente = pagos.find(pago => pago.pendiente)

  // Estado del último pago para la fila de info superior
  const estadoUltimo = pagos.length > 0
    ? (pagos[0].pendiente ? 'Pendiente' : 'Confirmado')
    : '—'

  // Pagos agrupados por grupo_pago para renderizar juntos los meses de una misma cuota
  const grupos = agruparPorGrupo(pagos)

  // Confirmar todos los pagos del grupo pendiente más reciente y refrescar la lista
  const registrarPago = async () => {
    if (!primerPendiente) return
    setRegistrando(true)
    try {
      await api.post('/api/pagos/registrar', { grupo_pago: primerPendiente.grupo_pago })
      const res = await api.get(`/api/pagos/cliente/${cliente._id}`)
      setPagos(res.data)
      onPagoConfirmado?.()
      setResultado({ exito: true, mensaje: 'Pago registrado correctamente.' })
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo registrar el pago.' })
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <ModalBase titulo={`Pagos ${cliente.nombre} ${cliente.apellidos}`} onClose={onClose}>

      {/* Fila de info: cuota actual + importe + estado del último pago */}
      <div className={`flex rounded-lg border ${color.borde} overflow-hidden text-sm`}>
        <div className={`flex-1 min-w-0 px-4 py-3 flex flex-col gap-0.5 border-r ${color.borde}`}>
          <span className={color.textoApagado}>Tipo cuota</span>
          <span className={`font-medium ${color.texto} truncate`}>{cuotaActual?.nombre ?? '—'}</span>
        </div>
        <div className={`flex-1 min-w-0 px-4 py-3 flex flex-col gap-0.5 border-r ${color.borde}`}>
          <span className={color.textoApagado}>Importe</span>
          <span className={`font-medium ${color.texto}`}>{cuotaActual ? formatearImporte(cuotaActual.importe) : '—'}</span>
        </div>
        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col gap-0.5">
          <span className={color.textoApagado}>Estado</span>
          <span className={`font-medium ${pagos[0]?.pendiente ? 'text-red-400' : 'text-green-400'}`}>
            {estadoUltimo}
          </span>
        </div>
      </div>

      {/* Botones de acción — solo visibles para empleados con cliente activo */}
      {!soloLectura && !bloqueadoEdicion && (
        <div className="flex gap-3">
          <button
            onClick={() => setModalCuota(true)}
            className={`flex-1 py-2 rounded-lg border ${color.borde} ${color.texto} ${color.bgHover} text-sm transition-colors`}
          >
            Cambiar cuota
          </button>
          <button
            onClick={() => setConfirmando(true)}
            disabled={registrando || !primerPendiente}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              primerPendiente
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : `border ${color.borde} ${color.textoApagado} opacity-50 cursor-not-allowed`
            }`}
          >
            {registrando ? 'Registrando...' : '+ Registrar pago'}
          </button>
        </div>
      )}

      {/* Historial agrupado: cada grupo_pago en su propio contenedor */}
      <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1">
        {cargando ? (
          <p className={`text-sm ${color.textoApagado}`}>Cargando...</p>
        ) : grupos.length === 0 ? (
          <p className={`text-sm ${color.textoApagado}`}>No hay pagos registrados.</p>
        ) : (
          grupos.map((grupo, gi) => (
            <div
              key={String(grupo[0].grupo_pago ?? gi)}
              className={`rounded-lg border ${color.borde}`}
            >
              {grupo.map((pago, i) => (
                <div
                  key={pago._id}
                  className={`px-4 py-3 text-sm ${color.bgCard} ${
                    i > 0 ? `border-t ${color.bordeHeader}` : ''
                  } ${i === 0 ? 'rounded-t-lg' : ''} ${i === grupo.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  {/* Línea 1: icono + mes — importe */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {iconoPago(pago.pendiente)}
                      <span className={`font-medium ${color.texto}`}>{pago.mes}</span>
                    </div>
                    <span className={`shrink-0 font-medium ${color.texto}`}>{formatearImporte(pago.importe)}</span>
                  </div>
                  {/* Línea 2: tipo cuota — estado */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className={`text-xs ${color.textoApagado} truncate`}>{pago.tipo_cuota}</span>
                    <span className={`shrink-0 text-xs ${pago.pendiente ? 'text-red-400' : 'text-green-400'}`}>
                      {pago.pendiente ? 'Pendiente' : 'Confirmado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Resultado de registrar pago */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => setResultado(null)}
        />
      )}

      {/* Confirmación antes de registrar pago: muestra resumen del pago pendiente */}
      {confirmando && primerPendiente && (
        <ModalConfirmarPago
          cliente={cliente}
          pago={primerPendiente}
          cuota={cuotaActual}
          onConfirmar={() => { setConfirmando(false); registrarPago() }}
          onCancelar={() => setConfirmando(false)}
        />
      )}

      {/* Modal de cambio de cuota anidado */}
      {modalCuota && (
        <ModalCambioCuota
          cliente={cliente}
          cuotas={cuotas}
          onClose={() => setModalCuota(false)}
          onGuardar={(clienteActualizado) => {
            onCuotaCambiada?.(clienteActualizado)
            setModalCuota(false)
          }}
        />
      )}

    </ModalBase>
  )
}

export default ModalPagos
