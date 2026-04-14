// Rutas de autenticación: gestionar el inicio de sesión de los usuarios
import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login – Iniciar sesión con correo y contraseña
router.post('/login', login);

export default router;
