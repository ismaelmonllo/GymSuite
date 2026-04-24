import { X } from 'lucide-react'
import { color, s } from '../../styles'

// Carcasa reutilizable para todos los modales: overlay + card centrada + cabecera con título y cierre
function ModalBase({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Card del modal */}
      <div className={`relative z-10 w-full max-w-xl mx-4 rounded-xl ${s.card} flex flex-col`}>

        {/* Cabecera */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${color.bordeHeader}`}>
          <h2 className={`text-lg font-semibold ${color.texto}`}>{titulo}</h2>
          <button
            onClick={onClose}
            className={`${color.textoApagado} hover:${color.texto} transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {children}
        </div>

      </div>
    </div>
  )
}

export default ModalBase
