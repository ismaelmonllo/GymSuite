import jwt from 'jsonwebtoken';

export const verificarToken = async (req, res, next) => {

    try {

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({ mensaje: 'Token invalido o expirado' });
    }

}

export const verificarRol = (...roles) => (req, res, next) => {

    try {

        if (!roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'Acceso denegado' });

        next();

    } catch (error) {
        return res.status(500).json({ mensaje: 'Error al verificar rol' });
    }

}
