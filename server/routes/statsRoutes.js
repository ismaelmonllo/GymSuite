import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerStatsMes, obtenerStatsAnual, obtenerStatsMesPagados, obtenerStatsMesPendientes } from '../controllers/pagosController.js';
import { obtenerTotalClientes, obtenerTotalTrabajadores, obtenerStatsAltas } from '../controllers/usuarioController.js';

const router = express.Router();

// Rutas de estadísticas de pagos (solo admin)
router.get('/mes', verificarToken, verificarRol('admin'), obtenerStatsMes);
router.get('/anual', verificarToken, verificarRol('admin'), obtenerStatsAnual);
router.get('/mes-pagados', verificarToken, verificarRol('admin'), obtenerStatsMesPagados);
router.get('/mes-pendientes', verificarToken, verificarRol('admin'), obtenerStatsMesPendientes);

// Rutas de estadísticas de usuarios (solo admin)
router.get('/total-clientes', verificarToken, verificarRol('admin'), obtenerTotalClientes);
router.get('/total-trabajadores', verificarToken, verificarRol('admin'), obtenerTotalTrabajadores);
router.get('/altas-mensuales', verificarToken, verificarRol('admin'), obtenerStatsAltas);

export default router;
