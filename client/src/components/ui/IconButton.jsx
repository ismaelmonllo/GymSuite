import { Loader2 } from 'lucide-react'
import { color } from '../../styles'

// Botón de icono con hover de color configurable; muestra spinner mientras procesando=true
function IconButton({ icono: Icono, titulo, onClick, disabled = false, procesando = false, colorHover = 'hover:text-orange-400', size = 18 }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || procesando}
      title={titulo}
      className={`transition-colors ${procesando || disabled ? 'opacity-40' : `${color.textoApagado} ${colorHover}`}`}
    >
      {procesando
        ? <Loader2 size={size} className="animate-spin" />
        : <Icono size={size} />
      }
    </button>
  )
}

export default IconButton
