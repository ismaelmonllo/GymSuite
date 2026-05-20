// Rutas de autenticación: gestionar el inicio de sesión de los usuarios
import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, verificar2FA, refresh, logout, cambiarContrasena, resetearPassword, restablecerPassword } from '../controllers/authController.js';
import { verificarToken, verificarRol, requiereCustomHeader } from '../middleware/auth.js';

const router = express.Router();

// Rate limit estricto para credenciales y OTP: 5 intentos / 15 min por IP
// Frena brute force sobre login y 2FA (10^6 combinaciones del OTP de 6 dígitos)
const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiados intentos. Espera 15 minutos.' },
});

// Rate limit medio para refresh: el flujo legítimo lo dispara 1 vez por sesión cada ~2h
const limiteRefresh = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Token JWT (login directo) o indicador de 2FA pendiente
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/LoginResponse'
 *                 - type: object
 *                   properties:
 *                     requiere2FA:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', limiteAuth, login);

/**
 * @swagger
 * /auth/verificar-2fa:
 *   post:
 *     summary: Verificar código OTP de doble factor
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, codigo]
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *               codigo:
 *                 type: string
 *                 example: "482901"
 *     responses:
 *       200:
 *         description: Código correcto; devuelve token JWT de acceso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Código incorrecto, expirado o no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verificar-2fa', limiteAuth, verificar2FA);

/**
 * @swagger
 * /auth/cambiar-contrasena:
 *   patch:
 *     summary: Cambiar contraseña propia
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contrasenaActual, contrasenaNueva]
 *             properties:
 *               contrasenaActual:
 *                 type: string
 *               contrasenaNueva:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/cambiar-contrasena', verificarToken, cambiarContrasena);

/**
 * @swagger
 * /auth/resetear-password/{id}:
 *   patch:
 *     summary: Resetear contraseña de un usuario (solo admin)
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID del usuario al que resetear la contraseña
 *     responses:
 *       200:
 *         description: Contraseña reseteada y email enviado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/resetear-password/:id', verificarToken, verificarRol('admin'), resetearPassword);

router.post('/restablecer-password', restablecerPassword);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Nuevo token JWT de acceso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Refresh token ausente, inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', requiereCustomHeader, limiteRefresh, refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: Sesión cerrada
 */
router.post('/logout', requiereCustomHeader, logout);

export default router;
