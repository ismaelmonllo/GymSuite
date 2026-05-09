import { X } from 'lucide-react'
import { color, s } from '../../styles'

// Carcasa reutilizable para todos los modales: overlay + card centrada + cabecera con título y cierre
// ancho acepta cualquier clase max-w-* de Tailwind; por defecto max-w-xl
// cerrable=false oculta la X y desactiva el cierre por overlay (modales obligatorios, ej. cambio forzoso de contraseña)
function ModalBase({ titulo, onClose, ancho = 'max-w-xl', cerrable = true, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">

      {/* Overlay oscuro: solo cierra si el modal es cerrable */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={cerrable ? onClose : undefined}
      />

      {/* Card del modal */}
      <div className={`relative z-10 w-full ${ancho} rounded-xl ${s.card} flex flex-col max-h-full`}>

        {/* Cabecera */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${color.bordeHeader} shrink-0`}>
          <h2 className={`text-lg font-semibold ${color.texto}`}>{titulo}</h2>
          {cerrable && (
            <button
              onClick={onClose}
              className={`${color.textoApagado} hover:${color.texto} transition-colors`}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Contenido */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>

      </div>
    </div>
  )
}

export default ModalBase
