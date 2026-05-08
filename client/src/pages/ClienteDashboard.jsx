import { useEffect, useState } from 'react'
import { User, CreditCard, Activity, Eye } from 'lucide-react'
import Header from '../components/layout/Header'
import Badge from '../components/ui/Badge'
import CardDashboard from '../components/dashboard/CardDashboard'
import ModalUsuario from '../components/modals/ModalUsuario'
import ModalPagos from '../components/modals/ModalPagos'
import ModalMedicionesHistorial from '../components/modals/ModalMedicionesHistorial'
import ModalMedicionCompleto from '../components/modals/ModalMedicionCompleto'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import { color } from '../styles'
import { formatearFecha } from '../utils'

// Formatear fecha_alta como "Cliente desde Oct. 2020"
const formatearDesde = (fecha) => {
  if (!fecha) return ''
  const d = new Date(fecha)
  const fechaStr = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
  return `Cliente desde ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)}`
}

// Calcular diferencia entre dos valores numéricos; devuelve null si no hay datos suficientes
const calcularDelta = (ultimo, anterior) => {
  if (anterior == null || ultimo == null) return null
  const diff = +(ultimo - anterior).toFixed(1)
  if (diff === 0) return null
  return { signo: diff > 0 ? '▲' : '▼', valor: Math.abs(diff), arriba: diff > 0 }
}

const mesActual = new Date().toISOString().slice(0, 7)

function ClienteDashboard() {
  const { usuario, logout } = useAuth()

  const [perfil, setPerfil]                   = useState(null)
  const [pagos, setPagos]                     = useState([])
  const [mediciones, setMediciones]           = useState([])
  const [cargando, setCargando]               = useState(true)
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false)
  const [modalPagosAbierto, setModalPagos]         = useState(false)
  const [modalMedicionesAbierto, setModalMediciones] = useState(false)
  const [modalUltimaMedicion, setModalUltimaMedicion] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar perfil, pagos y mediciones en paralelo
        const [resPerfil, resPagos, resMediciones] = await Promise.allSettled([
          api.get('/api/clientes/perfil'),
          api.get('/api/pagos/mis-pagos'),
          api.get('/api/mediciones'),
        ])

        if (resPerfil.status === 'fulfilled')    setPerfil(resPerfil.value.data.cliente)
        if (resPagos.status === 'fulfilled')     setPagos(resPagos.value.data)
        if (resMediciones.status === 'fulfilled') setMediciones(resMediciones.value.data)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [])

  // Estado del pago del mes en curso
  // Si hay varios pagos para este mes (caso de cambio de cuota mid-mes), prevalece el confirmado
  const pagosMesActual = pagos.filter(pago => pago.mes === mesActual)
  const pagoMesActual  = pagosMesActual.find(pago => !pago.pendiente) ?? pagosMesActual[0]
  const estadoPago = pagoMesActual
    ? (pagoMesActual.pendiente ? 'pendiente' : 'confirmado')
    : 'no-generado'

  // Último pago confirmado para mostrar su fecha
  const ultimoPagoConfirmado = pagos.find(pago => !pago.pendiente)

  // Mes más alto entre pagos confirmados; indica hasta cuándo está cubierta la cuota actual
  const mesesPagados = pagos.filter(pago => !pago.pendiente).map(pago => pago.mes)
  const mesVencimiento = mesesPagados.length ? mesesPagados.sort().at(-1) : null

  // Convertir "YYYY-MM" en el último día de ese mes (ej. "2026-05" → 31/5/2026)
  // Usar día 0 del mes siguiente para obtener el último día del mes indicado
  const calcularUltimoDia = (mes) => {
    if (!mes) return null
    const [anio, m] = mes.split('-').map(Number)
    return new Date(anio, m, 0)
  }

  // Última y penúltima medición para calcular deltas
  const ultimaMedicion    = mediciones[0] ?? null
  const penultimaMedicion = mediciones[1] ?? null

  const deltaPeso  = calcularDelta(ultimaMedicion?.peso, penultimaMedicion?.peso)
  const deltaGrasa = calcularDelta(ultimaMedicion?.porcentaje_grasa, penultimaMedicion?.porcentaje_grasa)

  const subtitulo = perfil ? formatearDesde(perfil.fecha_alta) : ''

  if (cargando) {
    return (
      <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
        <Header usuario={usuario} subtitulo="" onLogout={logout} />
        <div className="flex-1 flex items-center justify-center">
          <span className={color.textoApagado}>Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${color.bgPagina} flex flex-col`}>
      <Header usuario={usuario} subtitulo={subtitulo} onLogout={logout} onAvatarClick={() => setModalPerfilAbierto(true)} />

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Card Perfil */}
          <CardDashboard icono={User} titulo="Perfil" onClick={() => setModalPerfilAbierto(true)}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${color.texto} font-semibold`}>
                  {perfil?.nombre} {perfil?.apellidos}
                </span>
                {perfil?.nivel && <Badge variante={perfil.nivel}>{perfil.nivel}</Badge>}
              </div>
              <span className={`${color.textoApagado} text-sm`}>{perfil?.correo}</span>
              <span className={`${color.textoApagado} text-sm`}>{perfil?.telefono ?? '—'}</span>
            </div>
          </CardDashboard>

          {/* Card Pagos */}
          <CardDashboard icono={CreditCard} titulo="Pagos" onClick={() => setModalPagos(true)}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${color.textoApagado} text-sm`}>Estado</span>
                <Badge variante={estadoPago}>
                  {estadoPago === 'confirmado' ? 'Confirmado' : estadoPago === 'pendiente' ? 'Pendiente' : 'No generado'}
                </Badge>
              </div>
              <span className={`${color.textoApagado} text-sm`}>
                Último pago: {ultimoPagoConfirmado ? formatearFecha(ultimoPagoConfirmado.fecha) : '—'}
              </span>
              <span className={`${color.textoApagado} text-sm`}>
                Cubierto hasta: {formatearFecha(calcularUltimoDia(mesVencimiento))}
              </span>
            </div>
          </CardDashboard>

          {/* Card Mediciones — centrada en desktop */}
          <div className="sm:col-span-2 flex justify-center w-full">
            <CardDashboard
              icono={Activity}
              titulo="Mediciones"
              onClick={() => setModalMediciones(true)}
              className="w-full sm:max-w-sm"
            >
              {!ultimaMedicion ? (
                <span className={`${color.textoApagado} text-sm`}>Sin mediciones registradas</span>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className={`${color.textoApagado} text-xs`}>
                    Última: {formatearFecha(ultimaMedicion.fecha)}
                  </span>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <span className={`${color.textoApagado} text-xs block`}>Peso</span>
                      <span className={`${color.texto} font-semibold`}>{ultimaMedicion.peso} kg</span>
                      {deltaPeso && (
                        <span className={`text-xs ml-1 ${deltaPeso.arriba ? 'text-orange-400' : 'text-green-400'}`}>
                          {deltaPeso.signo}{deltaPeso.valor}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className={`${color.textoApagado} text-xs block`}>Altura</span>
                      <span className={`${color.texto} font-semibold`}>{ultimaMedicion.altura} cm</span>
                    </div>
                    <div>
                      <span className={`${color.textoApagado} text-xs block`}>Grasa</span>
                      <span className={`${color.texto} font-semibold`}>{ultimaMedicion.porcentaje_grasa} %</span>
                      {deltaGrasa && (
                        <span className={`text-xs ml-1 ${deltaGrasa.arriba ? 'text-red-400' : 'text-green-400'}`}>
                          {deltaGrasa.signo}{deltaGrasa.valor}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setModalUltimaMedicion(true) }}
                      className={`${color.textoApagado} hover:text-orange-100 transition-colors`}
                      title="Ver detalle"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                </div>
              )}
            </CardDashboard>
          </div>

        </div>
      </main>

      {modalPerfilAbierto && perfil && (
        <ModalUsuario
          usuario={perfil}
          soloLectura
          onClose={() => setModalPerfilAbierto(false)}
        />
      )}

      {modalPagosAbierto && perfil && (
        <ModalPagos
          cliente={perfil}
          soloLectura
          onClose={() => setModalPagos(false)}
        />
      )}

      {modalMedicionesAbierto && perfil && (
        <ModalMedicionesHistorial
          cliente={perfil}
          soloLectura
          medicionesIniciales={mediciones}
          onClose={() => setModalMediciones(false)}
        />
      )}

      {modalUltimaMedicion && perfil && ultimaMedicion && (
        <ModalMedicionCompleto
          cliente={perfil}
          medicion={ultimaMedicion}
          modoInicial="ver"
          onClose={() => setModalUltimaMedicion(false)}
        />
      )}
    </div>
  )
}

export default ClienteDashboard
