import { color, s } from '../../styles'
import { formatearImporte } from '../../utils'

// Modal de confirmación de cobro de un pago: muestra cliente, cuota, mes y dos botones
// cuota es opcional (cuando no se conoce el importe en el contexto del que llama)
function ModalConfirmarPago({ cliente, pago, cuota, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className={s.modalBackdrop} onClick={onCancelar} />
      <div className={s.modalCard}>

        <h3 className={`font-semibold ${color.texto}`}>Confirmar pago</h3>

        <div className={`flex flex-col gap-1 text-sm ${color.textoApagado}`}>
          <p><span className={color.texto}>{cliente.nombre} {cliente.apellidos}</span></p>
          <p>Cuota: <span className={color.texto}>{pago.tipo_cuota}{cuota ? ` — ${formatearImporte(cuota.importe)}` : ''}</span></p>
          <p>Mes: <span className={color.texto}>{pago.mes}</span></p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancelar} className={s.btnSecundario}>
            Cancelar
          </button>
          <button onClick={onConfirmar} className={`flex-1 ${s.btnPrimary}`}>
            Confirmar pago
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalConfirmarPago
