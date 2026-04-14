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
