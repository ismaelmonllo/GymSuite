/**
 * Convertir una fecha al formato string `YYYY-MM` usado en `Pago.mes`.
 * @param {Date} fecha
 * @returns {string} Mes con padding de cero (ej. `2026-03`).
 */
export const formatearMes = (fecha) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

/**
 * Sumar N meses a una fecha y devolver una nueva `Date` posicionada en el día 1.
 * Maneja correctamente el overflow de diciembre a enero del año siguiente.
 * @param {Date} fecha - Fecha de origen.
 * @param {number} n - Número de meses a sumar (puede ser negativo).
 * @returns {Date} Nueva instancia de Date al día 1 del mes resultante.
 */
export const sumarMeses = (fecha, n) => new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
