import User from '../models/Usuario.js';

// Obtener todos los usuarios con rol 'cliente' de la base de datos
export const listarClientes = async (req, res) => {

    try {

        const clientes = await User.find({ rol: 'cliente' });
        return res.status(200).json({ clientes });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Buscar un cliente por su ID y devolverlo si existe y tiene rol 'cliente'
export const verCliente = async (req, res) => {

    try {

        const cliente = await User.findById(req.params.id);

        // Devolver el cliente si existe y su rol es correcto, sino devolver 404
        if (!cliente || cliente.rol === 'cliente') {
            return res.status(200).json({ cliente });
        } else {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Crear un nuevo cliente: validar datos, comprobar duplicados, cifrar contraseña y guardar
export const crearCliente = async (req, res) => {

    try {

        const { nombre, apellidos, correo, contrasena, telefono, direccion, fecha_nacimiento, DNI, nivel, tipo_cuota } = req.body;

        // Validar el formato de todos los campos antes de continuar
        const { valido, errores } = validarCrearCliente(req.body);
        if (!valido) return res.status(400).json({ errores });

        // Comprobar que no exista ya un usuario con el mismo DNI o correo
        const usuarioExistente = await User.findOne({ $or: [{ DNI }, { correo }] });
        if (usuarioExistente) return res.status(400).json({ mensaje: 'Ya existe un usuario con ese DNI o correo' });

        // Cifrar la contraseña antes de guardarla en la base de datos
        const contrasenaCifrada = await bcrypt.hash(contrasena, 10);

        // Crear el documento y guardarlo con rol fijo 'cliente'
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

// Actualizar los datos de un cliente, ignorando campos que no se deben modificar desde aquí
export const editarCliente = async (req, res) => {

    try {

        // Excluir rol, contraseña y fecha_alta: no se pueden cambiar en esta operación
        const { rol, contrasena, fecha_alta, ...datos } = req.body;

        // Validar el formato de los datos editables
        const { valido, errores } = validarEditarUsuario(datos);
        if (!valido) return res.status(400).json({ errores });

        // Actualizar solo los campos permitidos y devolver el documento actualizado
        const clienteActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { $set: datos },
            { new: true }
        );
        return res.status(200).json({ mensaje: 'Cliente editado correctamente', cliente: clienteActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Desactivar un cliente marcando su campo 'activo' como false (baja lógica, no se borra el registro)
export const darDeBaja = async (req, res) => {

    try {

        const clienteActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!clienteActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        return res.status(200).json({ mensaje: 'Cliente editado correctamente', cliente: clienteActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Asignar un nuevo tipo de cuota a un cliente validando que el ID de cuota sea válido
export const cambiarCuota = async (req, res) => {

    try {

        const nuevaCuota = req.body.nuevaCuota;

        // Validar que el ID de la cuota tiene formato correcto antes de usarlo
        const { valido, error } = validarObjectId(nuevaCuota);
        if (!valido) return res.status(400).json({ error });

        const clienteActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { tipo_cuota: nuevaCuota },
            { new: true }
        );

        if (!clienteActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        return res.status(200).json({ mensaje: 'Cliente editado correctamente', cliente: clienteActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}