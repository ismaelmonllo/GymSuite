import { color, s } from '../../styles'

// Modal genérico de confirmación: muestra un mensaje y dos botones (confirmar / cancelar)
function ModalConfirmacion({ mensaje, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', onConfirmar, onCancelar, peligro = false, soloConfirmar = false }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className={s.modalBackdrop} onClick={onCancelar} />
      <div className={s.modalCard}>

        <p className={`text-sm ${color.texto}`}>{mensaje}</p>

        <div className="flex gap-3">
          {!soloConfirmar && (
            <button onClick={onCancelar} className={s.btnSecundario}>
              {textoCancelar}
            </button>
          )}
          <button
            onClick={onConfirmar}
            className={`flex-1 ${peligro ? 'py-3 rounded-lg text-white font-medium transition-colors bg-red-600 hover:bg-red-500' : s.btnPrimary}`}
          >
            {textoConfirmar}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalConfirmacion
