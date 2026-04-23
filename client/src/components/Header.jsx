import { color } from '../styles'

// Cabecera común de la aplicación
function Header({ children }) {
  return (
    <header className={`w-full border-b ${color.bordeHeader} px-6 py-4 flex items-center justify-center relative`}>
      <span className={`${color.texto} text-2xl font-bold tracking-wide`}>GymSuite</span>
      {children && (
        <div className="absolute right-6 flex items-center gap-4">
          {children}
        </div>
      )}
    </header>
  )
}

export default Header
