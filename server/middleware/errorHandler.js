import { logger } from '../utils/logger.js';

// Middleware central de errores: debe registrarse después de todas las rutas en index.js
// Distingue errores de validación Mongoose de errores inesperados de servidor
export const errorHandler = (err, _req, res, _next) => {
    if (err.name === 'ValidationError')
        return res.status(400).json({ mensaje: 'Datos inválidos', errores: err.errors });
    if (err.name === 'CastError')
        return res.status(400).json({ mensaje: 'ID no válido' });
    logger.error({ err }, 'Error no controlado');
    return res.status(500).json({ mensaje: 'Error en el servidor' });
};
