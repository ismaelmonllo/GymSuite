// Convertir fecha a string "YYYY-MM"
export const formatearMes = (fecha) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// Sumar N meses a una fecha (devuelve nueva Date al día 1)
export const sumarMeses = (fecha, n) => new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
