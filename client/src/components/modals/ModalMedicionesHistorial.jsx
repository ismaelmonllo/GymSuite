import { useState, useEffect } from 'react'
import { Eye, Pencil, Trash2, Plus } from 'lucide-react'
import ModalBase from './ModalBase'
import ModalConfirmacion from './ModalConfirmacion'
import ModalResultado from './ModalResultado'
import ModalMedicionCompleto from './ModalMedicionCompleto'
import api from '../../services/api'
import { color } from '../../styles'
import { useAuth } from '../../hooks/useAuth'

// Formatear fecha ISO a DD/MM/YYYY interpretando la fecha en hora local (no UTC)
const formatearFecha = (fecha) => new Date(String(fecha).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-ES')

// Historial de mediciones de un cliente: tabla en desktop, cards en móvil
// soloLectura: modo cliente — usa /api/mediciones y oculta botones de empleado
// medicionesIniciales: si se pasan, se usan directamente sin hacer fetch (evita doble carga)
function ModalMedicionesHistorial({ cliente, onClose, soloLectura = false, medicionesIniciales = null }) {
  const { usuario } = useAuth()
  const esEmpleado = usuario.rol === 'admin' || usuario.rol === 'entrenador'

  const [mediciones, setMediciones]           = useState(medicionesIniciales ?? [])
  const [cargando, setCargando]               = useState(medicionesIniciales === null)
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(null)  // medicion seleccionada para borrar
  const [borrando, setBorrando]               = useState(false)
  const [resultado, setResultado]             = useState(null)

  const [medicionSeleccionada, setMedicionSeleccionada] = useState(null)
  const [modoModal, setModoModal]             = useState(null)  // 'ver' | 'editar' | 'nueva'

  // Cargar historial: ruta propia del cliente o ruta de empleado según el modo
  // Si ya se pasaron medicionesIniciales (modo cliente desde el dashboard), se salta el fetch
  useEffect(() => {
    if (medicionesIniciales !== null) return
    const endpoint = soloLectura
      ? '/api/mediciones'
      : `/api/mediciones/cliente/${cliente._id}`
    api.get(endpoint)
      .then(res => setMediciones(res.data))
      .catch(err => {
        if (err.response?.status !== 404) console.error('Error cargando mediciones:', err)
      })
      .finally(() => setCargando(false))
  }, [cliente._id, soloLectura])

  // Eliminar medición y actualizar la lista localmente
  const borrarMedicion = async () => {
    if (!confirmandoBorrar) return
    setBorrando(true)
    try {
      await api.delete(`/api/mediciones/${confirmandoBorrar._id}`)
      setMediciones(prev => prev.filter(medicion => medicion._id !== confirmandoBorrar._id))
      setConfirmandoBorrar(null)
      setResultado({ exito: true, mensaje: 'Medición eliminada correctamente.' })
    } catch (err) {
      setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'No se pudo eliminar la medición.' })
    } finally {
      setBorrando(false)
    }
  }

  // Abrir ModalMedicionCompleto en modo ver
  const abrirVer = (medicion) => {
    setMedicionSeleccionada(medicion)
    setModoModal('ver')
  }

  // Abrir ModalMedicionCompleto en modo editar
  const abrirEditar = (medicion) => {
    setMedicionSeleccionada(medicion)
    setModoModal('editar')
  }

  // Abrir ModalMedicionCompleto en modo nueva; pasa la última medición para usarla como placeholder
  const abrirNueva = () => {
    setMedicionSeleccionada(mediciones[0] ?? null)
    setModoModal('nueva')
  }

  return (
    <ModalBase titulo={`Mediciones — ${cliente.nombre} ${cliente.apellidos}`} onClose={onClose}>

      {/* Botón nueva medición (solo empleados) */}
      {esEmpleado && (
        <button
          onClick={abrirNueva}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white transition-colors"
        >
          <Plus size={16} />
          Nueva medición
        </button>
      )}

      {/* Contenido */}
      <div className="max-h-[55vh] overflow-y-auto">
        {cargando ? (
          <p className={`text-sm ${color.textoApagado}`}>Cargando...</p>
        ) : mediciones.length === 0 ? (
          <p className={`text-sm ${color.textoApagado}`}>No hay mediciones registradas.</p>
        ) : (
          <>
            {/* Tabla — desktop */}
            <table className="hidden sm:table w-full text-sm border-collapse">
              <thead>
                <tr className={`border-b ${color.bordeHeader}`}>
                  <th className={`text-left pb-3 font-medium ${color.textoApagado}`}>Fecha</th>
                  <th className={`text-right pb-3 font-medium ${color.textoApagado}`}>Peso</th>
                  <th className={`text-right pb-3 font-medium ${color.textoApagado}`}>Altura</th>
                  <th className={`text-right pb-3 font-medium ${color.textoApagado}`}>% Grasa</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {mediciones.map(medicion => (
                  <tr key={medicion._id} className={`border-b ${color.bordeHeader} last:border-0`}>
                    <td className={`py-3 ${color.texto}`}>{formatearFecha(medicion.fecha)}</td>
                    <td className={`py-3 text-right ${color.texto}`}>{medicion.peso} kg</td>
                    <td className={`py-3 text-right ${color.texto}`}>{medicion.altura} cm</td>
                    <td className={`py-3 text-right ${color.texto}`}>
                      {medicion.porcentaje_grasa != null ? `${medicion.porcentaje_grasa} %` : '—'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => abrirVer(medicion)}
                          className={`${color.textoApagado} hover:text-orange-100 transition-colors`}
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        {esEmpleado && (
                          <>
                            <button
                              onClick={() => abrirEditar(medicion)}
                              className={`${color.textoApagado} hover:text-orange-100 transition-colors`}
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setConfirmandoBorrar(medicion)}
                              className="text-neutral-500 hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards — móvil */}
            <div className="sm:hidden flex flex-col gap-2">
              {mediciones.map(medicion => (
                <div key={medicion._id} className={`rounded-lg border ${color.borde} p-3 flex flex-col gap-2`}>
                  {/* Fila superior: fecha + acciones */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${color.texto}`}>{formatearFecha(medicion.fecha)}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => abrirVer(medicion)}
                        className={`${color.textoApagado} hover:text-orange-100 transition-colors`}
                      >
                        <Eye size={16} />
                      </button>
                      {esEmpleado && (
                        <>
                          <button
                            onClick={() => abrirEditar(medicion)}
                            className={`${color.textoApagado} hover:text-orange-100 transition-colors`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmandoBorrar(medicion)}
                            className="text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Fila inferior: datos principales */}
                  <div className={`flex gap-4 text-xs ${color.textoApagado}`}>
                    <span>{medicion.peso} kg</span>
                    <span>{medicion.altura} cm</span>
                    <span>
                      {medicion.porcentaje_grasa != null ? `${medicion.porcentaje_grasa}% grasa` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmación de borrado */}
      {confirmandoBorrar && (
        <ModalConfirmacion
          mensaje={`¿Eliminar la medición del ${formatearFecha(confirmandoBorrar.fecha)}?`}
          textoConfirmar={borrando ? 'Eliminando...' : 'Eliminar'}
          onConfirmar={borrarMedicion}
          onCancelar={() => setConfirmandoBorrar(null)}
          peligro
        />
      )}

      {/* Resultado de la operación */}
      {resultado && (
        <ModalResultado
          exito={resultado.exito}
          mensaje={resultado.mensaje}
          onCerrar={() => setResultado(null)}
        />
      )}

      {(medicionSeleccionada || modoModal === 'nueva') && (
        <ModalMedicionCompleto
          cliente={cliente}
          medicion={medicionSeleccionada}
          modoInicial={modoModal}
          onClose={() => { setMedicionSeleccionada(null); setModoModal(null) }}
          onGuardado={(medicionActualizada) => {
            if (modoModal === 'nueva') {
              setMediciones(prev => [medicionActualizada, ...prev])
            } else {
              setMediciones(prev => prev.map(medicion => medicion._id === medicionActualizada._id ? medicionActualizada : medicion))
            }
            setMedicionSeleccionada(null)
            setModoModal(null)
          }}
        />
      )}

    </ModalBase>
  )
}

export default ModalMedicionesHistorial
