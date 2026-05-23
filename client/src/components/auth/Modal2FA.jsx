import { useState } from 'react'
import { s, color } from '../../styles'

/**
 * Modal para introducir el código OTP de 6 dígitos enviado por email durante el login 2FA.
 * @param {{correo: string, onVerificar: (codigo: string) => void, onCerrar: () => void, error?: string, cargando: boolean}} props
 * @returns {JSX.Element}
 */
function Modal2FA({ correo, onVerificar, onCerrar, error, cargando }) {
  const [codigo, setCodigo] = useState('')

  /**
   * Manejar el submit del formulario evitando recarga y delegando la verificación al padre.
   * @param {React.FormEvent} e
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    onVerificar(codigo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black/60" onClick={onCerrar} />

      <div className={s.modalCard}>
        <h2 className={`${color.texto} text-xl font-semibold text-center`}>
          Verificación en dos pasos
        </h2>
        <p className={`${color.textoApagado} text-sm text-center`}>
          Hemos enviado un código de 6 dígitos a{' '}
          <span className={color.texto}>{correo}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className={s.fieldGroup}>
            <label className={s.label}>Código</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className={`${s.input} text-center text-2xl tracking-widest`}
              placeholder="······"
            />
          </div>

          {error && <p className={`${color.error} text-sm text-center`}>{error}</p>}

          <button
            type="submit"
            disabled={cargando || codigo.length !== 6}
            className={s.btnPrimary}
          >
            {cargando ? 'Verificando...' : 'Verificar'}
          </button>

          <button type="button" onClick={onCerrar} className={s.btnSecundario}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}

export default Modal2FA
