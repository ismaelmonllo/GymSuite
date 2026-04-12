import {
    validarNombre,
    validarDireccion,
    validarCorreo,
    validarContrasena,
    validarDNI,
    validarTelefono,
    validarFechaNacimiento,
    validarFecha,
    validarMes,
    validarNivel,
    validarImporte,
    validarMeses,
    validarMedicion,
    validarObjectId,
    validarTextoGeneral,
    validarBooleano,
    validarObservaciones,
} from './validarCampos.js';

// Todas las funciones devuelven { valido: boolean, errores: { campo: string, error: string }[] }
// Si valido es true, errores estará vacío.

// Helper interno: acumula un error solo si la validación falla
const check = (errores, campo, resultado) => {
    if (!resultado.valido) errores.push({ campo, error: resultado.error });
};

// ─── USUARIO ─────────────────────────────────────────────────────────────────

/**
 * Valida los datos para crear un cliente.
 * Campos obligatorios: nombre, apellidos, correo, contrasena, fecha_nacimiento,
 * DNI, nivel, tipo_cuota.
 * Campos opcionales: telefono, direccion.
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCrearCliente = (datos) => {
    const errores = [];

    check(errores, 'nombre',           validarNombre(datos.nombre));
    check(errores, 'apellidos',        validarNombre(datos.apellidos));
    check(errores, 'correo',           validarCorreo(datos.correo));
    check(errores, 'contrasena',       validarContrasena(datos.contrasena));
    check(errores, 'fecha_nacimiento', validarFechaNacimiento(datos.fecha_nacimiento));
    check(errores, 'DNI',              validarDNI(datos.DNI));
    check(errores, 'nivel',            validarNivel(datos.nivel));
    check(errores, 'tipo_cuota',       validarObjectId(datos.tipo_cuota));

    if (datos.telefono !== undefined)
        check(errores, 'telefono', validarTelefono(datos.telefono));

    if (datos.direccion !== undefined)
        check(errores, 'direccion', validarDireccion(datos.direccion));

    return { valido: errores.length === 0, errores };
};

/**
 * Valida los datos para crear un trabajador (entrenador o admin).
 * Campos obligatorios: nombre, apellidos, correo, contrasena, fecha_nacimiento, DNI, rol.
 * Campos opcionales: telefono, direccion.
 * El rol debe ser 'entrenador' o 'admin', no 'cliente'.
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCrearTrabajador = (datos) => {
    const errores = [];

    check(errores, 'nombre',           validarNombre(datos.nombre));
    check(errores, 'apellidos',        validarNombre(datos.apellidos));
    check(errores, 'correo',           validarCorreo(datos.correo));
    check(errores, 'contrasena',       validarContrasena(datos.contrasena));
    check(errores, 'fecha_nacimiento', validarFechaNacimiento(datos.fecha_nacimiento));
    check(errores, 'DNI',              validarDNI(datos.DNI));

    if (!datos.rol || !['admin', 'entrenador'].includes(datos.rol))
        errores.push({ campo: 'rol', error: "El rol debe ser 'admin' o 'entrenador'" });

    if (datos.telefono !== undefined)
        check(errores, 'telefono', validarTelefono(datos.telefono));

    if (datos.direccion !== undefined)
        check(errores, 'direccion', validarDireccion(datos.direccion));

    return { valido: errores.length === 0, errores };
};

/**
 * Valida los datos para editar cualquier usuario (cliente o trabajador).
 * Ningún campo es obligatorio: solo se validan los campos presentes en datos.
 * No permite cambiar rol ni contrasena por esta vía (hay rutas específicas).
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarEditarUsuario = (datos) => {
    const errores = [];

    if (datos.nombre           !== undefined) check(errores, 'nombre',           validarNombre(datos.nombre));
    if (datos.apellidos        !== undefined) check(errores, 'apellidos',        validarNombre(datos.apellidos));
    if (datos.correo           !== undefined) check(errores, 'correo',           validarCorreo(datos.correo));
    if (datos.fecha_nacimiento !== undefined) check(errores, 'fecha_nacimiento', validarFechaNacimiento(datos.fecha_nacimiento));
    if (datos.DNI              !== undefined) check(errores, 'DNI',              validarDNI(datos.DNI));
    if (datos.telefono         !== undefined) check(errores, 'telefono',         validarTelefono(datos.telefono));
    if (datos.direccion        !== undefined) check(errores, 'direccion',        validarDireccion(datos.direccion));
    if (datos.nivel            !== undefined) check(errores, 'nivel',            validarNivel(datos.nivel));
    if (datos.tipo_cuota       !== undefined) check(errores, 'tipo_cuota',       validarObjectId(datos.tipo_cuota));

    return { valido: errores.length === 0, errores };
};

/**
 * Valida los datos del formulario de login.
 * Solo comprueba que ambos campos lleguen rellenos: el controlador ya se encarga
 * de verificar si el correo existe y si la contraseña coincide con el hash.
 * No se aplica validarContrasena porque en el login se acepta cualquier cadena
 * para compararla con bcrypt, independientemente de su formato.
 * @param {object} datos - { correo, contrasena }
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarLogin = (datos) => {
    const errores = [];

    check(errores, 'correo', validarCorreo(datos.correo));

    if (!datos.contrasena || datos.contrasena.length === 0)
        errores.push({ campo: 'contrasena', error: 'La contraseña no puede estar vacía' });

    return { valido: errores.length === 0, errores };
};

/**
 * Valida el cambio de contraseña del propio usuario.
 * Requiere la contraseña actual para confirmar la identidad.
 * @param {object} datos - { contrasenaActual, contrasenaNueva, confirmacion }
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCambioContrasenaPropio = (datos) => {
    const errores = [];

    if (!datos.contrasenaActual || datos.contrasenaActual.trim().length === 0)
        errores.push({ campo: 'contrasenaActual', error: 'La contraseña actual no puede estar vacía' });

    check(errores, 'contrasenaNueva', validarContrasena(datos.contrasenaNueva));

    if (datos.contrasenaNueva !== datos.confirmacion)
        errores.push({ campo: 'confirmacion', error: 'Las contraseñas no coinciden' });

    return { valido: errores.length === 0, errores };
};

/**
 * Valida el cambio de contraseña hecho por un admin sobre otro usuario.
 * No requiere la contraseña actual.
 * @param {object} datos - { contrasenaNueva, confirmacion }
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCambioContrasenaAdmin = (datos) => {
    const errores = [];

    check(errores, 'contrasenaNueva', validarContrasena(datos.contrasenaNueva));

    if (datos.contrasenaNueva !== datos.confirmacion)
        errores.push({ campo: 'confirmacion', error: 'Las contraseñas no coinciden' });

    return { valido: errores.length === 0, errores };
};

// ─── MEDICION ────────────────────────────────────────────────────────────────

// Todos los campos numéricos opcionales de una medición
const CAMPOS_MEDICION = [
    'peso', 'altura', 'porcentaje_grasa',
    'cuello', 'hombros', 'pecho_ins', 'pecho_exp', 'cintura', 'cadera',
    'muslo', 'gemelo', 'brazo', 'antebrazo',
    'biceps', 'triceps', 'subescapular', 'cresta_iliaca',
];

/**
 * Valida los datos para crear una medición.
 * Campos obligatorios: cliente_id, entrenador_id, fecha.
 * Campos numéricos (opcionales): peso, altura, porcentaje_grasa, perímetros y pliegues.
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCrearMedicion = (datos) => {
    const errores = [];

    check(errores, 'cliente_id',    validarObjectId(datos.cliente_id));
    check(errores, 'entrenador_id', validarObjectId(datos.entrenador_id));
    check(errores, 'fecha',         validarFecha(datos.fecha));

    for (const campo of CAMPOS_MEDICION) {
        if (datos[campo] !== undefined)
            check(errores, campo, validarMedicion(datos[campo], campo));
    }

    check(errores, 'observaciones', validarObservaciones(datos.observaciones));

    return { valido: errores.length === 0, errores };
};

/**
 * Valida los datos para editar una medición.
 * Ningún campo es obligatorio. No permite cambiar cliente_id ni entrenador_id.
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarEditarMedicion = (datos) => {
    const errores = [];

    if (datos.cliente_id !== undefined || datos.entrenador_id !== undefined)
        errores.push({ campo: 'general', error: 'No se puede modificar el cliente o el entrenador de una medición' });

    if (datos.fecha !== undefined)
        check(errores, 'fecha', validarFecha(datos.fecha));

    for (const campo of CAMPOS_MEDICION) {
        if (datos[campo] !== undefined)
            check(errores, campo, validarMedicion(datos[campo], campo));
    }

    check(errores, 'observaciones', validarObservaciones(datos.observaciones));

    return { valido: errores.length === 0, errores };
};

// ─── PAGO ────────────────────────────────────────────────────────────────────

/**
 * Valida los datos para registrar un pago.
 * Campos obligatorios: cliente_id, mes, tipo_cuota, importe, pendiente.
 * Campos opcionales: fecha, registrado_por (se añaden al confirmar el pago).
 * @param {object} datos
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarCrearPago = (datos) => {
    const errores = [];

    check(errores, 'cliente_id',  validarObjectId(datos.cliente_id));
    check(errores, 'mes',         validarMes(datos.mes));
    check(errores, 'tipo_cuota',  validarTextoGeneral(datos.tipo_cuota, 'El tipo de cuota'));
    check(errores, 'importe',     validarImporte(datos.importe));
    check(errores, 'pendiente',   validarBooleano(datos.pendiente, 'El estado de pago'));

    if (datos.fecha !== undefined)
        check(errores, 'fecha', validarFecha(datos.fecha));

    if (datos.registrado_por !== undefined)
        check(errores, 'registrado_por', validarObjectId(datos.registrado_por));

    return { valido: errores.length === 0, errores };
};

/**
 * Valida los datos al confirmar un pago (añadir fecha y registrado_por).
 * @param {object} datos - { fecha, registrado_por }
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarConfirmarPago = (datos) => {
    const errores = [];

    check(errores, 'fecha',          validarFecha(datos.fecha));
    check(errores, 'registrado_por', validarObjectId(datos.registrado_por));

    return { valido: errores.length === 0, errores };
};

// ─── TIPO CUOTA ──────────────────────────────────────────────────────────────

/**
 * Valida los datos para crear o editar un tipo de cuota.
 * Todos los campos son obligatorios tanto en creación como en edición.
 * @param {object} datos - { nombre, meses, importe }
 * @returns {{ valido: boolean, errores: { campo: string, error: string }[] }}
 */
export const validarTipoCuota = (datos) => {
    const errores = [];

    check(errores, 'nombre',  validarTextoGeneral(datos.nombre, 'El nombre'));
    check(errores, 'meses',   validarMeses(datos.meses));
    check(errores, 'importe', validarImporte(datos.importe));

    return { valido: errores.length === 0, errores };
};
