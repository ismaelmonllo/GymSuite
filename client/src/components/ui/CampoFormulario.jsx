import { color, s } from '../../styles'

// Envuelve label + campo + mensaje de error en un bloque de formulario uniforme
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
