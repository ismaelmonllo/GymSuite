import { color, s } from '../../styles'

// Card clickable para el dashboard del cliente. Muestra una cabecera con icono + título y contenido libre debajo
function CardDashboard({ icono: Icono, titulo, onClick, className = '', children }) {
  // Permitir activar la card también con teclado (Enter o espacio) para accesibilidad
  const manejarTecla = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={manejarTecla}
      className={`${s.card} rounded-xl p-6 text-left hover:border-orange-600 transition-colors cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icono size={18} className={color.textoAcento} />
        <span className={`${color.textoAcento} font-semibold text-sm uppercase tracking-wide`}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}

export default CardDashboard
