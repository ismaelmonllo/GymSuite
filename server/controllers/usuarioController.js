import bcrypt from 'bcrypt';
import Usuario from '../models/UsuarioModel.js';
import Pagos from '../models/PagoModel.js';
import { validarCrearCliente, validarCrearTrabajador, validarEditarUsuario } from '../validators/validarRegistros.js';
import { validarObjectId } from '../validators/validarCampos.js';
import { generarPasswordTemporal } from '../utils/passwords.js';
import { sendMail, escaparHtml, emailTemplate } from '../utils/mailer.js';
import { auditar } from '../utils/audit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// Campos que el entrenador/admin puede modificar en un cliente
const CAMPOS_EDITABLES_CLIENTE = ['nombre', 'apellidos', 'correo', 'telefono', 'direccion', 'fecha_nacimiento', 'DNI', 'sexo', 'nivel'];

// Campos que el admin puede modificar en un empleado (sin campos exclusivos de cliente)
const CAMPOS_EDITABLES_EMPLEADO = ['nombre', 'apellidos', 'correo', 'telefono', 'direccion', 'fecha_nacimiento', 'DNI', 'sexo'];

// Detectar duplicados de DNI o correo al crear un usuario.
// El DNI solo colisiona dentro del mismo rol; el correo colisiona globalmente.
// Devuelve:
//   { bloqueo: { campo, mensaje } } si hay un duplicado activo o un correo perteneciente a otro rol inactivo
//   { inactivos: [...] } con los candidatos a reactivar si los hay (uno o dos según coincidan en el mismo usuario o no)
//   { } si no hay ningún duplicado
const detectarDuplicadosAlCrear = async (DNI, correo, rolNuevo) => {
    const porDni    = await Usuario.findOne({ DNI, rol: rolNuevo });
    const porCorreo = await Usuario.findOne({ correo });

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

// Obtener usuarios con rol 'cliente', con filtros opcionales y paginación opcional
// Si no se pasan pagina/limite, devuelve todos (comportamiento actual para no romper clientes existentes)
export const listarClientes = asyncHandler(async (req, res) => {

    const { activo, nivel, tipo_cuota, pagina, limite } = req.query;

    // Construir un filtro dinámico según los parámetros recibidos
    // activo llega como string desde query params; convertir a booleano
    const filtro = { rol: 'cliente' };
    if (activo === 'true')  filtro.activo = true;
    if (activo === 'false') filtro.activo = false;
    if (nivel) filtro.nivel = nivel;
    if (tipo_cuota) filtro.tipo_cuota = tipo_cuota;

    // Aplicar paginación solo si se pasa pagina o limite; si no, devolver todos
    if (pagina || limite) {
        const p = Math.max(1, Number(pagina) || 1);
        const l = Math.min(100, Math.max(1, Number(limite) || 20));
        const total = await Usuario.countDocuments(filtro);
        const clientes = await Usuario.find(filtro).skip((p - 1) * l).limit(l);
        return res.status(200).json({ clientes, total, pagina: p, limite: l });
    }

    const clientes = await Usuario.find(filtro);
    return res.status(200).json({ clientes });

});

// Devolver el perfil completo del cliente autenticado con la cuota populada
export const obtenerMiPerfil = asyncHandler(async (req, res) => {

    const cliente = await Usuario.findById(req.usuario.id).populate('tipo_cuota');
    if (!cliente) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    return res.status(200).json({ cliente });

});

// Buscar un cliente por su ID y devolverlo si existe y tiene rol 'cliente'
export const verCliente = asyncHandler(async (req, res) => {

    const { valido } = validarObjectId(req.params.id);
    if (!valido) return res.status(400).json({ mensaje: 'ID no válido' });

    const cliente = await Usuario.findById(req.params.id);

    // Devolver 404 si no existe o si el usuario no es cliente
    if (!cliente || cliente.rol !== 'cliente') {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    return res.status(200).json({ cliente });

});

// Crear un nuevo cliente: validar datos, comprobar duplicados, generar contraseña temporal y enviar email de bienvenida
export const crearCliente = asyncHandler(async (req, res) => {

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
    const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordTemporal = generarPasswordTemporal();
    const contrasenaCifrada = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

    // Crear el documento y guardarlo con rol fijo 'cliente'
    // forzar_cambio_password en true para obligarle a cambiar la temporal en su primer login
    const nuevoCliente = new Usuario({
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
        html: emailTemplate('¡Bienvenido/a a GymSuite!', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml(nombre)}</strong>.
            </p>
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Tu cuenta ha sido creada. Inicia sesión con tu correo y esta contraseña temporal:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:16px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:22px;font-weight:bold;letter-spacing:4px;color:#F09540;font-family:monospace;">${passwordTemporal}</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
        `),
    });

    // Eliminar contrasena del objeto en memoria antes de serializar
    // select:false solo aplica a queries, no a documentos creados con new Model()
    nuevoCliente.contrasena = undefined;
    await auditar('crear_cliente', req, { correo });
    return res.status(201).json({ mensaje: 'Cliente creado correctamente', cliente: nuevoCliente });

});

// Actualizar los datos de un cliente, ignorando campos que no se deben modificar desde aquí
export const editarCliente = asyncHandler(async (req, res) => {

    // Extraer solo los campos permitidos (whitelist): evita mass-assignment de activo, forzar_cambio_password, etc.
    const datos = {};
    for (const campo of CAMPOS_EDITABLES_CLIENTE) {
        if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    }

    // Validar el formato de los datos editables
    const { valido, errores } = validarEditarUsuario(datos);
    if (!valido) return res.status(400).json({ errores });

    // Comprobar duplicados excluyendo el propio documento
    // El DNI solo choca dentro del mismo rol; aquí el rol fijo es 'cliente'
    const id = req.params.id;
    if (datos.DNI    && await Usuario.findOne({ DNI:    datos.DNI, rol: 'cliente', _id: { $ne: id } })) return res.status(400).json({ campo: 'DNI',    mensaje: 'Ya existe un cliente con ese DNI.' });
    if (datos.correo && await Usuario.findOne({ correo: datos.correo,              _id: { $ne: id } })) return res.status(400).json({ campo: 'correo', mensaje: 'Ya existe un usuario con ese correo.' });

    // Actualizar solo los campos permitidos y devolver el documento actualizado
    const clienteActualizado = await Usuario.findByIdAndUpdate(
        req.params.id,
        { $set: datos },
        { new: true, runValidators: true }
    );
    return res.status(200).json({ mensaje: 'Cliente editado correctamente', cliente: clienteActualizado });

});

// Desactivar un usuario marcando su campo 'activo' como false
export const darDeBaja = asyncHandler(async (req, res) => {

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        req.params.id,
        { activo: false },
        { new: true, runValidators: true }
    );

    if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    await auditar('baja_usuario', req, { usuario_id: req.params.id });
    return res.status(200).json({ mensaje: 'Usuario dado de baja correctamente', usuario: usuarioActualizado });

});

// Reactivar un usuario marcando su campo 'activo' como true y refrescando su fecha de alta
// La fecha de alta se actualiza porque la reactivación equivale a un nuevo periodo de actividad en el gimnasio
export const darDeAlta = asyncHandler(async (req, res) => {

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        req.params.id,
        { activo: true, fecha_alta: new Date() },
        { new: true, runValidators: true }
    );

    if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    await auditar('alta_usuario', req, { usuario_id: req.params.id });
    return res.status(200).json({ mensaje: 'Usuario dado de alta correctamente', usuario: usuarioActualizado });

});

// Asignar un nuevo tipo de cuota a un cliente, eliminar sus pagos pendientes y actualizar el documento
export const cambiarCuota = asyncHandler(async (req, res) => {

    const nuevaCuota = req.body.nuevaCuota;

    // Validar que el ID de la cuota tiene formato correcto antes de usarlo
    const { valido, error } = validarObjectId(nuevaCuota);
    if (!valido) return res.status(400).json({ mensaje: error });

    const clienteActualizado = await Usuario.findByIdAndUpdate(
        req.params.id,
        { tipo_cuota: nuevaCuota },
        { new: true, runValidators: true }
    );

    if (!clienteActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Eliminar los pagos pendientes del cliente para que se regeneren con la nueva cuota
    await Pagos.deleteMany({ cliente_id: req.params.id, pendiente: true });

    return res.status(200).json({ mensaje: 'Cuota actualizada correctamente', cliente: clienteActualizado });

});

// Obtener todos los empleados (admin y entrenador) de la base de datos, aplicando filtros opcionales
// Obtener empleados (admin/entrenador) con filtros opcionales y paginación opcional
export const listarEmpleados = asyncHandler(async (req, res) => {

    const { activo, rol, pagina, limite } = req.query;

    // Rechazar peticiones que intenten filtrar por rol de cliente
    if (rol === 'cliente') return res.status(400).json({ mensaje: 'Rol no válido para este endpoint' });

    // Construir un filtro dinámico: si no se especifica rol, devolver todos los empleados
    // activo llega como string desde query params; convertir a booleano
    const filtro = { rol: rol || { $in: ['admin', 'entrenador'] } };
    if (activo === 'true')  filtro.activo = true;
    if (activo === 'false') filtro.activo = false;

    // Aplicar paginación solo si se pasan los parámetros
    if (pagina || limite) {
        const p = Math.max(1, Number(pagina) || 1);
        const l = Math.min(100, Math.max(1, Number(limite) || 20));
        const total = await Usuario.countDocuments(filtro);
        const empleados = await Usuario.find(filtro).skip((p - 1) * l).limit(l);
        return res.status(200).json({ empleados, total, pagina: p, limite: l });
    }

    const empleados = await Usuario.find(filtro);
    return res.status(200).json({ empleados });

});

// Buscar un empleado por su ID y devolverlo si existe y tiene rol 'admin' o 'entrenador'
export const verEmpleado = asyncHandler(async (req, res) => {

    const { valido } = validarObjectId(req.params.id);
    if (!valido) return res.status(400).json({ mensaje: 'ID no válido' });

    const empleado = await Usuario.findById(req.params.id);

    // Devolver el empleado si existe y su rol es correcto, sino devolver 404
    if (!empleado || (empleado.rol !== 'admin' && empleado.rol !== 'entrenador')) {
        return res.status(404).json({ mensaje: 'Empleado no encontrado' });
    }

    return res.status(200).json({ empleado });

});

// Crear un nuevo empleado (entrenador o admin): validar datos, comprobar duplicados, generar contraseña temporal y enviar email de bienvenida
export const crearEmpleado = asyncHandler(async (req, res) => {

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
    const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordTemporal = generarPasswordTemporal();
    const contrasenaCifrada = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

    // Crear el documento con el rol recibido (admin o entrenador)
    // forzar_cambio_password en true para obligarle a cambiar la temporal en su primer login
    const nuevoEmpleado = new Usuario({
        nombre, apellidos, correo, contrasena: contrasenaCifrada,
        telefono, direccion, fecha_nacimiento, DNI, rol,
        forzar_cambio_password: true,
    });
    await nuevoEmpleado.save();

    // Enviar email de bienvenida con la contraseña temporal
    await sendMail({
        to: correo,
        subject: 'Bienvenido a GymSuite',
        html: emailTemplate('¡Bienvenido/a a GymSuite!', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml(nombre)}</strong>.
            </p>
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Tu cuenta ha sido creada. Inicia sesión con tu correo y esta contraseña temporal:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:16px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:22px;font-weight:bold;letter-spacing:4px;color:#F09540;font-family:monospace;">${passwordTemporal}</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Por seguridad, deberás cambiarla nada más iniciar sesión.</p>
        `),
    });

    nuevoEmpleado.contrasena = undefined;
    await auditar(rol === 'admin' ? 'crear_admin' : 'crear_entrenador', req, { correo, rol });
    return res.status(201).json({ mensaje: 'Empleado creado correctamente', empleado: nuevoEmpleado });

});

// Actualizar los datos de un empleado, ignorando campos de cliente y campos no modificables
export const editarEmpleado = asyncHandler(async (req, res) => {

    // Comprobar que el usuario objetivo es un empleado, no un cliente
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (usuario.rol === 'cliente') return res.status(403).json({ mensaje: 'No se puede editar un cliente desde este endpoint' });

    // Extraer solo los campos permitidos (whitelist): evita mass-assignment de activo, forzar_cambio_password, etc.
    const datos = {};
    for (const campo of CAMPOS_EDITABLES_EMPLEADO) {
        if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    }

    // Validar el formato de los datos editables
    const { valido, errores } = validarEditarUsuario(datos);
    if (!valido) return res.status(400).json({ errores });

    // Comprobar duplicados excluyendo el propio documento
    // El DNI solo choca dentro del mismo rol del empleado
    const id = req.params.id;
    if (datos.DNI    && await Usuario.findOne({ DNI:    datos.DNI, rol: usuario.rol, _id: { $ne: id } })) return res.status(400).json({ campo: 'DNI',    mensaje: `Ya existe un ${usuario.rol} con ese DNI.` });
    if (datos.correo && await Usuario.findOne({ correo: datos.correo,                _id: { $ne: id } })) return res.status(400).json({ campo: 'correo', mensaje: 'Ya existe un usuario con ese correo.' });

    // Actualizar solo los campos permitidos y devolver el documento actualizado
    const empleadoActualizado = await Usuario.findByIdAndUpdate(
        req.params.id,
        { $set: datos },
        { new: true, runValidators: true }
    );
    return res.status(200).json({ mensaje: 'Empleado editado correctamente', empleado: empleadoActualizado });

});

// FUNCIONES PARA STATS

// Contar el total de clientes activos en la base de datos
export const obtenerTotalClientes = asyncHandler(async (_req, res) => {

    // Contar solo los usuarios con rol 'cliente' y activos
    const total = await Usuario.countDocuments({ rol: 'cliente', activo: true });
    return res.status(200).json({ total });

});

// Contar el total de trabajadores activos (entrenadores y admins) en la base de datos
export const obtenerTotalTrabajadores = asyncHandler(async (_req, res) => {

    // Contar los usuarios con rol 'entrenador' o 'admin' que estén activos
    const total = await Usuario.countDocuments({ rol: { $in: ['entrenador', 'admin'] }, activo: true });
    return res.status(200).json({ total });

});

// Contar los clientes dados de alta en el último mes y en el último año
export const obtenerStatsAltas = asyncHandler(async (_req, res) => {

    const ahora = new Date();

    // Calcular la fecha de inicio del mes actual y la de hace 12 meses
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioAnio = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

    // Contar clientes cuya fecha_alta cae dentro de cada rango
    const ultimoMes = await Usuario.countDocuments({ rol: 'cliente', fecha_alta: { $gte: inicioMes } });
    const ultimoAnio = await Usuario.countDocuments({ rol: 'cliente', fecha_alta: { $gte: inicioAnio } });

    return res.status(200).json({ ultimoMes, ultimoAnio });

});
