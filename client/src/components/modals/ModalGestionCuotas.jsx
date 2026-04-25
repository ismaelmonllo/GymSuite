import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import ModalBase from './ModalBase'
import ModalConfirmacion from './ModalConfirmacion'
import api from '../../services/api'
import { color, s } from '../../styles'

// Cargar cuotas existentes, permitir edición inline, añadir nuevas y borrar
function ModalGestionCuotas({ onClose }) {
  const [cuotas, setCuotas]                         = useState([])
  const [cuotasOriginales, setCuotasOriginales]     = useState([])
  const [cargando, setCargando]                     = useState(true)
  const [guardando, setGuardando]                   = useState(false)
  const [errorValidacion, setErrorValidacion]       = useState(null)
  const [confirmacionCierre, setConfirmacionCierre]   = useState(false)
  const [confirmacionBorrar, setConfirmacionBorrar]   = useState(null) // índice de la cuota pendiente de borrar
  const [resultadoGuardado, setResultadoGuardado]     = useState(null) // { exitosas: [], fallidas: [] }
  const listaRef = useRef(null)

  // Cargar cuotas al abrir el modal; guardar también una copia original para detectar cambios al guardar
  useEffect(() => {
    api.get('/api/cuotas')
      .then(res => {
        const data = res.data.cuotas ?? []
        setCuotas(data)
        setCuotasOriginales(data)
      })
      .catch(err => console.error('Error cargando cuotas:', err))
      .finally(() => setCargando(false))
  }, [])

  // Comprobar si hay cambios pendientes sin guardar respecto al estado original
  const hayCambiosPendientes = () => {
    const hayEliminadas = cuotasOriginales.some(
      orig => !cuotas.find(cuota => cuota._id === orig._id)
    )
    if (hayEliminadas) return true
    return cuotas.some(cuota => {
      if (!cuota._id) return true
      const original = cuotasOriginales.find(orig => orig._id === cuota._id)
      return JSON.stringify(cuota) !== JSON.stringify(original)
    })
  }

  // Interceptar el cierre: si hay cambios pendientes mostrar confirmación, si no cerrar directamente
  const handleClose = () => {
    if (guardando) return
    if (hayCambiosPendientes()) {
      setConfirmacionCierre(true)
    } else {
      onClose()
    }
  }

  // Actualizar un campo de una cuota en el estado local
  const actualizarCampo = (index, campo, valor) => {
    setCuotas(prev => prev.map((cuota, i) => i === index ? { ...cuota, [campo]: valor } : cuota))
  }

  // Quitar cuota del estado local — el DELETE real se ejecuta al guardar
  const borrarCuota = (index) => {
    setCuotas(prev => prev.filter((_cuota, i) => i !== index))
  }

  // Añadir card vacía al estado local y bajar el scroll para que sea visible
  const nuevaCuota = () => {
    setCuotas(prev => [...prev, { nombre: '', meses: '', importe: '' }])
    setTimeout(() => {
      if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
    }, 0)
  }

  // Persistir todos los cambios en la API y mostrar el resultado operación por operación
  const guardar = async () => {
    // Validar que todas las cuotas tengan los tres campos rellenos antes de llamar a la API
    const invalidas = cuotas.filter(cuota => !cuota.nombre.trim() || !cuota.meses || !cuota.importe)
    if (invalidas.length > 0) {
      setErrorValidacion('Todas las cuotas deben tener nombre, meses e importe.')
      return
    }
    setErrorValidacion(null)
    setGuardando(true)

    try {
      // Cuotas que estaban antes pero ya no están en el estado local → eliminar en la API
      const eliminadas = cuotasOriginales.filter(
        orig => !cuotas.find(cuota => cuota._id === orig._id)
      )

      // Cuotas nuevas (sin _id) o modificadas respecto al original
      const aGuardar = cuotas.filter(cuota => {
        if (!cuota._id) return true
        const original = cuotasOriginales.find(orig => orig._id === cuota._id)
        return JSON.stringify(cuota) !== JSON.stringify(original)
      })

      // Construir lista de operaciones etiquetadas para poder informar del resultado individualmente
      const operaciones = [
        ...eliminadas.map(cuota => ({
          label: `Eliminar "${cuota.nombre}"`,
          promesa: api.delete(`/api/cuotas/${cuota._id}`)
        })),
        ...aGuardar.map(cuota => ({
          label: cuota._id ? `Editar "${cuota.nombre}"` : `Crear "${cuota.nombre}"`,
          promesa: cuota._id
            ? api.put(`/api/cuotas/${cuota._id}`, cuota)
            : api.post('/api/cuotas', cuota)
        }))
      ]

      // Ejecutar todas en paralelo sin abortar si alguna falla individualmente
      const resultados = await Promise.allSettled(operaciones.map(op => op.promesa))

      const exitosas = operaciones
        .filter((_, i) => resultados[i].status === 'fulfilled')
        .map(op => op.label)
      const fallidas = operaciones
        .filter((_, i) => resultados[i].status === 'rejected')
        .map(op => op.label)

      setResultadoGuardado({ exitosas, fallidas })
    } catch (err) {
      console.error('Error inesperado al guardar:', err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalBase titulo="Gestionar cuotas" onClose={handleClose}>

      {/* Lista de cards de cuotas */}
      <div ref={listaRef} className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
        {cargando ? (
          <p className={color.textoApagado}>Cargando...</p>
        ) : (
          cuotas.map((cuota, i) => (
            <div
              key={cuota._id ?? `nueva-${i}`}
              className={`${s.card} rounded-lg p-4 flex gap-3 items-center`}
            >
              <input
                className={`${s.input} flex-1 min-w-0`}
                placeholder="Nombre"
                value={cuota.nombre}
                onChange={e => actualizarCampo(i, 'nombre', e.target.value)}
              />
              <input
                className={`${s.input} w-24 text-center`}
                placeholder="Meses"
                type="number"
                min="1"
                value={cuota.meses}
                onChange={e => actualizarCampo(i, 'meses', e.target.value)}
              />
              <input
                className={`${s.input} w-24 text-center`}
                placeholder="€"
                type="number"
                min="0"
                step="0.01"
                value={cuota.importe}
                onChange={e => actualizarCampo(i, 'importe', e.target.value)}
              />
              <button
                onClick={() => setConfirmacionBorrar(i)}
                className={`${color.textoApagado} hover:text-red-400 transition-colors shrink-0`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Error de validación */}
      {errorValidacion && (
        <p className={`text-sm ${color.error}`}>{errorValidacion}</p>
      )}

      {/* Añadir nueva cuota */}
      <button
        onClick={nuevaCuota}
        className={`border border-dashed ${color.borde} ${color.textoApagado} hover:${color.texto} rounded-lg py-3 transition-colors`}
      >
        + Nueva cuota
      </button>

      {/* Guardar todos los cambios */}
      <button
        onClick={guardar}
        disabled={guardando}
        className={s.btnPrimary}
      >
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {/* Confirmación antes de borrar una cuota */}
      {confirmacionBorrar !== null && (
        <ModalConfirmacion
          mensaje={`¿Eliminar la cuota "${cuotas[confirmacionBorrar]?.nombre || 'sin nombre'}"?`}
          textoConfirmar="Eliminar"
          peligro
          onConfirmar={() => { borrarCuota(confirmacionBorrar); setConfirmacionBorrar(null) }}
          onCancelar={() => setConfirmacionBorrar(null)}
        />
      )}

      {/* Confirmación al intentar cerrar con cambios pendientes */}
      {confirmacionCierre && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative z-10 w-full max-w-sm mx-4 rounded-xl ${s.card} p-6 flex flex-col gap-4`}>
            <p className={`text-sm ${color.texto}`}>
              Tienes cambios sin guardar. ¿Seguro que quieres cerrar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmacionCierre(false)}
                className={`flex-1 py-2 rounded-lg border ${color.borde} ${color.texto} ${color.bgHover} transition-colors`}
              >
                Seguir editando
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Descartar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado del guardado: lista de operaciones exitosas y fallidas */}
      {resultadoGuardado && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative z-10 w-full max-w-sm mx-4 rounded-xl ${s.card} p-6 flex flex-col gap-4`}>
            <h3 className={`font-semibold ${color.texto}`}>Resultado</h3>

            {resultadoGuardado.exitosas.length > 0 && (
              <div className="flex flex-col gap-1">
                {resultadoGuardado.exitosas.map(op => (
                  <p key={op} className="text-sm text-green-400">✓ {op}</p>
                ))}
              </div>
            )}

            {resultadoGuardado.fallidas.length > 0 && (
              <div className="flex flex-col gap-1">
                {resultadoGuardado.fallidas.map(op => (
                  <p key={op} className={`text-sm ${color.error}`}>✗ {op}</p>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                // Si todo fue exitoso cerrar también el modal de gestión; si no, quedarse para reintentar
                if (resultadoGuardado.fallidas.length === 0) {
                  onClose()
                } else {
                  setResultadoGuardado(null)
                }
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

export default ModalGestionCuotas
