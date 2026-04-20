// Rutas de mediciones: todas requieren autenticación
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerMediciones, obtenerMisMediciones, obtenerMedicion, crearMedicion, editarMedicion, eliminarMedicion } from '../controllers/medicionController.js';

const router = express.Router();

/**
 * @swagger
 * /mediciones:
 *   get:
 *     summary: Historial de mediciones del cliente autenticado
 *     tags: [Mediciones]
 *     responses:
 *       200:
 *         description: Lista de mediciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medicion'
 *       404:
 *         description: Sin mediciones registradas
 */
router.get('/', verificarToken, verificarRol('cliente'), obtenerMisMediciones);

/**
 * @swagger
 * /mediciones/cliente/{id_usuario}:
 *   get:
 *     summary: Historial de mediciones de un cliente concreto
 *     tags: [Mediciones]
 *     parameters:
 *       - in: path
 *         name: id_usuario
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de mediciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medicion'
 *       404:
 *         description: Sin mediciones registradas
 */
router.get('/cliente/:id_usuario', verificarToken, verificarRol('entrenador'), obtenerMediciones);

/**
 * @swagger
 * /mediciones/{id}:
 *   get:
 *     summary: Ver una medición concreta
 *     tags: [Mediciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos de la medición
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medicion'
 *       404:
 *         description: Medición no encontrada
 */
router.get('/:id', verificarToken, verificarRol('cliente', 'entrenador'), obtenerMedicion);

/**
 * @swagger
 * /mediciones:
 *   post:
 *     summary: Registrar nueva medición
 *     tags: [Mediciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Medicion'
 *     responses:
 *       201:
 *         description: Medición creada
 *       400:
 *         description: Datos inválidos
 */
router.post('/', verificarToken, verificarRol('entrenador'), crearMedicion);

/**
 * @swagger
 * /mediciones/{id}:
 *   put:
 *     summary: Editar medición
 *     tags: [Mediciones]
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
 *             $ref: '#/components/schemas/Medicion'
 *     responses:
 *       200:
 *         description: Medición actualizada
 *       404:
 *         description: Medición no encontrada
 */
router.put('/:id', verificarToken, verificarRol('entrenador'), editarMedicion);

/**
 * @swagger
 * /mediciones/{id}:
 *   delete:
 *     summary: Eliminar medición
 *     tags: [Mediciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Medición eliminada
 *       404:
 *         description: Medición no encontrada
 */
router.delete('/:id', verificarToken, verificarRol('entrenador'), eliminarMedicion);

export default router;
