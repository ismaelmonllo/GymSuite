// Envolver funciones async de controllers para capturar excepciones y pasarlas al errorHandler central
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
