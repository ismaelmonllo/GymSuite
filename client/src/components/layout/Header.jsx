import { LogOut } from 'lucide-react'
import { color } from '../../styles'

// Obtener las iniciales de nombre y apellidos
const iniciales = (nombre = '', apellidos = '') =>
  `${nombre[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase()

// Cabecera común: avatar + info usuario a la izquierda, título centrado, logout a la derecha
function Header({ usuario, subtitulo, onLogout }) {
  // Sin usuario: solo título centrado (pantalla de login)
  if (!usuario) {
    return (
      <header className={`w-full border-b ${color.bordeHeader} px-6 py-6 flex items-center justify-center`}>
        <span className={`${color.texto} text-2xl font-bold tracking-wide`}>GymSuite</span>
      </header>
    )
  }

  return (
    <header className={`w-full border-b ${color.bordeHeader} px-6 py-6 flex items-center justify-between relative`}>

      {/* Izquierda: avatar con iniciales + nombre + subtítulo */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border-2 ${color.bordeAcento2} ${color.textoAcento2} flex items-center justify-center font-semibold text-sm shrink-0`}>
          {iniciales(usuario.nombre, usuario.apellidos)}
        </div>
        <div className="flex flex-col leading-tight">
          <span className={`${color.texto} font-medium text-sm`}>
            Hola, {usuario.nombre}
          </span>
          {subtitulo && (
            <span className={`${color.textoApagado} text-xs`}>{subtitulo}</span>
          )}
        </div>
      </div>

      {/* Centro: título */}
      <span className={`${color.texto} text-4xl font-bold tracking-wide absolute left-1/2 -translate-x-1/2`}>
        GymSuite
      </span>

      {/* Derecha: botón logout */}
      <button
        onClick={onLogout}
        className={`${color.textoApagado} hover:text-orange-400 transition-colors`}
        title="Cerrar sesión"
      >
        <LogOut size={22} />
      </button>

    </header>
  )
}

export default Header
