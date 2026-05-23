import { s, color } from '../../styles'

/**
 * Card de login con pestañas (cliente/trabajador), campos de credenciales y submit.
 * @param {{tab: 'cliente'|'trabajador', onCambiarTab: (tab: string) => void, correo: string, onCorreo: (v: string) => void, contrasena: string, onContrasena: (v: string) => void, error?: string, cargando: boolean, onSubmit: (e: React.FormEvent) => void}} props
 * @returns {JSX.Element}
 */
function CardLogin({ tab, onCambiarTab, correo, onCorreo, contrasena, onContrasena, error, cargando, onSubmit }) {
  return (
    <div>
      {/* Pestañas */}
      <div className={`flex rounded-t-xl overflow-hidden border border-b-0 ${color.borde}`}>
        <button type="button" onClick={() => onCambiarTab('cliente')}
          className={`${s.tabBase} ${tab === 'cliente' ? s.tabActivo : s.tabInactivo}`}>
          Cliente
        </button>
        <button type="button" onClick={() => onCambiarTab('trabajador')}
          className={`${s.tabBase} ${tab === 'trabajador' ? s.tabActivo : s.tabInactivo}`}>
          Trabajador
        </button>
      </div>

      {/* Cuerpo */}
      <div className={`${s.card} rounded-b-xl p-8`}>
        <h1 className={`${color.texto} text-2xl font-semibold text-center mb-6`}>
          Iniciar sesión
        </h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className={s.fieldGroup}>
            <label className={s.label}>Usuario</label>
            <input type="email" value={correo} onChange={(e) => onCorreo(e.target.value)}
              required className={s.input} placeholder="correo@ejemplo.com" />
          </div>

          <div className={s.fieldGroup}>
            <label className={s.label}>Contraseña</label>
            <input type="password" value={contrasena} onChange={(e) => onContrasena(e.target.value)}
              required className={s.input} placeholder="••••••••" />
          </div>

          {error && <p className={`${color.error} text-sm text-center`}>{error}</p>}

          <button type="submit" disabled={cargando} className={`mt-2 ${s.btnPrimary}`}>
            {cargando ? 'Iniciando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CardLogin
