import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Verificar que la petición incluye un token JWT válido en la cabecera
 * Authorization (`Bearer <token>`) y adjuntar los datos del usuario decodificados
 * al request en `req.usuario` para los middlewares siguientes.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 401 si falta el token o es inválido/expirado
 */
export const verificarToken = async (req, res, next) => {

    try {

        // Extraer el token de la cabecera Authorization (formato: "Bearer <token>")
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        // Verificar la firma del token y decodificar los datos del usuario
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({ mensaje: 'Token invalido o expirado' });
    }

}

/**
 * Comprobar que el campo `rol` del body coincide con el rol esperado para la ruta.
 * Evita que se cree un admin por la ruta de entrenadores o viceversa.
 * @param {'admin'|'entrenador'|'cliente'} rolEsperado - Rol que debe llevar el body.
 * @returns {import('express').RequestHandler} Middleware que devuelve 400 si no coincide.
 */
export const verificarRolBody = (rolEsperado) => (req, res, next) => {
    if (req.body.rol !== rolEsperado) {
        return res.status(400).json({ mensaje: `El rol debe ser '${rolEsperado}' para este endpoint` });
    }
    next();
};

/**
 * Forzar el filtro `rol` en la query string para que cada ruta solo devuelva
 * su tipo de empleado. Evita, por ejemplo, que `GET /api/entrenadores?rol=admin`
 * acabe devolviendo admins.
 * @param {'admin'|'entrenador'|'cliente'} rolEsperado - Rol que se fuerza en `req.query.rol`.
 * @returns {import('express').RequestHandler}
 */
export const forzarRolQuery = (rolEsperado) => (req, res, next) => {
    req.query.rol = rolEsperado;
    next();
};

/**
 * Comprobar que el usuario autenticado tiene uno de los roles permitidos.
 * Se usa siempre encadenado después de `verificarToken`, que rellena `req.usuario`.
 * @param {...('admin'|'entrenador'|'cliente')} roles - Lista de roles autorizados.
 * @returns {import('express').RequestHandler} Middleware que devuelve 403 si el rol no está autorizado.
 */
export const verificarRol = (...roles) => (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'Acceso denegado' });
    next();
};

/**
 * Permitir acceso si el usuario autenticado es admin, o si está accediendo
 * a su propio recurso (cuando `req.params.id` coincide con su id).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} 403 si no es admin ni propietario del recurso
 */
export const verificarPropioOAdmin = (req, res, next) => {
    if (req.usuario.rol === 'admin' || req.usuario.id === req.params.id) return next()
    return res.status(403).json({ mensaje: 'Acceso denegado' })
}

/**
 * Rechazar peticiones que no incluyan el header `X-Requested-With: XMLHttpRequest`.
 * Un formulario HTML o un fetch simple de otro origen no puede añadir headers
 * personalizados sin pasar primero por un preflight CORS (que se bloquea), por
 * lo que este middleware mitiga ataques tipo logout-CSRF y refresh-CSRF.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} 403 si falta el header esperado
 */
export const requiereCustomHeader = (req, res, next) => {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ mensaje: 'Petición no autorizada' });
    }
    next();
};

/**
 * Verificar que la petición viene de cron-job.org comparando el header
 * `x-cron-secret` con `process.env.CRON_SECRET`. La comparación se hace
 * en tiempo constante con `crypto.timingSafeEqual` para evitar timing attacks.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} 401 si el header falta o no coincide
 */
export const verificarCronSecret = (req, res, next) => {
    const recibido = req.headers['x-cron-secret'];
    const esperado = process.env.CRON_SECRET;
    if (!recibido || !esperado) return res.status(401).json({ mensaje: 'No autorizado' });

    const a = Buffer.from(recibido);
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ mensaje: 'No autorizado' });
    }
    next();
}
