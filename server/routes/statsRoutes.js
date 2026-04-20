// Rutas de estadísticas: todas son solo para admin
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerStatsMes, obtenerStatsAnual, obtenerStatsMesPagados, obtenerStatsMesPendientes } from '../controllers/pagosController.js';
import { obtenerTotalClientes, obtenerTotalTrabajadores, obtenerStatsAltas } from '../controllers/usuarioController.js';

const router = express.Router();

// GET /api/stats/mes – Obtener el total recaudado en el mes actual
router.get('/mes', verificarToken, verificarRol('admin'), obtenerStatsMes);
// GET /api/stats/anual – Obtener el total recaudado por mes en los últimos 12 meses
router.get('/anual', verificarToken, verificarRol('admin'), obtenerStatsAnual);
// GET /api/stats/mes-pagados – Contar cuántos pagos del mes actual están confirmados
router.get('/mes-pagados', verificarToken, verificarRol('admin'), obtenerStatsMesPagados);
// GET /api/stats/mes-pendientes – Contar cuántos pagos del mes actual siguen pendientes
router.get('/mes-pendientes', verificarToken, verificarRol('admin'), obtenerStatsMesPendientes);

// GET /api/stats/total-clientes – Contar el total de clientes registrados
router.get('/total-clientes', verificarToken, verificarRol('admin'), obtenerTotalClientes);
// GET /api/stats/total-trabajadores – Contar el total de trabajadores registrados
router.get('/total-trabajadores', verificarToken, verificarRol('admin'), obtenerTotalTrabajadores);
// GET /api/stats/altas-mensuales – Obtener el número de altas por mes en los últimos 12 meses
router.get('/altas-mensuales', verificarToken, verificarRol('admin'), obtenerStatsAltas);

export default router;
