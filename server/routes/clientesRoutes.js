// Rutas de clientes: todas requieren autenticación y rol admin o entrenador
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import {
    listarClientes,
    verCliente,
    crearCliente,
    editarCliente,
    darDeBaja,
    darDeAlta,
    cambiarCuota,
    obtenerMiPerfil,
    eliminarUsuario,
} from '../controllers/usuarioController.js';

const router = express.Router();

/**
 * @swagger
 * /clientes:
 *   get:
 *     summary: Listar clientes
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: nivel
 *         schema: { type: string, enum: [principiante, intermedio, avanzado] }
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, minimum: 1 }
 *         description: Página (activa paginación; devuelve total, pagina, limite además de clientes)
 *       - in: query
 *         name: limite
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cliente'
 *                 total:
 *                   type: integer
 *                   description: Solo presente si se usa paginación
 *                 pagina:
 *                   type: integer
 *                   description: Solo presente si se usa paginación
 *                 limite:
 *                   type: integer
 *                   description: Solo presente si se usa paginación
 */
router.get('/', verificarToken, verificarRol('admin', 'entrenador'), listarClientes);

router.get('/perfil', verificarToken, verificarRol('cliente'), obtenerMiPerfil);

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
 *               type: object
 *               properties:
 *                 cliente:
 *                   $ref: '#/components/schemas/Cliente'
 *       400:
 *         description: ID no válido
 *       404:
 *         description: Cliente no encontrado o no es de rol cliente
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
 * /clientes/{id}/alta:
 *   patch:
 *     summary: Dar de alta a un cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente dado de alta
 *       404:
 *         description: Cliente no encontrado
 */
router.patch('/:id/alta', verificarToken, verificarRol('admin', 'entrenador'), darDeAlta);

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

/**
 * @swagger
 * /clientes/{id}:
 *   delete:
 *     summary: Eliminar cliente definitivamente
 *     description: Borrado físico del usuario. Solo admin. Para desactivar sin borrar usar PATCH /clientes/{id}/baja.
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *       400:
 *         description: ID no válido
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', verificarToken, verificarRol('admin'), eliminarUsuario);

export default router;
