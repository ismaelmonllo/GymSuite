import User from '../models/UsuarioModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validarLogin, validarCambioContrasenaPropio } from '../validators/validarRegistros.js';
import { sendMail } from '../utils/mailer.js';
import { generarPasswordTemporal } from '../utils/passwords.js';

// Opciones de cookie para el refresh token: ajustar sameSite/secure según entorno
const cookieOpciones = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
};

// Almacenamiento temporal de OTPs en memoria: clave = correo, valor = { codigo, expira }
const otpStore = new Map();

// Generar código OTP numérico de 6 dígitos
const generarOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Emitir JWT de acceso (2h) y refresh token en cookie httpOnly (7d)
const emitirTokens = (usuario, res) => {
    const userToken = jwt.sign(
        { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre, apellidos: usuario.apellidos },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
    const refreshToken = jwt.sign(
        { id: usuario._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie('refresh_token', refreshToken, cookieOpciones);
    return userToken;
};

// Iniciar sesión: validar credenciales y comprobar si se necesita 2FA
export const login = async (req, res) => {
    
    try {
        const { correo, contrasena, tab } = req.body;

        // Validar formato de los datos antes de consultar la base de datos
        const { valido, errores } = validarLogin({ correo, contrasena });
        if (!valido) return res.status(400).json({ mensaje: 'Datos inválidos', errores });

        // Buscar el usuario por correo
        const usuario = await User.findOne({ correo });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Comparar la contraseña recibida con el hash almacenado en la base de datos
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!coincide) return res.status(401).json({ mensaje: 'Credenciales incorrectas' });

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

        // Si 2FA está desactivado por variable de entorno (solo para desarrollo), emitir tokens directamente
        if (process.env.DISABLE_2FA === 'true') {
            const token = emitirTokens(usuario, res);
            return res.status(200).json({ token });
        }

        // Si el dispositivo ya verificó 2FA en los últimos 30 días, emitir tokens directamente
        if (req.cookies?.['2fa_verificado']) {
            const token = emitirTokens(usuario, res);
            return res.status(200).json({ token });
        }

        // Generar OTP, guardarlo en memoria con 5 minutos de expiración y enviarlo por email
        const codigo = generarOTP();
        otpStore.set(correo, { codigo, expira: Date.now() + 5 * 60 * 1000 });

        await sendMail({
            to: correo,
            subject: 'Tu código de verificación - GymSuite',
            html: `
                <p>Tu código de verificación es:</p>
                <h2 style="letter-spacing: 4px;">${codigo}</h2>
                <p>Caduca en 5 minutos.</p>
            `,
        });

        return res.status(200).json({ requiere2FA: true });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });
    }
};

// Verificar el código OTP recibido por email y completar el login
export const verificar2FA = async (req, res) => {
    try {
        const { correo, codigo } = req.body;
        if (!correo || !codigo) return res.status(400).json({ mensaje: 'Faltan datos' });

        const entrada = otpStore.get(correo);

        // Comprobar que existe un OTP pendiente para este correo
        if (!entrada) return res.status(401).json({ mensaje: 'Código no encontrado o ya usado' });

        // Comprobar si el OTP ha expirado
        if (Date.now() > entrada.expira) {
            otpStore.delete(correo);
            return res.status(401).json({ mensaje: 'Código expirado' });
        }

        // Comprobar que el código coincide
        if (entrada.codigo !== codigo) return res.status(401).json({ mensaje: 'Código incorrecto' });

        // OTP válido: eliminar de memoria para que no pueda reutilizarse
        otpStore.delete(correo);

        const usuario = await User.findOne({ correo });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Marcar este dispositivo como verificado durante 30 días
        res.cookie('2fa_verificado', '1', {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días en ms
        });

        const token = emitirTokens(usuario, res);
        return res.status(200).json({ token });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });
    }
};

// Renovar el token de acceso usando el refresh token almacenado en la cookie
export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) return res.status(401).json({ mensaje: 'Sin refresh token' });

        // Verificar la firma y expiración del refresh token
        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ mensaje: 'Refresh token inválido o expirado' });
        }

        // Buscar el usuario para incluir datos actualizados en el nuevo token de acceso
        const usuario = await User.findById(payload.id);
        if (!usuario) return res.status(401).json({ mensaje: 'Usuario no encontrado' });

        const userToken = jwt.sign(
            { id: usuario._id, rol: usuario.rol, nombre: usuario.nombre, apellidos: usuario.apellidos },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        return res.status(200).json({ token: userToken });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });
    }
};

// Cambiar contraseña propia: verificar la actual, validar la nueva y actualizarla en BD
export const cambiarContrasena = async (req, res) => {
    try {
        const { contrasenaActual, contrasenaNueva } = req.body;

        const { valido, errores } = validarCambioContrasenaPropio({ contrasenaActual, contrasenaNueva, confirmacion: contrasenaNueva });
        if (!valido) return res.status(400).json({ errores });

        const usuario = await User.findById(req.usuario.id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Comprobar que la contraseña actual introducida coincide con el hash almacenado
        const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena);
        if (!coincide) return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });

        const hash = await bcrypt.hash(contrasenaNueva, 10);
        await User.findByIdAndUpdate(req.usuario.id, { contrasena: hash });

        return res.status(200).json({ ok: true });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });
    }
};

// Resetear contraseña: generar una temporal, actualizarla en BD y enviarla al usuario por email
export const resetearPassword = async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id);
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const passwordTemporal = generarPasswordTemporal();
        const hash = await bcrypt.hash(passwordTemporal, 10);
        await User.findByIdAndUpdate(req.params.id, { contrasena: hash });

        await sendMail({
            to: usuario.correo,
            subject: 'Tu contraseña ha sido restablecida - GymSuite',
            html: `
                <p>Hola ${usuario.nombre},</p>
                <p>Un administrador ha restablecido tu contraseña en GymSuite.</p>
                <p>Tu contraseña temporal es:</p>
                <h2 style="letter-spacing: 4px; font-family: monospace;">${passwordTemporal}</h2>
                <p>Por seguridad, te recomendamos cambiarla desde tu perfil en cuanto inicies sesión.</p>
            `,
        });

        return res.status(200).json({ ok: true });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });
    }
};

// Cerrar sesión: eliminar la cookie del refresh token del navegador
export const logout = (req, res) => {
    res.clearCookie('refresh_token', {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
    });
    return res.status(200).json({ mensaje: 'Sesión cerrada' });
};
