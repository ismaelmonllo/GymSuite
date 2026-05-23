import { logger } from '../utils/logger.js';

/**
 * Middleware central de errores. Debe registrarse después de todas las rutas
 * en index.js. Distingue errores de validación Mongoose (400), CastError de
 * ObjectId (400) y cualquier otro error inesperado (500, loguea con pino).
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 * @returns {void} Respuesta JSON con código adecuado al tipo de error
 */
export const errorHandler = (err, _req, res, _next) => {
    if (err.name === 'ValidationError')
        return res.status(400).json({ mensaje: 'Datos inválidos', errores: err.errors });
    if (err.name === 'CastError')
        return res.status(400).json({ mensaje: 'ID no válido' });
    logger.error({ err }, 'Error no controlado');
    return res.status(500).json({ mensaje: 'Error en el servidor' });
};
