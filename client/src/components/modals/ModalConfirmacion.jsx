import { color, s } from '../../styles'

// Modal genérico de confirmación: muestra un mensaje y dos botones (confirmar / cancelar)
function ModalConfirmacion({ mensaje, textoConfirmar, textoCancelar = 'Cancelar', onConfirmar, onCancelar, peligro = false, soloConfirmar = false }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancelar} />
      <div className={`relative z-10 w-full max-w-sm mx-4 rounded-xl ${s.card} p-6 flex flex-col gap-5`}>

        <p className={`text-sm ${color.texto}`}>{mensaje}</p>

        <div className="flex gap-3">
          {!soloConfirmar && (
            <button
              onClick={onCancelar}
              className={`flex-1 py-2 rounded-lg border ${color.borde} ${color.texto} ${color.bgHover} transition-colors`}
            >
              {textoCancelar}
            </button>
          )}
          <button
            onClick={onConfirmar}
            className={`flex-1 py-2 rounded-lg text-white transition-colors ${peligro ? 'bg-red-600 hover:bg-red-500' : `${color.acento} ${color.acentoHover}`}`}
          >
            {textoConfirmar}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalConfirmacion
