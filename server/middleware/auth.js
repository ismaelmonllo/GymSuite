import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Verificar que la petición incluye un token JWT válido y adjuntar los datos del usuario al request
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

// Comprobar que el campo 'rol' del body coincide con el rol esperado para esa ruta
// Evita crear un admin por la ruta de entrenadores o viceversa
export const verificarRolBody = (rolEsperado) => (req, res, next) => {
    if (req.body.rol !== rolEsperado) {
        return res.status(400).json({ mensaje: `El rol debe ser '${rolEsperado}' para este endpoint` });
    }
    next();
};

// Forzar el filtro de rol en query para que cada ruta solo devuelva su tipo de empleado
// Evita que GET /api/entrenadores?rol=admin devuelva admins
export const forzarRolQuery = (rolEsperado) => (req, res, next) => {
    req.query.rol = rolEsperado;
    next();
};

// Comprobar que el usuario autenticado tiene uno de los roles permitidos para la ruta
// Se usa como middleware encadenado después de verificarToken
export const verificarRol = (...roles) => (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'Acceso denegado' });
    next();
};

// Permitir acceso si el usuario es admin, o si accede a su propio recurso por :id
export const verificarPropioOAdmin = (req, res, next) => {
    if (req.usuario.rol === 'admin' || req.usuario.id === req.params.id) return next()
    return res.status(403).json({ mensaje: 'Acceso denegado' })
}

// Rechazar peticiones sin el header X-Requested-With: XMLHttpRequest
// Un formulario HTML o fetch simple de otro origen no puede añadir headers personalizados sin pasar
// por CORS preflight, que nuestro CORS bloquea — esto mitiga logout-CSRF y refresh-CSRF
export const requiereCustomHeader = (req, res, next) => {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ mensaje: 'Petición no autorizada' });
    }
    next();
};

// Verificar que la petición viene de cron-job.org comprobando el header x-cron-secret
// Comparación en tiempo constante para evitar timing attacks
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
