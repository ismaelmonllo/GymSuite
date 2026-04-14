// Rutas de clientes: todas requieren autenticación y rol admin o entrenador
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { listarClientes, verCliente, crearCliente, editarCliente, darDeBaja, cambiarCuota } from '../controllers/usuarioController.js';

const router = express.Router();

// GET /api/clientes – Obtener lista de clientes con filtros opcionales
router.get('/', verificarToken, verificarRol('admin', 'entrenador'), listarClientes);
// GET /api/clientes/:id – Obtener los datos de un cliente concreto
router.get('/:id', verificarToken, verificarRol('admin', 'entrenador'), verCliente);
// POST /api/clientes – Crear un nuevo cliente
router.post('/', verificarToken, verificarRol('admin', 'entrenador'), crearCliente);
// PUT /api/clientes/:id – Editar los datos de un cliente
router.put('/:id', verificarToken, verificarRol('admin', 'entrenador'), editarCliente);
// PATCH /api/clientes/:id/baja – Dar de baja a un cliente (baja lógica)
router.patch('/:id/baja', verificarToken, verificarRol('admin', 'entrenador'), darDeBaja);
// PATCH /api/clientes/:id/cuota – Cambiar el tipo de cuota de un cliente
router.patch('/:id/couta', verificarToken, verificarRol('admin', 'entrenador'), cambiarCuota);

export default router;
