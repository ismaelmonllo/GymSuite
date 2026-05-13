import bcrypt from 'bcrypt';
import User from '../models/UsuarioModel.js';
import Pagos from '../models/PagoModel.js';
import { validarCrearCliente, validarCrearTrabajador, validarEditarUsuario } from '../validators/validarRegistros.js';
import { validarObjectId } from '../validators/validarCampos.js';
import { generarPasswordTemporal } from '../utils/passwords.js';
import { sendMail } from '../utils/mailer.js';

// Detectar duplicados de DNI o correo al crear un usuario.
// El DNI solo colisiona dentro del mismo rol; el correo colisiona globalmente.
// Devuelve:
//   { bloqueo: { campo, mensaje } } si hay un duplicado activo o un correo perteneciente a otro rol inactivo
//   { inactivos: [...] } con los candidatos a reactivar si los hay (uno o dos según coincidan en el mismo usuario o no)
//   { } si no hay ningún duplicado
const detectarDuplicadosAlCrear = async (DNI, correo, rolNuevo) => {
    const porDni    = await User.findOne({ DNI, rol: rolNuevo });
    const porCorreo = await User.findOne({ correo });

    // Un usuario activo con el mismo DNI o correo bloquea siempre la operación
    if (porDni?.activo)    return { bloqueo: { campo: 'DNI',    mensaje: `Ya existe un ${rolNuevo} con ese DNI.` } };
    if (porCorreo?.activo) return { bloqueo: { campo: 'correo', mensaje: 'Ya existe un usuario con ese correo.' } };

    // Si el correo pertenece a un usuario de otro rol (aunque esté inactivo) no se puede reactivar desde aquí
    if (porCorreo && porCorreo.rol !== rolNuevo) {
        return { bloqueo: { campo: 'correo', mensaje: `Ese correo pertenece a un ${porCorreo.rol} dado de baja. Usa otro correo.` } };
    }

    // Recoger candidatos a reactivar evitando duplicar el mismo documento si DNI y correo apuntan al mismo usuario
    const inactivos = [];
    if (porDni) inactivos.push(porDni);
    if (porCorreo && (!porDni || String(porCorreo._id) !== String(porDni._id))) inactivos.push(porCorreo);

    return inactivos.length > 0 ? { inactivos } : {};
};

// Reducir un usuario a los campos que se muestran en el modal de reactivación
const proyectarInactivo = (usuario) => ({
    _id:              usuario._id,
    nombre:           usuario.nombre,
    apellidos:        usuario.apellidos,
    fecha_nacimiento: usuario.fecha_nacimiento,
    DNI:              usuario.DNI,
    correo:           usuario.correo,
    rol:              usuario.rol,
});

// Obtener todos los usuarios con rol 'cliente' de la base de datos y devolverlos en la respuesta, aplicando filtros opcionales
export const listarClientes = async (req, res) => {

    try {

        const { activo, nivel, tipo_cuota } = req.query;

        // Construir un filtro dinámico según los parámetros recibidos
        const filtro = { rol: 'cliente' };
        if (activo !== undefined) filtro.activo = activo;
        if (nivel) filtro.nivel = nivel;
        if (tipo_cuota) filtro.tipo_cuota = tipo_cuota;

        // Buscar los clientes que coincidan con el filtro construido
        const clientes = await User.find(filtro);
        return res.status(200).json({ clientes });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Devolver el perfil completo del cliente autenticado con la cuota populada
export const obtenerMiPerfil = async (req, res) => {

    try {

        const cliente = await User.findById(req.usuario.id).populate('tipo_cuota');
        if (!cliente) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        return res.status(200).json({ cliente });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Buscar un cliente por su ID y devolverlo si existe y tiene rol 'cliente'
export const verCliente = async (req, res) => {

    try {

        const { valido } = validarObjectId(req.params.id);
        if (!valido) return res.status(400).json({ mensaje: 'ID no válido' });

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

// Crear un nuevo cliente: validar datos, comprobar duplicados, generar contraseña temporal y enviar email de bienvenida
export const crearCliente = async (req, res) => {

    try {

        const { nombre, apellidos, correo, telefono, direccion, fecha_nacimiento, DNI, sexo, nivel, tipo_cuota } = req.body;

        // Validar el formato de todos los campos antes de continuar
        const { valido, errores } = validarCrearCliente(req.body);
        if (!valido) return res.status(400).json({ errores });

        // Comprobar duplicados: bloquea si hay usuario activo en conflicto
        // o si hay un correo que pertenece a otra cuenta de baja con rol distinto
        // Si hay usuarios inactivos del mismo rol, devolver 409 con la lista para que el front ofrezca reactivar
        const { bloqueo, inactivos } = await detectarDuplicadosAlCrear(DNI, correo, 'cliente');
        if (bloqueo)   return res.status(400).json({ campo: bloqueo.campo, mensaje: bloqueo.mensaje });
        if (inactivos) return res.status(409).json({ inactivos: inactivos.map(proyectarInactivo) });

        // Generar contraseña temporal y cifrarla antes de guardarla en la base de datos
        const passwordTemporal = generarPasswordTemporal();
        const contrasenaCifrada = await bcrypt.hash(passwordTemporal, 10);

        // Crear el documento y guardarlo con rol fijo 'cliente'
        // forzar_cambio_password en true para obligarle a cambiar la temporal en su primer login
        const nuevoCliente = new User({
            nombre, apellidos, correo, contrasena: contrasenaCifrada,
            telefono, direccion, fecha_nacimiento, DNI, sexo, nivel, tipo_cuota,
            rol: 'cliente',
            forzar_cambio_password: true,
        });
        await nuevoCliente.save();

        // Enviar email de bienvenida con la contraseña temporal
        await sendMail({
            to: correo,
            subject: 'Bienvenido a GymSuite',
            html: `
                <p>Hola ${nombre},</p>
                <p>Tu cuenta en GymSuite ha sido creada. Ya puedes iniciar sesión con tu correo y la siguiente contraseña temporal:</p>
                <h2 style="letter-spacing: 4px; font-family: monospace;">${passwordTemporal}</h2>
                <p>Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
            `,
        });

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

        // Comprobar duplicados excluyendo el propio documento
        // El DNI solo choca dentro del mismo rol; aquí el rol fijo es 'cliente'
        const id = req.params.id;
        if (datos.DNI    && await User.findOne({ DNI:    datos.DNI, rol: 'cliente', _id: { $ne: id } })) return res.status(400).json({ campo: 'DNI',    mensaje: 'Ya existe un cliente con ese DNI.' });
        if (datos.correo && await User.findOne({ correo: datos.correo,              _id: { $ne: id } })) return res.status(400).json({ campo: 'correo', mensaje: 'Ya existe un usuario con ese correo.' });

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

// Desactivar un usuario marcando su campo 'activo' como false
export const darDeBaja = async (req, res) => {

    try {

        const usuarioActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        return res.status(200).json({ mensaje: 'Usuario dado de baja correctamente', usuario: usuarioActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Reactivar un usuario marcando su campo 'activo' como true y refrescando su fecha de alta
// La fecha de alta se actualiza porque la reactivación equivale a un nuevo periodo de actividad en el gimnasio
export const darDeAlta = async (req, res) => {

    try {

        const usuarioActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { activo: true, fecha_alta: new Date() },
            { new: true }
        );

        if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        return res.status(200).json({ mensaje: 'Usuario dado de alta correctamente', usuario: usuarioActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Asignar un nuevo tipo de cuota a un cliente, eliminar sus pagos pendientes y actualizar el documento
export const cambiarCuota = async (req, res) => {

    try {

        const nuevaCuota = req.body.nuevaCuota;

        // Validar que el ID de la cuota tiene formato correcto antes de usarlo
        const { valido, error } = validarObjectId(nuevaCuota);
        if (!valido) return res.status(400).json({ mensaje: error });

        const clienteActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { tipo_cuota: nuevaCuota },
            { new: true }
        );

        if (!clienteActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Eliminar los pagos pendientes del cliente para que se regeneren con la nueva cuota
        await Pagos.deleteMany({ cliente_id: req.params.id, pendiente: true });

        return res.status(200).json({ mensaje: 'Cuota actualizada correctamente', cliente: clienteActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Obtener todos los empleados (admin y entrenador) de la base de datos, aplicando filtros opcionales
export const listarEmpleados = async (req, res) => {

    try {

        const { activo, rol } = req.query;

        // Rechazar peticiones que intenten filtrar por rol de cliente
        if (rol === 'cliente') return res.status(400).json({ mensaje: 'Rol no válido para este endpoint' });

        // Construir un filtro dinámico: si no se especifica rol, devolver todos los empleados
        const filtro = { rol: rol || { $in: ['admin', 'entrenador'] } };
        if (activo !== undefined) filtro.activo = activo;

        // Buscar los empleados que coincidan con el filtro construido
        const empleados = await User.find(filtro);
        return res.status(200).json({ empleados });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Buscar un empleado por su ID y devolverlo si existe y tiene rol 'admin' o 'entrenador'
export const verEmpleado = async (req, res) => {

    try {

        const { valido } = validarObjectId(req.params.id);
        if (!valido) return res.status(400).json({ mensaje: 'ID no válido' });

        const empleado = await User.findById(req.params.id);

        // Devolver el empleado si existe y su rol es correcto, sino devolver 404
        if (!empleado || (empleado.rol !== 'admin' && empleado.rol !== 'entrenador')) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }

        return res.status(200).json({ empleado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Crear un nuevo empleado (entrenador o admin): validar datos, comprobar duplicados, generar contraseña temporal y enviar email de bienvenida
export const crearEmpleado = async (req, res) => {

    try {

        const { nombre, apellidos, correo, telefono, direccion, fecha_nacimiento, DNI, rol } = req.body;

        // Validar el formato de todos los campos antes de continuar
        const { valido, errores } = validarCrearTrabajador(req.body);
        if (!valido) return res.status(400).json({ errores });

        // Comprobar duplicados: bloquea si hay usuario activo en conflicto
        // o si hay un correo que pertenece a otra cuenta de baja con rol distinto
        // Si hay usuarios inactivos del mismo rol, devolver 409 con la lista para que el front ofrezca reactivar
        const { bloqueo, inactivos } = await detectarDuplicadosAlCrear(DNI, correo, rol);
        if (bloqueo)   return res.status(400).json({ campo: bloqueo.campo, mensaje: bloqueo.mensaje });
        if (inactivos) return res.status(409).json({ inactivos: inactivos.map(proyectarInactivo) });

        // Generar contraseña temporal y cifrarla antes de guardarla en la base de datos
        const passwordTemporal = generarPasswordTemporal();
        const contrasenaCifrada = await bcrypt.hash(passwordTemporal, 10);

        // Crear el documento con el rol recibido (admin o entrenador)
        // forzar_cambio_password en true para obligarle a cambiar la temporal en su primer login
        const nuevoEmpleado = new User({
            nombre, apellidos, correo, contrasena: contrasenaCifrada,
            telefono, direccion, fecha_nacimiento, DNI, rol,
            forzar_cambio_password: true,
        });
        await nuevoEmpleado.save();

        // Enviar email de bienvenida con la contraseña temporal
        await sendMail({
            to: correo,
            subject: 'Bienvenido a GymSuite',
            html: `
                <p>Hola ${nombre},</p>
                <p>Tu cuenta en GymSuite ha sido creada. Ya puedes iniciar sesión con tu correo y la siguiente contraseña temporal:</p>
                <h2 style="letter-spacing: 4px; font-family: monospace;">${passwordTemporal}</h2>
                <p>Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
            `,
        });

        return res.status(201).json({ mensaje: 'Empleado creado correctamente', empleado: nuevoEmpleado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Actualizar los datos de un empleado, ignorando campos de cliente y campos no modificables
export const editarEmpleado = async (req, res) => {

    try {

        // Comprobar que el usuario objetivo es un empleado, no un cliente
        const usuario = await User.findById(req.params.id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        if (usuario.rol === 'cliente') return res.status(403).json({ mensaje: 'No se puede editar un cliente desde este endpoint' });

        // Excluir rol, contraseña, fecha_alta y campos exclusivos de cliente
        const { rol, contrasena, fecha_alta, nivel, tipo_cuota, ...datos } = req.body;

        // Validar el formato de los datos editables
        const { valido, errores } = validarEditarUsuario(datos);
        if (!valido) return res.status(400).json({ errores });

        // Comprobar duplicados excluyendo el propio documento
        // El DNI solo choca dentro del mismo rol del empleado
        const id = req.params.id;
        if (datos.DNI    && await User.findOne({ DNI:    datos.DNI, rol: usuario.rol, _id: { $ne: id } })) return res.status(400).json({ campo: 'DNI',    mensaje: `Ya existe un ${usuario.rol} con ese DNI.` });
        if (datos.correo && await User.findOne({ correo: datos.correo,                _id: { $ne: id } })) return res.status(400).json({ campo: 'correo', mensaje: 'Ya existe un usuario con ese correo.' });

        // Actualizar solo los campos permitidos y devolver el documento actualizado
        const empleadoActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { $set: datos },
            { new: true }
        );
        return res.status(200).json({ mensaje: 'Empleado editado correctamente', empleado: empleadoActualizado });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// FUNCIONES PARA STATS

// Contar el total de clientes activos en la base de datos
export const obtenerTotalClientes = async (req, res) => {

    try {

        // Contar solo los usuarios con rol 'cliente' y activos
        const total = await User.countDocuments({ rol: 'cliente', activo: true });
        return res.status(200).json({ total });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Contar el total de trabajadores activos (entrenadores y admins) en la base de datos
export const obtenerTotalTrabajadores = async (req, res) => {

    try {

        // Contar los usuarios con rol 'entrenador' o 'admin' que estén activos
        const total = await User.countDocuments({ rol: { $in: ['entrenador', 'admin'] }, activo: true });
        return res.status(200).json({ total });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Contar los clientes dados de alta en el último mes y en el último año
export const obtenerStatsAltas = async (req, res) => {

    try {

        const ahora = new Date();

        // Calcular la fecha de inicio del mes actual y la de hace 12 meses
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const inicioAnio = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

        // Contar clientes cuya fecha_alta cae dentro de cada rango
        const ultimoMes = await User.countDocuments({ rol: 'cliente', fecha_alta: { $gte: inicioMes } });
        const ultimoAnio = await User.countDocuments({ rol: 'cliente', fecha_alta: { $gte: inicioAnio } });

        return res.status(200).json({ ultimoMes, ultimoAnio });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}