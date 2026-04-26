// Formatear importe: sin decimales si es entero, con dos si no
export const formatearImporte = (n) => `${n % 1 === 0 ? n : n.toFixed(2)} €`

// Formatear fecha a formato local español
export const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-ES') : '—'
