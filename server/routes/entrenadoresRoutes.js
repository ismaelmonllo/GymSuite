// Rutas de entrenadores: solo el admin puede gestionarlos
import express from 'express';
import { verificarToken, verificarRol, verificarRolBody, forzarRolQuery } from '../middleware/auth.js';
import { listarEmpleados, verEmpleado, crearEmpleado, editarEmpleado, darDeBaja } from '../controllers/usuarioController.js';

const router = express.Router();

/**
 * @swagger
 * /entrenadores:
 *   get:
 *     summary: Listar entrenadores
 *     tags: [Entrenadores]
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de entrenadores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empleado'
 */
router.get('/', verificarToken, verificarRol('admin'), forzarRolQuery('entrenador'), listarEmpleados);

/**
 * @swagger
 * /entrenadores/{id}:
 *   get:
 *     summary: Ver entrenador por ID
 *     tags: [Entrenadores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del entrenador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empleado'
 *       404:
 *         description: Entrenador no encontrado
 */
router.get('/:id', verificarToken, verificarRol('admin'), verEmpleado);

/**
 * @swagger
 * /entrenadores:
 *   post:
 *     summary: Crear entrenador
 *     tags: [Entrenadores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Empleado'
 *     responses:
 *       201:
 *         description: Entrenador creado
 *       400:
 *         description: Datos inválidos o duplicados
 */
router.post('/', verificarToken, verificarRol('admin'), verificarRolBody('entrenador'), crearEmpleado);

/**
 * @swagger
 * /entrenadores/{id}:
 *   put:
 *     summary: Editar entrenador
 *     tags: [Entrenadores]
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
 *             $ref: '#/components/schemas/Empleado'
 *     responses:
 *       200:
 *         description: Entrenador actualizado
 *       404:
 *         description: Entrenador no encontrado
 */
router.put('/:id', verificarToken, verificarRol('admin'), editarEmpleado);

/**
 * @swagger
 * /entrenadores/{id}/baja:
 *   patch:
 *     summary: Dar de baja a un entrenador
 *     tags: [Entrenadores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entrenador dado de baja
 *       404:
 *         description: Entrenador no encontrado
 */
router.patch('/:id/baja', verificarToken, verificarRol('admin'), darDeBaja);

export default router;
