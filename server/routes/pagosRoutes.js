// Rutas de pagos: requieren autenticación; generar-cron usa secret en lugar de JWT
import express from 'express';
import { verificarToken, verificarRol, verificarCronSecret } from '../middleware/auth.js';
import { obtenerPagos, obtenerMisPagos, generarPagos, registrarPago} from '../controllers/pagosController.js';


const router = express.Router();

// GET /api/pagos/cliente/:id_usuario – Obtener el historial de pagos de un cliente concreto (admin y entrenador)
router.get('/cliente/:id_usuario', verificarToken, verificarRol('admin', 'entrenador'), obtenerPagos);

// GET /api/pagos/mis-pagos – Obtener el historial de pagos del cliente autenticado
router.get('/mis-pagos', verificarToken, verificarRol('cliente'), obtenerMisPagos);

// POST /api/pagos/generar – Generar los pagos del mes manualmente desde el panel de admin
router.post('/generar', verificarToken, verificarRol('admin'), generarPagos);

// POST /api/pagos/generar-cron – Generar los pagos del mes desde cron-job.org (solo con secret, sin JWT)
router.post('/generar-cron', verificarCronSecret, generarPagos);

// POST /api/pagos/registrar – Registrar el cobro de una cuota, marcando todos los meses del grupo como pagados
router.post('/registrar', verificarToken, verificarRol('admin', 'entrenador'), registrarPago);

export default router;
