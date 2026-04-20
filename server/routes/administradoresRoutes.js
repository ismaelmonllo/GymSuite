// Rutas de administradores: solo el admin puede gestionarlos
import express from 'express';
import { verificarToken, verificarRol, verificarRolBody, forzarRolQuery } from '../middleware/auth.js';
import { listarEmpleados, verEmpleado, crearEmpleado, editarEmpleado, darDeBaja } from '../controllers/usuarioController.js';

const router = express.Router();

// GET /api/administradores – Obtener lista de administradores con filtros opcionales
router.get('/', verificarToken, verificarRol('admin'), forzarRolQuery('admin'), listarEmpleados);
// GET /api/administradores/:id – Obtener los datos de un administrador concreto
router.get('/:id', verificarToken, verificarRol('admin'), verEmpleado);
// POST /api/administradores – Crear un nuevo administrador
router.post('/', verificarToken, verificarRol('admin'), verificarRolBody('admin'), crearEmpleado);
// PUT /api/administradores/:id – Editar los datos de un administrador
router.put('/:id', verificarToken, verificarRol('admin'), editarEmpleado);
// PATCH /api/administradores/:id/baja – Dar de baja a un administrador (baja lógica)
router.patch('/:id/baja', verificarToken, verificarRol('admin'), darDeBaja);

export default router;
