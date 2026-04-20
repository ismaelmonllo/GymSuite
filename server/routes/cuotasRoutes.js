// Rutas de cuotas: admin y entrenador pueden consultarlas; solo admin puede modificarlas
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { listarCuotas, crearCuota, editarCuota, eliminarCuota } from '../controllers/cuotaController.js';

const router = express.Router();

/**
 * @swagger
 * /cuotas:
 *   get:
 *     summary: Listar tipos de cuota
 *     tags: [Cuotas]
 *     responses:
 *       200:
 *         description: Lista de tipos de cuota
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TipoCuota'
 */
router.get('/', verificarToken, verificarRol('admin', 'entrenador'), listarCuotas);

/**
 * @swagger
 * /cuotas:
 *   post:
 *     summary: Crear tipo de cuota
 *     tags: [Cuotas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoCuota'
 *     responses:
 *       201:
 *         description: Cuota creada
 *       400:
 *         description: Datos inválidos
 */
router.post('/', verificarToken, verificarRol('admin'), crearCuota);

/**
 * @swagger
 * /cuotas/{id}:
 *   put:
 *     summary: Editar tipo de cuota
 *     tags: [Cuotas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoCuota'
 *     responses:
 *       200:
 *         description: Cuota actualizada
 *       404:
 *         description: Cuota no encontrada
 */
router.put('/:id', verificarToken, verificarRol('admin'), editarCuota);

/**
 * @swagger
 * /cuotas/{id}:
 *   delete:
 *     summary: Eliminar tipo de cuota
 *     tags: [Cuotas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cuota eliminada
 *       404:
 *         description: Cuota no encontrada
 */
router.delete('/:id', verificarToken, verificarRol('admin'), eliminarCuota);

export default router;
