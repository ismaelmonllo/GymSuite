import { color, s } from '../../styles'

// Tarjeta de estadística con una métrica principal y una secundaria opcional
function StatCard({ icono: Icono, titulo, principal, secundario, cargando, valorCompacto = false }) {
  return (
    <div className={`${s.card} rounded-xl p-5 flex flex-col gap-3`}>

      {/* Cabecera: icono + título */}
      <div className="flex items-center gap-2">
        {Icono && <Icono size={22} className={color.textoAcento2} />}
        <span className={`${color.textoApagado} text-sm sm:text-base uppercase tracking-wide`}>{titulo}</span>
      </div>

      {/* Métricas */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className={`${color.textoApagado} text-xs sm:text-sm`}>{principal.label}</span>
          {cargando
            ? <div className="h-7 w-16 bg-neutral-700 rounded animate-pulse" />
            : <span className={`${color.texto} ${valorCompacto ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-bold leading-tight`}>
                {principal.valor ?? '—'}
              </span>
          }
        </div>

        {secundario && (
          <div className="flex flex-col items-end gap-1">
            <span className={`${color.textoApagado} text-xs sm:text-sm`}>{secundario.label}</span>
            {cargando
              ? <div className="h-7 w-16 bg-neutral-700 rounded animate-pulse" />
              : <span className={`${color.texto} ${valorCompacto ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-bold leading-tight`}>
                  {secundario.valor ?? '—'}
                </span>
            }
          </div>
        )}
      </div>

    </div>
  )
}

export default StatCard
