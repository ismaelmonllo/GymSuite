// Tokens de diseño — colores y superficies base
export const color = {
  bgPagina:     'bg-neutral-900',
  bgCard:       'bg-neutral-800',
  bgInput:      'bg-neutral-900',
  bgHover:      'hover:bg-neutral-700',
  borde:        'border-neutral-600',
  bordeHeader:  'border-neutral-700',
  acento:       'bg-orange-600',
  acentoHover:  'hover:bg-orange-500',
  bordeAcento:  'border-orange-600',
  textoAcento:  'text-orange-600',
  bordeAcento2: 'border-orange-400',
  textoAcento2: 'text-orange-400',
  texto:        'text-orange-100',
  textoApagado: 'text-neutral-500',
  error:        'text-red-400',
}

// Componentes reutilizables construidos sobre los tokens
export const s = {
  input:       `${color.bgInput} border ${color.borde} rounded-lg px-4 py-3 ${color.texto} placeholder-neutral-500 focus:outline-none focus:border-orange-600`,
  label:       `${color.texto} text-sm`,
  fieldGroup:  'flex flex-col gap-1',
  btnPrimary:  `${color.acento} ${color.acentoHover} disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors`,
  tabBase:     'flex-1 py-3 text-sm font-medium transition-colors',
  tabActivo:   `${color.acento} text-white`,
  tabInactivo: `${color.bgCard} ${color.texto} ${color.bgHover}`,
  card:        `${color.bgCard} border ${color.borde}`,
}
