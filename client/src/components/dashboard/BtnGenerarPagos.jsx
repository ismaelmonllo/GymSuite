import { color } from '../../styles'

// Botón de generar pagos reutilizable; acepta className para añadir sm:hidden en móvil
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
