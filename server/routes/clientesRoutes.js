// Rutas de clientes: todas requieren autenticación y rol admin o entrenador
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { listarClientes, verCliente, crearCliente, editarCliente, darDeBaja, cambiarCuota } from '../controllers/usuarioController.js';

const router = express.Router();

/**
 * @swagger
 * /clientes:
 *   get:
 *     summary: Listar clientes
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *       - in: query
 *         name: nivel
 *         schema: { type: string, enum: [principiante, intermedio, avanzado] }
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cliente'
 */
router.get('/', verificarToken, verificarRol('admin', 'entrenador'), listarClientes);

/**
 * @swagger
 * /clientes/{id}:
 *   get:
 *     summary: Ver cliente por ID
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:id', verificarToken, verificarRol('admin', 'entrenador'), verCliente);

/**
 * @swagger
 * /clientes:
 *   post:
 *     summary: Crear cliente
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       201:
 *         description: Cliente creado
 *       400:
 *         description: Datos inválidos o duplicados
 */
router.post('/', verificarToken, verificarRol('admin', 'entrenador'), crearCliente);

/**
 * @swagger
 * /clientes/{id}:
 *   put:
 *     summary: Editar cliente
 *     tags: [Clientes]
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
 *             $ref: '#/components/schemas/Cliente'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:id', verificarToken, verificarRol('admin', 'entrenador'), editarCliente);

/**
 * @swagger
 * /clientes/{id}/baja:
 *   patch:
 *     summary: Dar de baja a un cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente dado de baja
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/baja', verificarToken, verificarRol('admin', 'entrenador'), darDeBaja);

/**
 * @swagger
 * /clientes/{id}/cuota:
 *   patch:
 *     summary: Cambiar tipo de cuota de un cliente
 *     tags: [Clientes]
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
 *             type: object
 *             properties:
 *               tipo_cuota: { type: string, description: ObjectId del nuevo tipo de cuota }
 *     responses:
 *       200:
 *         description: Cuota actualizada
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/cuota', verificarToken, verificarRol('admin', 'entrenador'), cambiarCuota);

export default router;
