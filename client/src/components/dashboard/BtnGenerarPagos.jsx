import { color } from '../../styles'

/**
 * Botón reutilizable para disparar la generación de pagos del mes.
 * Acepta className para variar visibilidad por breakpoint (p. ej. `sm:hidden`).
 * @param {{onClick: () => void, cargando: boolean, className?: string}} props
 * @returns {JSX.Element}
 */
function BtnGenerarPagos({ onClick, cargando, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className={`text-sm px-4 py-2 rounded-lg border ${color.borde} ${color.textoApagado} hover:text-orange-400 transition-colors disabled:opacity-40 ${className}`}
    >
      {cargando ? 'Generando...' : 'Generar pagos'}
    </button>
  )
}

export default BtnGenerarPagos
