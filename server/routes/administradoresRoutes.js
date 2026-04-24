// Rutas de administradores: solo el admin puede gestionarlos
import express from 'express';
import { verificarToken, verificarRol, verificarRolBody, forzarRolQuery } from '../middleware/auth.js';
import { listarEmpleados, verEmpleado, crearEmpleado, editarEmpleado, darDeBaja, darDeAlta } from '../controllers/usuarioController.js';

const router = express.Router();

/**
 * @swagger
 * /administradores:
 *   get:
 *     summary: Listar administradores
 *     tags: [Administradores]
 *     parameters:
 *       - in: query
 *         name: buscar
 *         schema: { type: string }
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de administradores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empleado'
 */
router.get('/', verificarToken, verificarRol('admin'), forzarRolQuery('admin'), listarEmpleados);

/**
 * @swagger
 * /administradores/{id}:
 *   get:
 *     summary: Ver administrador por ID
 *     tags: [Administradores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empleado'
 *       404:
 *         description: Administrador no encontrado
 */
router.get('/:id', verificarToken, verificarRol('admin'), verEmpleado);

/**
 * @swagger
 * /administradores:
 *   post:
 *     summary: Crear administrador
 *     tags: [Administradores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Empleado'
 *     responses:
 *       201:
 *         description: Administrador creado
 *       400:
 *         description: Datos inválidos o duplicados
 */
router.post('/', verificarToken, verificarRol('admin'), verificarRolBody('admin'), crearEmpleado);

/**
 * @swagger
 * /administradores/{id}:
 *   put:
 *     summary: Editar administrador
 *     tags: [Administradores]
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
 *         description: Administrador actualizado
 *       404:
 *         description: Administrador no encontrado
 */
router.put('/:id', verificarToken, verificarRol('admin'), editarEmpleado);

/**
 * @swagger
 * /administradores/{id}/baja:
 *   patch:
 *     summary: Dar de baja a un administrador
 *     tags: [Administradores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Administrador dado de baja
 *       404:
 *         description: Administrador no encontrado
 */
router.patch('/:id/baja', verificarToken, verificarRol('admin'), darDeBaja);

/**
 * @swagger
 * /administradores/{id}/alta:
 *   patch:
 *     summary: Dar de alta a un administrador
 *     tags: [Administradores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Administrador dado de alta
 *       404:
 *         description: Administrador no encontrado
 */
router.patch('/:id/alta', verificarToken, verificarRol('admin'), darDeAlta);

export default router;
