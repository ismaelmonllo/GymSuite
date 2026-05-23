/**
 * Envolver funciones async de controllers para capturar excepciones y pasarlas
 * al errorHandler central, evitando repetir try/catch en cada endpoint.
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} fn
 *   Controlador asíncrono a envolver.
 * @returns {import('express').RequestHandler} Middleware Express con captura de errores.
 */
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
