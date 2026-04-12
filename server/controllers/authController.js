import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {

    try {
        const correo = req.body.correo;
        const contrasena = req.body.contrasena;

        const usuario = await User.findOne({ correo: correo });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!coincide) return res.status(401).json({ mensaje: 'Credenciales incorrectas' });

        const userToken = jwt.sign(
            { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre, apellidos: usuario.apellidos },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        return res.status(200).json({ token: userToken })

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })
    }

}