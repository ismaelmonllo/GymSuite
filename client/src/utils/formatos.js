// Convertir céntimos (entero almacenado en BD) a euros (número)
export const centimosAEuros = (centimos) => (Number(centimos) || 0) / 100

// Convertir euros (string o número del input) a céntimos enteros para enviar al backend
export const eurosACentimos = (euros) => Math.round(Number(euros) * 100)

// Formatear importe en céntimos como "40 €" o "40,50 €"
export const formatearImporte = (centimos) => {
  const euros = centimosAEuros(centimos)
  return `${euros % 1 === 0 ? euros : euros.toFixed(2).replace('.', ',')} €`
}

// Formatear fecha a formato local español
export const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-ES') : '—'
