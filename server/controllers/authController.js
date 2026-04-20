import User from '../models/UsuarioModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validarLogin } from '../validators/validarRegistros.js';

// Iniciar sesión: validar credenciales, comparar contraseña y devolver un token JWT
export const login = async (req, res) => {

    try {
        const { correo, contrasena } = req.body;

        // Validar formato de los datos antes de consultar la base de datos
        const { valido, errores } = validarLogin({ correo, contrasena });
        if (!valido) return res.status(400).json({ mensaje: 'Datos inválidos', errores });

        // Buscar el usuario por correo
        const usuario = await User.findOne({ correo: correo });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Comparar la contraseña recibida con el hash almacenado en la base de datos
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!coincide) return res.status(401).json({ mensaje: 'Credenciales incorrectas' });

        // Generar el token JWT con los datos básicos del usuario, válido durante 2 horas
        const userToken = jwt.sign(
            { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre, apellidos: usuario.apellidos },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        return res.status(200).json({ token: userToken });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message });

    }

}