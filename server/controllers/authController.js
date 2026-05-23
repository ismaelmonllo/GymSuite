import Usuario from '../models/UsuarioModel.js';
import Otp from '../models/OtpModel.js';
import ResetToken from '../models/ResetTokenModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validarLogin, validarCambioContrasenaPropio } from '../validators/validarRegistros.js';
import { validarObjectId } from '../validators/validarCampos.js';
import { sendMail, escaparHtml, emailTemplate } from '../utils/mailer.js';
import { auditar } from '../utils/audit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// Opciones de cookie para el refresh token: ajustar sameSite/secure según entorno
const cookieOpciones = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
};

// Hash dummy generado al arrancar el módulo: se compara contra él cuando el correo no existe
// para que el tiempo de respuesta sea similar al de un correo válido y no se filtre la existencia
const HASH_DUMMY = bcrypt.hashSync('dummy', 10);

/**
 * Generar un código OTP numérico de 6 dígitos usando un PRNG criptográficamente
 * seguro (`crypto.randomInt`), evitando los patrones predecibles de `Math.random`.
 * @returns {string} Código de 6 dígitos como string (con ceros a la izquierda si aplica).
 */
const generarOTP = () => String(crypto.randomInt(100000, 1000000));

// Opciones de la cookie de dispositivo de confianza 2FA: 7 días (compromiso UX vs seguridad)
const cookie2FAOpciones = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Firmar la cookie `2fa_verificado` atándola al usuario y a un hash del
 * User-Agent. El formato resultante es `<usuarioId>.<uaHash16>.<firma32>`,
 * de manera que copiar la cookie a otro navegador (con UA distinta) la
 * invalida sin necesidad de mantener estado en el servidor.
 * @param {string} usuarioId - ID del usuario al que se ata la cookie.
 * @param {string|undefined} userAgent - Cabecera User-Agent del request.
 * @returns {string} Valor firmado para guardar en la cookie.
 */
const firmar2FA = (usuarioId, userAgent) => {
    const uaHash = crypto.createHash('sha256').update(userAgent ?? '').digest('hex').slice(0, 16);
    const datos = `${usuarioId}.${uaHash}`;
    const firma = crypto
        .createHmac('sha256', process.env.JWT_REFRESH_SECRET)
        .update(datos)
        .digest('hex')
        .slice(0, 32);
    return `${datos}.${firma}`;
};

/**
 * Verificar la cookie `2fa_verificado` en tiempo constante. Cualquier
 * alteración del valor o cambio del User-Agent invalida la firma y la
 * función devuelve false.
 * @param {string|undefined} cookie - Valor de la cookie tal como llega.
 * @param {string} usuarioId - ID del usuario que está iniciando sesión.
 * @param {string|undefined} userAgent - Cabecera User-Agent del request.
 * @returns {boolean} True si la cookie es válida para este usuario y UA.
 */
const verificar2FACookie = (cookie, usuarioId, userAgent) => {
    if (!cookie) return false;
    if (cookie.split('.').length !== 3) return false;
    const esperada = firmar2FA(usuarioId, userAgent);
    const a = Buffer.from(cookie);
    const b = Buffer.from(esperada);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

/**
 * Emitir el par de tokens al usuario: JWT de acceso (15 minutos) y refresh
 * token en cookie httpOnly (7 días). El payload de acceso incluye datos
 * básicos del usuario y el flag `forzar_cambio_password`.
 * @param {import('mongoose').Document} usuario - Documento Mongoose del usuario.
 * @param {import('express').Response} res - Para fijar la cookie del refresh.
 * @returns {string} JWT de acceso para devolver al frontend.
 */
const emitirTokens = (usuario, res) => {
    const userToken = jwt.sign(
        {
            id: usuario._id,
            rol: usuario.rol,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            forzar_cambio_password: !!usuario.forzar_cambio_password,
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: usuario._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie('refresh_token', refreshToken, cookieOpciones);
    return userToken;
};

/**
 * Iniciar sesión. Valida credenciales y rol según pestaña (cliente/trabajador),
 * decide si el dispositivo necesita 2FA y, si lo necesita, envía el OTP por
 * email. Si la cookie de dispositivo de confianza es válida, salta el 2FA y
 * emite tokens directamente.
 * @param {import('express').Request} req - Body: `{ correo, contrasena, tab }`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con `{ token }` o `{ requiere2FA: true }`; 401/403 si falla.
 */
export const login = asyncHandler(async (req, res) => {

    const { correo, contrasena, tab } = req.body;

    // Validar formato de los datos antes de consultar la base de datos
    const { valido, errores } = validarLogin({ correo, contrasena });
    if (!valido) return res.status(400).json({ mensaje: 'Datos inválidos', errores });

    // Buscar el usuario por correo; incluir contrasena explícitamente (select:false en schema)
    const usuario = await Usuario.findOne({ correo }).select('+contrasena');

    // Comparar siempre contra un hash (real si existe, dummy si no) para que el tiempo de
    // respuesta no permita enumerar correos válidos y la respuesta sea genérica
    const hashAComparar = usuario?.contrasena ?? HASH_DUMMY;
    const coincide = await bcrypt.compare(contrasena, hashAComparar);
    if (!usuario || !coincide) {
        await auditar('login_fail', req, { correo });
        return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // Bloquear acceso a usuarios dados de baja (campo activo: false)
    // Comprobado tras la contraseña para no filtrar el estado a quien no tiene credenciales válidas
    if (!usuario.activo) return res.status(403).json({ mensaje: 'Cuenta deshabilitada' });

    // Si 2FA está desactivado por variable de entorno, emitir tokens directamente
    // Guard de producción: ignorar la flag si NODE_ENV=production para evitar que un
    // descuido de configuración deje el 2FA desactivado en producción
    if (process.env.DISABLE_2FA === 'true' && process.env.NODE_ENV !== 'production') {
        await auditar('login_ok', req, { correo, metodo: 'sin_2fa_dev' });
        const token = emitirTokens(usuario, res);
        return res.status(200).json({ token });
    }

    // Validar que el rol del usuario corresponde a la pestaña desde la que intenta entrar
    const rolValido =
        tab === 'cliente' ? usuario.rol === 'cliente' :
        tab === 'trabajador' ? usuario.rol === 'admin' || usuario.rol === 'entrenador' :
        false;
    if (!rolValido) {
        return res.status(403).json({
            mensaje: tab === 'cliente'
                ? 'Esta cuenta no es de cliente. Usa la pestaña Trabajador.'
                : 'Esta cuenta no es de trabajador. Usa la pestaña Cliente.',
        });
    }

    // Si el dispositivo ya verificó 2FA en los últimos 7 días, emitir tokens directamente.
    // La cookie va firmada con id_usuario + hash(Usuario-Agent): copiarla a otro navegador la invalida.
    const cookie2FA = req.cookies?.['2fa_verificado'];
    if (cookie2FA && verificar2FACookie(cookie2FA, usuario._id.toString(), req.headers['user-agent'])) {
        await auditar('login_ok', req, { correo, metodo: 'dispositivo_confianza' });
        const token = emitirTokens(usuario, res);
        return res.status(200).json({ token });
    }

    // Generar OTP, guardarlo en BD con 5 minutos de expiración y enviarlo por email
    // findOneAndUpdate con upsert sobrescribe cualquier OTP previo del mismo correo
    const codigo = generarOTP();
    const expira = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.findOneAndUpdate({ correo }, { codigo, expira }, { upsert: true });

    await sendMail({
        to: correo,
        subject: 'Tu código de verificación - GymSuite',
        html: emailTemplate('Código de verificación', `
            <p style="margin:0 0 20px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Introduce este código para completar tu inicio de sesión:
            </p>
            <div style="background-color:#1A1A1A;border:2px solid #E5702A;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
                <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#F09540;font-family:monospace;">${codigo}</span>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">Caduca en 5 minutos. Si no iniciaste sesión, ignora este correo.</p>
        `),
    });

    return res.status(200).json({ requiere2FA: true });

});

/**
 * Verificar el código OTP que el usuario ha recibido por email y completar
 * el login. Aplica límite de intentos (5), control de expiración y, si todo
 * es correcto, marca el dispositivo como verificado (cookie 7d) y emite los tokens.
 * @param {import('express').Request} req - Body: `{ correo, codigo }`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con token, 401 si OTP inválido/expirado, 429 si se superan los intentos.
 */
export const verificar2FA = asyncHandler(async (req, res) => {

    const { correo, codigo } = req.body;
    if (!correo || !codigo) return res.status(400).json({ mensaje: 'Faltan datos' });

    const entrada = await Otp.findOne({ correo });

    // Comprobar que existe un OTP pendiente para este correo
    if (!entrada) return res.status(401).json({ mensaje: 'Código no encontrado o ya usado' });

    // Tras 5 intentos fallidos, invalidar el OTP y forzar a relogear (genera uno nuevo)
    // Sin este corte, 10^6 combinaciones del código son brute-forceables en 5 min con paralelismo
    if (entrada.intentos >= 5) {
        await Otp.deleteOne({ correo });
        await auditar('2fa_fail', req, { correo, motivo: 'max_intentos' });
        return res.status(429).json({ mensaje: 'Demasiados intentos. Vuelve a iniciar sesión.' });
    }

    // Comprobar si el OTP ha expirado (defensa adicional al índice TTL, que puede tardar segundos)
    if (Date.now() > entrada.expira.getTime()) {
        await Otp.deleteOne({ correo });
        await auditar('2fa_fail', req, { correo, motivo: 'expirado' });
        return res.status(401).json({ mensaje: 'Código expirado' });
    }

    // Comprobar que el código coincide; cada fallo incrementa el contador para llegar al corte de 5
    if (entrada.codigo !== codigo) {
        await Otp.updateOne({ correo }, { $inc: { intentos: 1 } });
        await auditar('2fa_fail', req, { correo, motivo: 'codigo_incorrecto' });
        return res.status(401).json({ mensaje: 'Código incorrecto' });
    }

    // OTP válido: eliminar de BD para que no pueda reutilizarse
    await Otp.deleteOne({ correo });

    const usuario = await Usuario.findOne({ correo });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Marcar este dispositivo como verificado durante 7 días con cookie firmada
    // El valor encapsula id_usuario + hash(Usuario-Agent) firmado con HMAC: si se copia a otro
    // navegador la UA cambia y la firma deja de cuadrar
    const valor2FA = firmar2FA(usuario._id.toString(), req.headers['user-agent']);
    res.cookie('2fa_verificado', valor2FA, cookie2FAOpciones);

    await auditar('2fa_ok', req, { correo });
    const token = emitirTokens(usuario, res);
    return res.status(200).json({ token });

});

/**
 * Renovar el JWT de acceso usando el refresh token almacenado en la cookie
 * httpOnly. Rechaza también si el usuario ha sido dado de baja, lo que cierra
 * la sesión de 7d para usuarios desactivados.
 * @param {import('express').Request} req - Cookie `refresh_token` requerida.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con nuevo token de acceso o 401 si el refresh no vale.
 */
export const refresh = asyncHandler(async (req, res) => {

    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.status(401).json({ mensaje: 'Sin refresh token' });

    // Verificar la firma y expiración del refresh token
    // El try/catch interno es intencional: jwt.verify lanza si el token es inválido o está expirado
    // y queremos devolver 401, no dejar que llegue al errorHandler como 500
    let payload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
        return res.status(401).json({ mensaje: 'Refresh token inválido o expirado' });
    }

    // Buscar el usuario para incluir datos actualizados en el nuevo token de acceso
    // Rechazar también si está dado de baja: cierra la sesión 7d del refresh para usuarios desactivados
    const usuario = await Usuario.findById(payload.id);
    if (!usuario || !usuario.activo) return res.status(401).json({ mensaje: 'Sesión inválida' });

    const userToken = jwt.sign(
        {
            id: usuario._id,
            rol: usuario.rol,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            forzar_cambio_password: !!usuario.forzar_cambio_password,
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    return res.status(200).json({ token: userToken });

});

/**
 * Cambiar la contraseña propia del usuario autenticado. Verifica la
 * contraseña actual, valida la nueva, la hashea con bcrypt y desactiva el
 * flag `forzar_cambio_password`. Emite un nuevo token con el flag actualizado.
 * @param {import('express').Request} req - Body: `{ contrasenaActual, contrasenaNueva }`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con `{ ok: true, token }`; 401 si la actual no coincide.
 */
export const cambiarContrasena = asyncHandler(async (req, res) => {

    const { contrasenaActual, contrasenaNueva } = req.body;

    const { valido, errores } = validarCambioContrasenaPropio({ contrasenaActual, contrasenaNueva, confirmacion: contrasenaNueva });
    if (!valido) return res.status(400).json({ errores });

    // Incluir contrasena explícitamente para comparar con bcrypt (select:false en schema)
    const usuario = await Usuario.findById(req.usuario.id).select('+contrasena');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Comprobar que la contraseña actual introducida coincide con el hash almacenado
    const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena);
    if (!coincide) return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });

    // Cambiar la contraseña y desactivar el flag de cambio forzoso (si lo tenía activo por alta o reseteo)
    // Emitimos un token nuevo con el flag actualizado para que el frontend pueda continuar sin reloguear
    const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
    const hash = await bcrypt.hash(contrasenaNueva, SALT_ROUNDS);
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        req.usuario.id,
        { contrasena: hash, forzar_cambio_password: false },
        { new: true }
    );

    await auditar('password_change', req, { usuario_id: req.usuario.id });
    const token = emitirTokens(usuarioActualizado, res);
    return res.status(200).json({ ok: true, token });

});

/**
 * Resetear la contraseña de un usuario por parte de un admin. Genera un token
 * de un solo uso (64 hex chars), lo guarda con expiración de 30 min y envía
 * un enlace al correo del usuario. La contraseña actual no cambia hasta que
 * el usuario use el enlace.
 * @param {import('express').Request} req - `params.id` del usuario a resetear.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con `{ ok: true }`; 400 si el id es inválido o 404 si no existe.
 */
export const resetearPassword = asyncHandler(async (req, res) => {

    const { valido } = validarObjectId(req.params.id);
    if (!valido) return res.status(400).json({ mensaje: 'ID no válido' });

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Generar token criptográfico y guardar con expiración de 30 min
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 30 * 60 * 1000);
    await ResetToken.findOneAndUpdate(
        { usuario_id: usuario._id },
        { token, expira },
        { upsert: true }
    );

    const url = `${process.env.FRONTEND_URL}/restablecer/${token}`;
    await sendMail({
        to: usuario.correo,
        subject: 'Restablece tu contraseña - GymSuite',
        html: emailTemplate('Restablece tu contraseña', `
            <p style="margin:0 0 16px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Hola, <strong style="color:#F09540;">${escaparHtml(usuario.nombre)}</strong>.
            </p>
            <p style="margin:0 0 24px 0;color:#FDEBD0;font-size:15px;line-height:1.6;">
                Un administrador ha solicitado el restablecimiento de tu contraseña en GymSuite.
                Haz clic en el botón para establecer una nueva (caduca en 30 minutos):
            </p>
            <div style="text-align:center;margin:0 0 24px 0;">
                <a href="${url}" style="display:inline-block;background-color:#E5702A;color:#1A1A1A;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:6px;">
                    Restablecer contraseña
                </a>
            </div>
            <p style="margin:0;color:#888;font-size:13px;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>
                <a href="${url}" style="color:#F09540;word-break:break-all;">${url}</a>
            </p>
            <p style="margin:16px 0 0 0;color:#888;font-size:13px;">Si no esperabas este correo, ignóralo — tu contraseña actual no ha cambiado.</p>
        `),
    });

    await auditar('password_reset_admin', req, { correo: usuario.correo, usuario_id: usuario._id });
    return res.status(200).json({ ok: true });

});

/**
 * Restablecer la contraseña usando el token del enlace enviado por email.
 * Comprueba expiración, hashea la nueva contraseña y elimina el token para
 * que no pueda reutilizarse.
 * @param {import('express').Request} req - Body: `{ token, contrasenaNueva }`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con `{ ok: true }`; 400 si el token no vale o ha caducado.
 */
export const restablecerPassword = asyncHandler(async (req, res) => {

    const { token, contrasenaNueva } = req.body;
    if (!token) return res.status(400).json({ mensaje: 'Token requerido' });
    if (!contrasenaNueva || contrasenaNueva.length < 8)
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });

    // Buscar el token y verificar que no ha expirado (el TTL puede tardar segundos en limpiar)
    const entrada = await ResetToken.findOne({ token });
    if (!entrada) return res.status(400).json({ mensaje: 'El enlace no es válido o ya fue usado' });
    if (Date.now() > entrada.expira.getTime()) {
        await ResetToken.deleteOne({ token });
        return res.status(400).json({ mensaje: 'El enlace ha caducado. Solicita uno nuevo.' });
    }

    // Actualizar contraseña y limpiar el token de un solo uso
    const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
    const hash = await bcrypt.hash(contrasenaNueva, SALT_ROUNDS);
    await Usuario.findByIdAndUpdate(entrada.usuario_id, { contrasena: hash, forzar_cambio_password: false });
    await ResetToken.deleteOne({ token });

    return res.status(200).json({ ok: true });

});

/**
 * Cerrar sesión. Elimina las cookies `refresh_token` y `2fa_verificado`.
 * Las opciones del clearCookie deben coincidir con las del set original para
 * que el navegador acepte el borrado.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {import('express').Response} 200 con `{ mensaje: 'Sesión cerrada' }`.
 */
export const logout = (_req, res) => {
    const opcionesBase = {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
    };
    res.clearCookie('refresh_token', opcionesBase);
    res.clearCookie('2fa_verificado', opcionesBase);
    return res.status(200).json({ mensaje: 'Sesión cerrada' });
};
