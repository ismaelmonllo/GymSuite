import { LogOut } from 'lucide-react'
import { color } from '../../styles'

/**
 * Obtener las iniciales (mayúsculas) del nombre y apellidos para el avatar.
 * @param {string} [nombre='']
 * @param {string} [apellidos='']
 * @returns {string} Iniciales en mayúsculas, p. ej. "IM"
 */
const iniciales = (nombre = '', apellidos = '') =>
  `${nombre[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase()

/**
 * Cabecera común de la app: avatar + info usuario a la izquierda, título centrado, slot + logout a la derecha.
 * Sin usuario muestra solo el título centrado (pantalla de login).
 * @param {{usuario?: object, subtitulo?: string, onLogout?: () => void, onAvatarClick?: () => void, children?: React.ReactNode}} props
 * @returns {JSX.Element}
 */
function Header({ usuario, subtitulo, onLogout, onAvatarClick, children }) {
  // Sin usuario: solo título centrado (pantalla de login)
  if (!usuario) {
    return (
      <header className={`w-full border-b ${color.bordeHeader} px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-center`}>
        <span className={`${color.texto} text-2xl sm:text-4xl font-bold tracking-wide`}>GymSuite</span>
      </header>
    )
  }

  return (
    <header className={`w-full border-b ${color.bordeHeader} px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between relative`}>

      {/* Izquierda: avatar con iniciales + nombre + subtítulo (nombre oculto en móvil) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAvatarClick}
          disabled={!onAvatarClick}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${color.bordeAcento2} ${color.textoAcento2} flex items-center justify-center font-semibold text-sm shrink-0 ${onAvatarClick ? 'hover:opacity-75 transition-opacity' : ''}`}
        >
          {iniciales(usuario.nombre, usuario.apellidos)}
        </button>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className={`${color.texto} font-medium text-sm`}>
            Hola, {usuario.nombre}
          </span>
          {subtitulo && (
            <span className={`${color.textoApagado} text-xs`}>{subtitulo}</span>
          )}
        </div>
      </div>

      {/* Centro: título */}
      <span className={`${color.texto} text-2xl sm:text-4xl font-bold tracking-wide absolute left-1/2 -translate-x-1/2`}>
        GymSuite
      </span>

      {/* Derecha: contenido opcional (oculto en móvil) + logout */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          {children}
        </div>
        <button
          onClick={onLogout}
          className={`${color.textoApagado} hover:text-orange-400 transition-colors`}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>

    </header>
  )
}

export default Header
