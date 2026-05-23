/**
 * Convertir céntimos (entero almacenado en BD) a euros.
 * @param {number|string} centimos
 * @returns {number} Importe en euros (0 si el valor es inválido)
 */
export const centimosAEuros = (centimos) => (Number(centimos) || 0) / 100

/**
 * Convertir euros (string o número del input) a céntimos enteros para enviar al backend.
 * @param {number|string} euros
 * @returns {number} Importe en céntimos redondeado
 */
export const eurosACentimos = (euros) => Math.round(Number(euros) * 100)

/**
 * Formatear importe en céntimos como "40 €" o "40,50 €" (coma decimal, sin decimales si es exacto).
 * @param {number|string} centimos
 * @returns {string} Importe formateado en euros con símbolo
 */
export const formatearImporte = (centimos) => {
  const euros = centimosAEuros(centimos)
  return `${euros % 1 === 0 ? euros : euros.toFixed(2).replace('.', ',')} €`
}

/**
 * Formatear fecha a formato local español (dd/mm/aaaa).
 * @param {string|Date|null|undefined} fecha
 * @returns {string} Fecha formateada o "—" si no hay fecha
 */
export const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-ES') : '—'
