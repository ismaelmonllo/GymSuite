import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import ModalBase from './ModalBase'
import { color } from '../../styles'
import { formatearFecha } from '../../utils'

// Campos que no se grafican: identificadores, fechas, texto libre
const EXCLUIR = ['_id', 'cliente_id', 'entrenador_id', 'fecha', 'altura', 'observaciones', '__v']

// Color por clave — cada grupo usa una gama Tailwind coherente
// Se usan hex en vez de clases Tailwind porque Recharts pinta SVG, solo acepta colores CSS literales, no clases
const COLOR_POR_CLAVE = {
  // Peso (suelto): naranja del acento de la app
  peso: '#ea580c',                // orange-600

  // Pliegues — gama rojo/rosa 
  porcentaje_grasa: '#7f1d1d',    // red-900
  biceps:           '#fca5a5',    // red-300
  triceps:          '#db2777',    // pink-600
  subescapular:     '#fbcfe8',    // pink-200
  cresta_iliaca:    '#86198f',    // fuchsia-800

  // Torso superior — gama azul/cian
  cuello:    '#1e3a8a',           // blue-900
  hombros:   '#93c5fd',           // blue-300
  pecho_ins: '#0e7490',           // cyan-700
  pecho_exp: '#a5f3fc',           // cyan-200

  // Torso inferior — violeta oscuro vs púrpura claro
  cintura: '#6d28d9',             // violet-700
  cadera:  '#c084fc',             // purple-400

  // Brazo — ámbar oscuro vs amarillo claro
  brazo:     '#d97706',           // amber-600
  antebrazo: '#fde047',           // yellow-300

  // Pierna — esmeralda oscura vs lima
  muslo:  '#047857',              // emerald-700
  gemelo: '#84cc16',              // lime-500
}

// Fallback para claves desconocidas (huérfanas)
const COLOR_FALLBACK = '#737373'  // neutral-500

// Métricas que se muestran siempre, sin agrupar
const SUELTAS = ['peso']

// Secciones desplegables por zona corporal y pliegues
const GRUPOS = [
  { id: 'pliegues', label: 'Pliegues', claves: ['porcentaje_grasa', 'biceps', 'triceps', 'subescapular', 'cresta_iliaca'] },
  { id: 'torso_superior', label: 'Torso superior', claves: ['cuello', 'hombros', 'pecho_ins', 'pecho_exp'] },
  { id: 'torso_inferior', label: 'Torso inferior', claves: ['cintura', 'cadera'] },
  { id: 'brazo', label: 'Brazo', claves: ['brazo', 'antebrazo'] },
  { id: 'pierna', label: 'Pierna', claves: ['muslo', 'gemelo'] },
]

// Labels legibles para cada clave conocida de medición
const LABELS = {
  peso: 'Peso (kg)',
  porcentaje_grasa: '% grasa',
  cuello: 'Cuello (cm)',
  hombros: 'Hombros (cm)',
  pecho_ins: 'Pecho ins. (cm)',
  pecho_exp: 'Pecho exp. (cm)',
  cintura: 'Cintura (cm)',
  cadera: 'Cadera (cm)',
  muslo: 'Muslo (cm)',
  gemelo: 'Gemelo (cm)',
  brazo: 'Brazo (cm)',
  antebrazo: 'Antebrazo (cm)',
  biceps: 'Bíceps (mm)',
  triceps: 'Tríceps (mm)',
  subescapular: 'Subescapular (mm)',
  cresta_iliaca: 'Cresta ilíaca (mm)',
}

/**
 * Modal solo desktop con gráfica de evolución (Recharts) de mediciones de un cliente.
 * `titulo` se muestra tal cual en la cabecera (ej. "Evolución — Nombre Apellido").
 * `mediciones` llega ya cargado desde el padre — sin fetch interno.
 * Permite filtrar por rango de fechas y por métricas (con grupos colapsables).
 * @param {{titulo: string, mediciones: object[], onClose: () => void}} props
 * @returns {JSX.Element}
 */
function ModalGraficaMediciones({ titulo, mediciones, onClose }) {

  // Ordenar ascendente por fecha para que la gráfica vaya de izquierda a derecha
  const medicionesOrdenadas = useMemo(
    () => [...mediciones].sort((mA, mB) => new Date(mA.fecha) - new Date(mB.fecha)),
    [mediciones]
  )

  // Detectar dinámicamente las métricas: claves numéricas con al menos un valor presente
  const metricas = useMemo(() => {
    const claves = new Set()
    for (const medicion of medicionesOrdenadas) {
      for (const clave of Object.keys(medicion)) {
        if (EXCLUIR.includes(clave)) continue
        if (typeof medicion[clave] === 'number') claves.add(clave)
      }
    }
    return [...claves].map(clave => ({
      clave,
      label: LABELS[clave] ?? clave,
      color: COLOR_POR_CLAVE[clave] ?? COLOR_FALLBACK,
    }))
  }, [medicionesOrdenadas])

  // Fechas únicas en orden ascendente — alimentan los selects de rango
  const fechas = useMemo(
    () => medicionesOrdenadas.map(medicion => medicion.fecha),
    [medicionesOrdenadas]
  )

  // Mapa clave → metrica para renderizar dentro de los grupos sin volver a buscar
  const metricaPorClave = useMemo(() => {
    const mapa = {}
    for (const metrica of metricas) mapa[metrica.clave] = metrica
    return mapa
  }, [metricas])

  // Claves cubiertas por SUELTAS o algún GRUPO — las métricas detectadas que no encajen aquí se muestran al final
  const clavesEnEstructura = useMemo(
    () => new Set([...SUELTAS, ...GRUPOS.flatMap(grupo => grupo.claves)]),
    []
  )
  const huerfanas = metricas.filter(metrica => !clavesEnEstructura.has(metrica.clave))

  // Estado: métricas activas (mínimo 1) y rango de fechas completo por defecto
  const [activas, setActivas] = useState(() => metricas.slice(0, 2).map(metrica => metrica.clave))
  const [desde, setDesde] = useState(fechas[0] ?? '')
  const [hasta, setHasta] = useState(fechas[fechas.length - 1] ?? '')

  // Grupos abiertos — todos cerrados por defecto
  const [gruposAbiertos, setGruposAbiertos] = useState(() => new Set())
  /**
   * Alternar el estado abierto/cerrado de un grupo de métricas.
   * @param {string} id Identificador del grupo
   */
  const toggleGrupo = (id) => {
    setGruposAbiertos(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  /**
   * Alternar selección de una métrica garantizando que siempre quede al menos 1 activa.
   * @param {string} clave Clave de la métrica
   */
  const alternar = (clave) => {
    setActivas(prev => {
      if (prev.includes(clave)) {
        if (prev.length <= 1) return prev
        return prev.filter(claveActiva => claveActiva !== clave)
      }
      return [...prev, clave]
    })
  }

  /**
   * Cambiar la fecha "Desde"; si supera "Hasta", arrastra "Hasta" para mantener coherencia.
   * @param {string} nuevaFecha Fecha ISO YYYY-MM-DD
   */
  const cambiarDesde = (nuevaFecha) => {
    setDesde(nuevaFecha)
    if (hasta && new Date(nuevaFecha) > new Date(hasta)) setHasta(nuevaFecha)
  }

  // Filtrar al rango seleccionado
  const medicionesFiltradas = useMemo(() => {
    if (!desde || !hasta) return medicionesOrdenadas
    const inicio = new Date(desde).getTime()
    const fin = new Date(hasta).getTime()
    return medicionesOrdenadas.filter(medicion => {
      const tiempo = new Date(medicion.fecha).getTime()
      return tiempo >= inicio && tiempo <= fin
    })
  }, [medicionesOrdenadas, desde, hasta])

  // Transformar al formato que espera Recharts: un objeto por punto con fecha + valores por clave
  const datosGrafica = useMemo(
    () => medicionesFiltradas.map(medicion => ({
      fecha: formatearFecha(medicion.fecha),
      ...activas.reduce((acc, clave) => ({ ...acc, [clave]: medicion[clave] ?? null }), {})
    })),
    [medicionesFiltradas, activas]
  )

  return (
    // hidden md:flex — el modal solo se muestra en escritorio
    <div className="hidden md:flex">
      <ModalBase titulo={titulo} onClose={onClose} ancho="max-w-4xl">

        {/* Layout: columna izquierda (checkboxes) ocupa toda la altura; derecha contiene filtros + gráfica */}
        <div className="flex gap-4 min-h-100">

          {/* Columna izquierda: leyenda y selector unificados — arranca desde arriba */}
          <div className="w-44 shrink-0 flex flex-col gap-1 overflow-y-auto">

            {/* Selector general: marca/desmarca todas las métricas a la vez */}
            {(() => {
              const todasActivasGeneral = activas.length === metricas.length
              const ningunaActivaGeneral = activas.length === 0
              const toggleGeneral = () => {
                if (todasActivasGeneral) {
                  // Mantener al menos una activa
                  setActivas([metricas[0]?.clave].filter(Boolean))
                } else {
                  setActivas(metricas.map(metrica => metrica.clave))
                }
              }
              return (
                <label className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs font-semibold ${color.texto} ${color.bgHover} transition-colors border-b ${color.bordeHeader} pb-2 mb-1`}>
                  <input
                    type="checkbox"
                    checked={todasActivasGeneral}
                    ref={(elemento) => { if (elemento) elemento.indeterminate = !todasActivasGeneral && !ningunaActivaGeneral }}
                    onChange={toggleGeneral}
                    className="accent-orange-600 shrink-0"
                  />
                  <span className="flex-1 truncate">Todas</span>
                  <span className={`text-xs ${color.textoApagado}`}>{activas.length}/{metricas.length}</span>
                </label>
              )
            })()}

            {/* Métricas sueltas (peso, altura) — siempre visibles */}
            {SUELTAS.map(clave => {
              const metrica = metricaPorClave[clave]
              if (!metrica) return null
              const activa = activas.includes(clave)
              return (
                <label
                  key={clave}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${activa ? color.texto : color.textoApagado
                    } ${color.bgHover}`}
                >
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => alternar(clave)}
                    className="accent-orange-600 shrink-0"
                  />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metrica.color }} />
                  <span className="truncate">{metrica.label}</span>
                </label>
              )
            })}

            {/* Grupos desplegables */}
            {GRUPOS.map(grupo => {
              // Solo se renderizan claves con datos en las mediciones
              const clavesPresentes = grupo.claves.filter(clave => metricaPorClave[clave])
              if (clavesPresentes.length === 0) return null
              const abierto = gruposAbiertos.has(grupo.id)
              const activasGrupo = clavesPresentes.filter(clave => activas.includes(clave)).length
              const todasActivas = activasGrupo === clavesPresentes.length
              const ningunaActiva = activasGrupo === 0
              // Marcar/desmarcar todo el grupo respetando el mínimo de 1 métrica activa global
              const toggleGrupoSeleccion = () => {
                setActivas(prev => {
                  if (todasActivas) {
                    const restantes = prev.filter(clave => !clavesPresentes.includes(clave))
                    return restantes.length === 0 ? [prev[0]] : restantes
                  }
                  const aAnadir = clavesPresentes.filter(clave => !prev.includes(clave))
                  return [...prev, ...aAnadir]
                })
              }
              return (
                <div key={grupo.id} className="flex flex-col">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color.texto} ${color.bgHover} transition-colors`}>
                    <input
                      type="checkbox"
                      checked={todasActivas}
                      ref={(elemento) => { if (elemento) elemento.indeterminate = !todasActivas && !ningunaActiva }}
                      onChange={toggleGrupoSeleccion}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-orange-600 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => toggleGrupo(grupo.id)}
                      className="flex items-center gap-1 flex-1 min-w-0 text-left"
                    >
                      {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="flex-1 truncate">{grupo.label}</span>
                      {activasGrupo > 0 && (
                        <span className={`text-xs ${color.textoApagado}`}>{activasGrupo}</span>
                      )}
                    </button>
                  </div>
                  {abierto && (
                    <div className="flex flex-col gap-1 pl-3">
                      {clavesPresentes.map(clave => {
                        const metrica = metricaPorClave[clave]
                        const activa = activas.includes(clave)
                        return (
                          <label
                            key={clave}
                            className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${activa ? color.texto : color.textoApagado
                              } ${color.bgHover}`}
                          >
                            <input
                              type="checkbox"
                              checked={activa}
                              onChange={() => alternar(clave)}
                              className="accent-orange-600 shrink-0"
                            />
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metrica.color }} />
                            <span className="truncate">{metrica.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Métricas detectadas en datos pero no clasificadas en SUELTAS ni GRUPOS */}
            {huerfanas.map(metrica => {
              const activa = activas.includes(metrica.clave)
              return (
                <label
                  key={metrica.clave}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${activa ? color.texto : color.textoApagado
                    } ${color.bgHover}`}
                >
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => alternar(metrica.clave)}
                    className="accent-orange-600 shrink-0"
                  />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metrica.color }} />
                  <span className="truncate">{metrica.label}</span>
                </label>
              )
            })}

          </div>

          {/* Columna derecha: filtros de fecha arriba + gráfica debajo */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Rango de fechas alineado a la derecha */}
            <div className={`flex items-end justify-end gap-2 pb-4 border-b ${color.bordeHeader}`}>
              <div className="flex flex-col gap-1">
                <label className={`text-xs ${color.textoApagado}`}>Desde</label>
                <select
                  value={desde}
                  onChange={(e) => cambiarDesde(e.target.value)}
                  className={`${color.bgInput} border ${color.borde} rounded-md px-2 py-1 text-xs ${color.texto}`}
                >
                  {fechas.map(fecha => (
                    <option key={fecha} value={fecha}>{formatearFecha(fecha)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={`text-xs ${color.textoApagado}`}>Hasta</label>
                <select
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className={`${color.bgInput} border ${color.borde} rounded-md px-2 py-1 text-xs ${color.texto}`}
                >
                  {fechas.map(fecha => (
                    <option
                      key={fecha}
                      value={fecha}
                      disabled={desde ? new Date(fecha) < new Date(desde) : false}
                    >
                      {formatearFecha(fecha)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={datosGrafica} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#404040" strokeDasharray="3 3" />
                <XAxis dataKey="fecha" stroke="#a3a3a3" fontSize={11} />
                <YAxis stroke="#a3a3a3" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#262626', border: '1px solid #525252', borderRadius: 6 }}
                  labelStyle={{ color: '#ffedd5' }}
                />
                {activas.map(clave => {
                  const metrica = metricas.find(item => item.clave === clave)
                  if (!metrica) return null
                  return (
                    <Line
                      key={clave}
                      type="monotone"
                      dataKey={clave}
                      name={metrica.label}
                      stroke={metrica.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

      </ModalBase>
    </div>
  )
}

export default ModalGraficaMediciones
