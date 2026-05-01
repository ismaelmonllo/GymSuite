import jwt from 'jsonwebtoken';

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

    try {

        if (!roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'Acceso denegado' });

        next();

    } catch (error) {
        return res.status(500).json({ mensaje: 'Error al verificar rol' });
    }

}

// Permitir acceso si el usuario es admin, o si accede a su propio recurso por :id
export const verificarPropioOAdmin = (req, res, next) => {
    if (req.usuario.rol === 'admin' || req.usuario.id === req.params.id) return next()
    return res.status(403).json({ mensaje: 'Acceso denegado' })
}

// Verificar que la petición viene de cron-job.org comprobando el header x-cron-secret
// Solo para rutas de cron: no requiere JWT ni usuario autenticado
export const verificarCronSecret = (req, res, next) => {
    const secret = req.headers['x-cron-secret'];
    if (!secret || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ mensaje: 'No autorizado' });
    }
    next();
}
