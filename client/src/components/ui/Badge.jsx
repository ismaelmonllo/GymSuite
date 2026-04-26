const variantes = {
  activo:          'bg-green-950 text-green-400',
  baja:            'bg-neutral-700 text-neutral-400',
  pendiente:       'bg-red-950 text-red-400',
  confirmado:      'bg-green-950 text-green-400',
  'no-generado':   'bg-neutral-700 text-neutral-400',
  principiante:    'bg-blue-950 text-blue-400',
  intermedio:      'bg-amber-950 text-amber-400',
  avanzado:        'bg-green-950 text-green-400',
  admin:           'bg-neutral-700 text-neutral-400',
  entrenador:      'bg-orange-950 text-orange-400',
}

function Badge({ variante, children }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${variantes[variante] ?? ''}`}>
      {children}
    </span>
  )
}

export default Badge
