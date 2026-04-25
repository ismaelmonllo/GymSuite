// Rutas de estadísticas: todas son solo para admin
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerStatsMes, obtenerStatsAnual, obtenerStatsMesPagados, obtenerStatsMesPendientes, obtenerUltimoPagoPorCliente } from '../controllers/pagosController.js';
import { obtenerTotalClientes, obtenerTotalTrabajadores, obtenerStatsAltas } from '../controllers/usuarioController.js';

const router = express.Router();

/**
 * @swagger
 * /stats/mes:
 *   get:
 *     summary: Total recaudado en el mes actual
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Importe total de pagos confirmados este mes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   example: 1240.50
 */
router.get('/mes', verificarToken, verificarRol('admin'), obtenerStatsMes);

/**
 * @swagger
 * /stats/anual:
 *   get:
 *     summary: Recaudación por mes en los últimos 12 meses
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Array con el total recaudado por mes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mes:
 *                     type: string
 *                     example: '2026-03'
 *                   total:
 *                     type: number
 *                     example: 1180
 */
router.get('/anual', verificarToken, verificarRol('admin'), obtenerStatsAnual);

/**
 * @swagger
 * /stats/mes-pagados:
 *   get:
 *     summary: Número de pagos confirmados en el mes actual
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Cantidad de pagos con pendiente false este mes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 18
 */
router.get('/mes-pagados', verificarToken, verificarRol('admin'), obtenerStatsMesPagados);

/**
 * @swagger
 * /stats/mes-pendientes:
 *   get:
 *     summary: Número de pagos pendientes en el mes actual
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Cantidad de pagos con pendiente true este mes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 5
 */
router.get('/mes-pendientes', verificarToken, verificarRol('admin'), obtenerStatsMesPendientes);

/**
 * @swagger
 * /stats/total-clientes:
 *   get:
 *     summary: Total de clientes activos
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Número de clientes con activo true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 42
 */
router.get('/total-clientes', verificarToken, verificarRol('admin'), obtenerTotalClientes);

/**
 * @swagger
 * /stats/total-trabajadores:
 *   get:
 *     summary: Total de trabajadores activos
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Número de entrenadores y admins con activo true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 6
 */
router.get('/total-trabajadores', verificarToken, verificarRol('admin'), obtenerTotalTrabajadores);

/**
 * @swagger
 * /stats/altas-mensuales:
 *   get:
 *     summary: Altas de clientes por mes en los últimos 12 meses
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Array con el número de altas por mes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mes:
 *                     type: string
 *                     example: '2026-03'
 *                   altas:
 *                     type: integer
 *                     example: 4
 */
router.get('/altas-mensuales', verificarToken, verificarRol('admin'), obtenerStatsAltas);

/**
 * @swagger
 * /stats/ultimo-pago:
 *   get:
 *     summary: Último pago de cada cliente
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Mapa clienteId → { pendiente, mes, grupo_pago, tipo_cuota } con el pago más reciente de cada cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   pendiente:
 *                     type: boolean
 *                     example: true
 *                   mes:
 *                     type: string
 *                     example: '2026-04'
 *                   grupo_pago:
 *                     type: string
 *                     example: '6617a2f3e4b0c1a2b3c4d5e6'
 *                   tipo_cuota:
 *                     type: string
 *                     example: 'Mensual'
 */
router.get('/ultimo-pago', verificarToken, verificarRol('admin'), obtenerUltimoPagoPorCliente);

export default router;
