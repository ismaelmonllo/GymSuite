import User from '../models/Usuario.js';

export const listarClientes = async (req, res) => {

    try {

        const clientes = await User.find({ rol: 'cliente' });
        return res.status(200).json({ clientes });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })
    }
}

export const verCliente = async (req, res) => {
    try {

        const cliente = await User.findById(req.params.id);

        if (!cliente || cliente.rol === 'cliente') {
            return res.status(200).json({ cliente });
        } else {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })
    }
}

export const crearCliente = async (req, res) => {
    try {

        const { nombre, apellidos, correo, contrasena, telefono, direccion, fecha_nacimiento, DNI, nivel, tipo_cuota } = req.body;
        
        const { valido, errores } = validarCrearCliente(req.body);
        if (!valido) return res.status(400).json({ errores });

        const usuarioExistente = await User.findOne({ $or: [{ DNI }, { correo }] });
        if (usuarioExistente) return res.status(400).json({ mensaje: 'Ya existe un usuario con ese DNI o correo' });

        const contrasenaCifrada = await bcrypt.hash(contrasena, 10);

        const nuevoCliente = new User({
            nombre,
            apellidos,
            correo,
            contrasena: contrasenaCifrada,
            telefono,
            direccion,
            fecha_nacimiento,
            DNI,
            nivel,
            tipo_cuota,
            rol: 'cliente'
        });
        await nuevoCliente.save();
        return res.status(201).json({ mensaje: 'Cliente creado correctamente', cliente: nuevoCliente });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })
    }
}
