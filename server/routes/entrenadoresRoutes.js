// Rutas de entrenadores: solo el admin puede gestionarlos
import express from 'express';
import { verificarToken, verificarRol, verificarRolBody, forzarRolQuery } from '../middleware/auth.js';
import { listarEmpleados, verEmpleado, crearEmpleado, editarEmpleado, darDeBaja } from '../controllers/usuarioController.js';

const router = express.Router();

// GET /api/entrenadores – Obtener lista de entrenadores con filtros opcionales
router.get('/', verificarToken, verificarRol('admin'), forzarRolQuery('entrenador'), listarEmpleados);
// GET /api/entrenadores/:id – Obtener los datos de un entrenador concreto
router.get('/:id', verificarToken, verificarRol('admin'), verEmpleado);
// POST /api/entrenadores – Crear un nuevo entrenador
router.post('/', verificarToken, verificarRol('admin'), verificarRolBody('entrenador'), crearEmpleado);
// PUT /api/entrenadores/:id – Editar los datos de un entrenador
router.put('/:id', verificarToken, verificarRol('admin'), editarEmpleado);
// PATCH /api/entrenadores/:id/baja – Dar de baja a un entrenador (baja lógica)
router.patch('/:id/baja', verificarToken, verificarRol('admin'), darDeBaja);

export default router;
