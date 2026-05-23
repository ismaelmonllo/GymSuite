import { ChevronLeft, ChevronRight } from 'lucide-react'
import { color, s } from '../../styles'

/**
 * Campo de fecha de solo lectura con flechas integradas para navegar entre fechas.
 * La fecha se muestra formateada como DD/MM/YYYY; las flechas se desactivan vía puedeAnterior/puedeSiguiente.
 * @param {{fecha: string, puedeAnterior: boolean, puedeSiguiente: boolean, onAnterior: () => void, onSiguiente: () => void}} props
 * @returns {JSX.Element}
 */
function StepperFecha({ fecha, puedeAnterior, puedeSiguiente, onAnterior, onSiguiente }) {
  // Formatear la fecha YYYY-MM-DD a DD/MM/YYYY interpretándola en hora local (no UTC)
  const fechaFormateada = fecha
    ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES')
    : '—'

  return (
    <div className="relative">
      <div className={`${s.input} w-full text-center px-10 opacity-60 cursor-default`}>
        {fechaFormateada}
      </div>
      <button
        type="button"
        onClick={onAnterior}
        disabled={!puedeAnterior}
        className={`absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded ${color.texto} ${color.bgHover} disabled:opacity-30 disabled:hover:bg-transparent transition-colors`}
        title="Anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={onSiguiente}
        disabled={!puedeSiguiente}
        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded ${color.texto} ${color.bgHover} disabled:opacity-30 disabled:hover:bg-transparent transition-colors`}
        title="Siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export default StepperFecha
