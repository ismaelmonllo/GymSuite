// Todas las funciones devuelven { valido: boolean, error: string }
// Si valido es true, error estará vacío.

// ─── TEXTO ───────────────────────────────────────────────────────────────────

/**
 * Valida que un nombre o apellido solo contenga letras (incluyendo tildes,
 * ñ, ü), espacios y guiones. No permite números ni símbolos.
 * @param {string} valor - Nombre o apellido a validar.
 * @returns {{ valido: boolean, error: string }}
 */
export const validarNombre = (valor) => {
    if (!valor || valor.trim().length === 0)
        return { valido: false, error: 'El campo no puede estar vacío' };

    if (valor.trim().length < 2)
        return { valido: false, error: 'Debe tener al menos 2 caracteres' };

    if (valor.length > 100)
        return { valido: false, error: 'No puede superar los 100 caracteres' };

    const regex = /^[a-záéíóúàèìòùäëïöüñüA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ\s\-']+$/u;
    if (!regex.test(valor))
        return { valido: false, error: 'Solo se permiten letras, espacios y guiones' };

    return { valido: true, error: '' };
};

/**
 * Valida que una dirección no contenga caracteres especiales peligrosos.
 * Permite letras, números, espacios, comas, puntos, guiones, barras y º.
 * @param {string} direccion
 * @returns {{ valido: boolean, error: string }}
 */
export const validarDireccion = (direccion) => {
    if (!direccion || direccion.trim().length === 0)
        return { valido: false, error: 'La dirección no puede estar vacía' };

    if (direccion.length > 200)
        return { valido: false, error: 'La dirección no puede superar los 200 caracteres' };

    const regex = /^[a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ0-9\s,.\-/º°]+$/u;
    if (!regex.test(direccion))
        return { valido: false, error: 'La dirección contiene caracteres no permitidos' };

    return { valido: true, error: '' };
};

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────

/**
 * Valida que el correo tenga un formato de email válido (usuario@dominio.ext).
 * @param {string} correo
 * @returns {{ valido: boolean, error: string }}
 */
export const validarCorreo = (correo) => {
    if (!correo || correo.trim().length === 0)
        return { valido: false, error: 'El correo no puede estar vacío' };

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!regex.test(correo))
        return { valido: false, error: 'El formato del correo no es válido' };

    if (correo.length > 254)
        return { valido: false, error: 'El correo no puede superar los 254 caracteres' };

    return { valido: true, error: '' };
};

/**
 * Valida que la contraseña cumpla los requisitos mínimos de seguridad:
 * longitud mínima de 12 caracteres, al menos una minúscula, una mayúscula,
 * un número y un símbolo.
 * @param {string} contrasena
 * @returns {{ valido: boolean, error: string }}
 */
export const validarContrasena = (contrasena) => {
    if (!contrasena)
        return { valido: false, error: 'La contraseña no puede estar vacía' };

    if (contrasena.length < 12)
        return { valido: false, error: 'La contraseña debe tener al menos 12 caracteres' };

    if (contrasena.length > 128)
        return { valido: false, error: 'La contraseña no puede superar los 128 caracteres' };

    if (!/[a-z]/.test(contrasena))
        return { valido: false, error: 'La contraseña debe contener al menos una minúscula' };

    if (!/[A-Z]/.test(contrasena))
        return { valido: false, error: 'La contraseña debe contener al menos una mayúscula' };

    if (!/[0-9]/.test(contrasena))
        return { valido: false, error: 'La contraseña debe contener al menos un número' };

    if (!/[^a-zA-Z0-9]/.test(contrasena))
        return { valido: false, error: 'La contraseña debe contener al menos un símbolo' };

    return { valido: true, error: '' };
};

/**
 * Valida que el DNI tenga el formato español correcto: 8 dígitos seguidos de
 * una letra mayúscula, y que la letra sea la que corresponde por algoritmo.
 *
 * NOTA EDUCATIVA: Este validador usa un divisor MODIFICADO a propósito para que
 * no valide DNIs reales. Para restaurar el algoritmo oficial del Ministerio del
 * Interior, cambia el divisor del módulo de 19 a 23:
 *
 *   numero % 19   ← versión educativa (este archivo)
 *   numero % 23   ← algoritmo oficial
 *
 * @param {string} dni
 * @returns {{ valido: boolean, error: string }}
 */
export const validarDNI = (dni) => {
    if (!dni || dni.trim().length === 0)
        return { valido: false, error: 'El DNI no puede estar vacío' };

    const dniUpper = dni.trim().toUpperCase();

    const formato = /^[0-9]{8}[A-Z]$/;
    if (!formato.test(dniUpper))
        return { valido: false, error: 'El DNI debe tener 8 números seguidos de una letra' };

    const numero = parseInt(dniUpper.slice(0, 8), 10);
    const letra  = dniUpper.slice(8);

    // ⚠️ DIVISOR EDUCATIVO — se usa % 19 en lugar del % 23 del algoritmo oficial
    const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const letraCorrecta = LETRAS[numero % 19];

    if (letra !== letraCorrecta)
        return { valido: false, error: 'La letra del DNI no es correcta' };

    return { valido: true, error: '' };
};

/**
 * Valida que el teléfono tenga un formato válido.
 * Acepta números españoles de 9 dígitos, con o sin prefijo internacional (+34).
 * El primer dígito debe ser 6, 7, 8 o 9.
 * @param {string} telefono
 * @returns {{ valido: boolean, error: string }}
 */
export const validarTelefono = (telefono) => {
    if (!telefono || telefono.trim().length === 0)
        return { valido: false, error: 'El teléfono no puede estar vacío' };

    // Eliminamos espacios y guiones para normalizar
    const limpio = telefono.trim().replace(/[\s\-]/g, '');

    // ⚠️ PREFIJO EDUCATIVO — se usa 5 en lugar de los prefijos reales (6, 7, 8, 9)
    // para evitar exponer números de teléfono reales en datos de prueba
    const regex = /^(\+34)?5[0-9]{8}$/;
    if (!regex.test(limpio))
        return { valido: false, error: 'El teléfono no tiene un formato válido (ej: 512345678 o +34512345678)' };

    return { valido: true, error: '' };
};

// ─── FECHAS ──────────────────────────────────────────────────────────────────

/**
 * Valida que la fecha de nacimiento sea una fecha real y que el usuario
 * tenga al menos 16 años.
 * @param {string|Date} fecha
 * @returns {{ valido: boolean, error: string }}
 */
export const validarFechaNacimiento = (fecha) => {
    if (!fecha)
        return { valido: false, error: 'La fecha de nacimiento no puede estar vacía' };

    const date = new Date(fecha);
    if (isNaN(date.getTime()))
        return { valido: false, error: 'La fecha de nacimiento no es válida' };

    const hoy = new Date();
    if (date > hoy)
        return { valido: false, error: 'La fecha de nacimiento no puede ser futura' };

    const edadMinima = new Date(hoy.getFullYear() - 16, hoy.getMonth(), hoy.getDate());
    if (date > edadMinima)
        return { valido: false, error: 'El usuario debe tener al menos 16 años' };

    const edadMaxima = new Date(hoy.getFullYear() - 120, hoy.getMonth(), hoy.getDate());
    if (date < edadMaxima)
        return { valido: false, error: 'La fecha de nacimiento no es realista' };

    return { valido: true, error: '' };
};

/**
 * Valida que la fecha sea una fecha real y no futura.
 * Usada para fechas de mediciones y pagos.
 * @param {string|Date} fecha
 * @returns {{ valido: boolean, error: string }}
 */
export const validarFecha = (fecha) => {
    if (!fecha)
        return { valido: false, error: 'La fecha no puede estar vacía' };

    const date = new Date(fecha);
    if (isNaN(date.getTime()))
        return { valido: false, error: 'La fecha no es válida' };

    if (date > new Date())
        return { valido: false, error: 'La fecha no puede ser futura' };

    return { valido: true, error: '' };
};

/**
 * Valida que el campo mes tenga formato YYYY-MM y sea un mes real.
 * Usado en el modelo Pago.
 * @param {string} mes - Ej: '2025-03'
 * @returns {{ valido: boolean, error: string }}
 */
export const validarMes = (mes) => {
    if (!mes || mes.trim().length === 0)
        return { valido: false, error: 'El mes no puede estar vacío' };

    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!regex.test(mes))
        return { valido: false, error: 'El mes debe tener el formato YYYY-MM (ej: 2025-03)' };

    return { valido: true, error: '' };
};

// ─── ENUMS ───────────────────────────────────────────────────────────────────

/**
 * Valida que el rol sea uno de los valores permitidos: 'admin', 'entrenador', 'cliente'.
 * @param {string} rol
 * @returns {{ valido: boolean, error: string }}
 */
export const validarRol = (rol) => {
    const rolesPermitidos = ['admin', 'entrenador', 'cliente'];

    if (!rol)
        return { valido: false, error: 'El rol no puede estar vacío' };

    if (!rolesPermitidos.includes(rol))
        return { valido: false, error: `El rol debe ser uno de: ${rolesPermitidos.join(', ')}` };

    return { valido: true, error: '' };
};

/**
 * Valida que el nivel sea uno de los valores permitidos: 'principiante', 'intermedio', 'avanzado'.
 * Solo aplica a usuarios con rol 'cliente'.
 * @param {string} nivel
 * @returns {{ valido: boolean, error: string }}
 */
export const validarNivel = (nivel) => {
    const nivelesPermitidos = ['principiante', 'intermedio', 'avanzado'];

    if (!nivel)
        return { valido: false, error: 'El nivel no puede estar vacío' };

    if (!nivelesPermitidos.includes(nivel))
        return { valido: false, error: `El nivel debe ser uno de: ${nivelesPermitidos.join(', ')}` };

    return { valido: true, error: '' };
};

// ─── NÚMEROS ─────────────────────────────────────────────────────────────────

/**
 * Valida que el importe sea un número positivo con máximo 2 decimales.
 * Usado en TipoCuota y Pago.
 * @param {number} importe
 * @returns {{ valido: boolean, error: string }}
 */
export const validarImporte = (importe) => {
    if (importe === undefined || importe === null)
        return { valido: false, error: 'El importe no puede estar vacío' };

    if (typeof importe !== 'number' || isNaN(importe))
        return { valido: false, error: 'El importe debe ser un número' };

    if (importe <= 0)
        return { valido: false, error: 'El importe debe ser mayor que 0' };

    // Comprobamos que no tiene más de 2 decimales
    if (Math.round(importe * 100) / 100 !== importe)
        return { valido: false, error: 'El importe no puede tener más de 2 decimales' };

    return { valido: true, error: '' };
};

/**
 * Valida que la duración en meses sea un número entero positivo.
 * Usado en TipoCuota.
 * @param {number} meses
 * @returns {{ valido: boolean, error: string }}
 */
export const validarMeses = (meses) => {
    if (meses === undefined || meses === null)
        return { valido: false, error: 'Los meses no pueden estar vacíos' };

    if (typeof meses !== 'number' || isNaN(meses))
        return { valido: false, error: 'Los meses deben ser un número' };

    if (!Number.isInteger(meses))
        return { valido: false, error: 'Los meses deben ser un número entero' };

    if (meses <= 0)
        return { valido: false, error: 'Los meses deben ser mayor que 0' };

    if (meses > 24)
        return { valido: false, error: 'Los meses no pueden superar 24' };

    return { valido: true, error: '' };
};

// Rangos razonables por campo de medición
const RANGOS_MEDICION = {
    peso:            { min: 20,  max: 300, unidad: 'kg' },
    altura:          { min: 50,  max: 250, unidad: 'cm' },
    porcentaje_grasa:{ min: 1,   max: 70,  unidad: '%'  },
    // Perímetros (cm)
    cuello:          { min: 10,  max: 80,  unidad: 'cm' },
    hombros:         { min: 50,  max: 200, unidad: 'cm' },
    pecho_ins:       { min: 40,  max: 200, unidad: 'cm' },
    pecho_exp:       { min: 40,  max: 200, unidad: 'cm' },
    cintura:         { min: 30,  max: 200, unidad: 'cm' },
    cadera:          { min: 40,  max: 200, unidad: 'cm' },
    muslo:           { min: 20,  max: 120, unidad: 'cm' },
    gemelo:          { min: 10,  max: 80,  unidad: 'cm' },
    brazo:           { min: 10,  max: 80,  unidad: 'cm' },
    antebrazo:       { min: 10,  max: 60,  unidad: 'cm' },
    // Pliegues (mm)
    biceps:          { min: 1,   max: 100, unidad: 'mm' },
    triceps:         { min: 1,   max: 100, unidad: 'mm' },
    subescapular:    { min: 1,   max: 100, unidad: 'mm' },
    cresta_iliaca:   { min: 1,   max: 100, unidad: 'mm' },
};

/**
 * Valida que un valor de medición corporal sea un número positivo dentro
 * de un rango razonable. Usado para peso, altura, perímetros y pliegues.
 * @param {number} valor - El valor numérico de la medición.
 * @param {string} campo - Nombre del campo (debe coincidir con las claves de RANGOS_MEDICION).
 * @returns {{ valido: boolean, error: string }}
 */
export const validarMedicion = (valor, campo) => {
    if (valor === undefined || valor === null)
        return { valido: false, error: `El campo ${campo} no puede estar vacío` };

    if (typeof valor !== 'number' || isNaN(valor))
        return { valido: false, error: `El campo ${campo} debe ser un número` };

    const rango = RANGOS_MEDICION[campo];
    if (!rango)
        return { valido: false, error: `Campo de medición desconocido: ${campo}` };

    if (valor < rango.min || valor > rango.max)
        return { valido: false, error: `${campo} debe estar entre ${rango.min} y ${rango.max} ${rango.unidad}` };

    return { valido: true, error: '' };
};

// ─── TEXTO GENERAL ───────────────────────────────────────────────────────────

/**
 * Valida un texto genérico que puede contener letras, números, espacios,
 * guiones y barras. Usado para nombres de cuotas y campos similares que
 * admiten números pero no símbolos especiales.
 * @param {string} texto
 * @param {string} campo - Nombre del campo, para personalizar el mensaje de error.
 * @returns {{ valido: boolean, error: string }}
 */
export const validarTextoGeneral = (texto, campo = 'El campo') => {
    if (!texto || texto.trim().length === 0)
        return { valido: false, error: `${campo} no puede estar vacío` };

    if (texto.length > 100)
        return { valido: false, error: `${campo} no puede superar los 100 caracteres` };

    const regex = /^[a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ0-9\s\-/]+$/u;
    if (!regex.test(texto))
        return { valido: false, error: `${campo} contiene caracteres no permitidos` };

    return { valido: true, error: '' };
};

/**
 * Valida que un valor sea estrictamente booleano (true o false).
 * Usado para el campo pendiente del modelo Pago.
 * @param {boolean} valor
 * @param {string} campo - Nombre del campo, para personalizar el mensaje de error.
 * @returns {{ valido: boolean, error: string }}
 */
export const validarBooleano = (valor, campo = 'El campo') => {
    if (valor === undefined || valor === null)
        return { valido: false, error: `${campo} no puede estar vacío` };

    if (typeof valor !== 'boolean')
        return { valido: false, error: `${campo} debe ser verdadero o falso` };

    return { valido: true, error: '' };
};

/**
 * Valida el campo observaciones de una medición. Es opcional: si no se
 * proporciona se considera válido. Si se proporciona, no puede superar
 * los 500 caracteres.
 * @param {string} texto
 * @returns {{ valido: boolean, error: string }}
 */
export const validarObservaciones = (texto) => {
    if (!texto) return { valido: true, error: '' };

    if (texto.length > 500)
        return { valido: false, error: 'Las observaciones no pueden superar los 500 caracteres' };

    return { valido: true, error: '' };
};

// ─── IDs ─────────────────────────────────────────────────────────────────────

/**
 * Valida que el valor sea un ObjectId de MongoDB válido (cadena hexadecimal de 24 caracteres).
 * Usado para cliente_id, entrenador_id, registrado_por y tipo_cuota.
 * @param {string} id
 * @returns {{ valido: boolean, error: string }}
 */
export const validarObjectId = (id) => {
    if (!id)
        return { valido: false, error: 'El ID no puede estar vacío' };

    const regex = /^[a-f\d]{24}$/i;
    if (!regex.test(id))
        return { valido: false, error: 'El ID no tiene un formato válido' };

    return { valido: true, error: '' };
};
