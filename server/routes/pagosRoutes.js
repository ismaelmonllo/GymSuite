// Rutas de pagos: requieren autenticación; generar-cron usa secret en lugar de JWT
import express from 'express';
import { verificarToken, verificarRol, verificarCronSecret } from '../middleware/auth.js';
import { obtenerPagos, obtenerMisPagos, generarPagos, registrarPago} from '../controllers/pagosController.js';

const router = express.Router();

/**
 * @swagger
 * /pagos/cliente/{id_usuario}:
 *   get:
 *     summary: Historial de pagos de un cliente concreto
 *     tags: [Pagos]
 *     parameters:
 *       - in: path
 *         name: id_usuario
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pago'
 *       404:
 *         description: Sin pagos registrados
 */
router.get('/cliente/:id_usuario', verificarToken, verificarRol('admin', 'entrenador'), obtenerPagos);

/**
 * @swagger
 * /pagos/mis-pagos:
 *   get:
 *     summary: Historial de pagos del cliente autenticado
 *     tags: [Pagos]
 *     responses:
 *       200:
 *         description: Lista de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pago'
 *       404:
 *         description: Sin pagos registrados
 */
router.get('/mis-pagos', verificarToken, verificarRol('cliente'), obtenerMisPagos);

/**
 * @swagger
 * /pagos/generar:
 *   post:
 *     summary: Generar pagos del mes manualmente (admin)
 *     tags: [Pagos]
 *     responses:
 *       201:
 *         description: Pagos generados
 *       200:
 *         description: Todos los clientes ya tenían pagos para este mes
 */
router.post('/generar', verificarToken, verificarRol('admin', 'entrenador'), generarPagos);

/**
 * @swagger
 * /pagos/generar-cron:
 *   post:
 *     summary: Generar pagos del mes desde cron-job.org
 *     tags: [Pagos]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Pagos generados
 *       401:
 *         description: Secret incorrecto
 */
router.post('/generar-cron', verificarCronSecret, generarPagos);

/**
 * @swagger
 * /pagos/registrar:
 *   post:
 *     summary: Confirmar el cobro de una cuota (marca todo el grupo como pagado)
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grupo_pago]
 *             properties:
 *               grupo_pago: { type: string, description: ObjectId del grupo de pagos }
 *     responses:
 *       200:
 *         description: Pagos registrados como cobrados
 *       404:
 *         description: Grupo de pagos no encontrado
 */
router.post('/registrar', verificarToken, verificarRol('admin', 'entrenador'), registrarPago);

export default router;
