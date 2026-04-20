// Rutas de cuotas: admin y entrenador pueden consultarlas; solo admin puede modificarlas
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { listarCuotas, crearCuota, editarCuota, eliminarCuota } from '../controllers/cuotaController.js';

const router = express.Router();

// GET /api/cuotas – Obtener todas las cuotas disponibles (para el panel de admin y el modal de cambio de cuota)
router.get('/', verificarToken, verificarRol('admin', 'entrenador'), listarCuotas);
// POST /api/cuotas – Crear una nueva cuota (solo admin)
router.post('/', verificarToken, verificarRol('admin'), crearCuota);
// PUT /api/cuotas/:id – Editar una cuota existente (solo admin)
router.put('/:id', verificarToken, verificarRol('admin'), editarCuota);
// DELETE /api/cuotas/:id – Eliminar una cuota (solo admin)
router.delete('/:id', verificarToken, verificarRol('admin'), eliminarCuota);

export default router;
