import { CheckCircle, XCircle } from 'lucide-react'
import { color, s } from '../../styles'

// Modal superpuesto para mostrar el resultado de una operación.
// Acepta mensaje simple (exito + mensaje) o contenido personalizado (children).
function ModalResultado({ exito, mensaje, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className={s.modalBackdrop} />
      <div className={s.modalCard}>
        <h3 className={`font-semibold ${color.texto}`}>Resultado</h3>
        {children ?? (
          <p className={`flex items-center gap-2 text-sm ${exito ? 'text-green-400' : color.error}`}>
            {exito
              ? <CheckCircle size={16} className="shrink-0" />
              : <XCircle size={16} className="shrink-0" />}
            {mensaje}
          </p>
        )}
        <button onClick={onCerrar} className={s.btnPrimary}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ModalResultado
