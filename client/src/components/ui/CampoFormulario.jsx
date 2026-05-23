import { color, s } from '../../styles'

/**
 * Envolver label + campo + mensaje de error en un bloque de formulario uniforme.
 * @param {{label: string, error?: string, className?: string, children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
function CampoFormulario({ label, error, className = '', children }) {
  return (
    <div className={`${s.fieldGroup} ${className}`}>
      <label className={s.label}>{label}</label>
      {children}
      {error && <p className={`text-xs ${color.error} mt-1`}>{error}</p>}
    </div>
  )
}

export default CampoFormulario
