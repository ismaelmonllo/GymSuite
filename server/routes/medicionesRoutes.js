// Rutas de mediciones: todas requieren autenticación
import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerMediciones, obtenerMisMediciones, obtenerMedicion, crearMedicion, editarMedicion, eliminarMedicion } from '../controllers/medicionController.js';

const router = express.Router();

// GET /api/mediciones – Obtener el historial de mediciones del cliente autenticado
router.get('/', verificarToken, verificarRol('cliente'), obtenerMisMediciones);
// GET /api/mediciones/cliente/:id_usuario – Obtener el historial de mediciones de un cliente concreto
router.get('/cliente/:id_usuario', verificarToken, verificarRol('entrenador'), obtenerMediciones);
// GET /api/mediciones/:id – Obtener una medición concreta por su id
router.get('/:id', verificarToken, verificarRol('cliente', 'entrenador'), obtenerMedicion);
// POST /api/mediciones – Crear una nueva medición
router.post('/', verificarToken, verificarRol('entrenador'), crearMedicion);
// PUT /api/mediciones/:id – Editar una medición existente
router.put('/:id', verificarToken, verificarRol('entrenador'), editarMedicion);
// DELETE /api/mediciones/:id – Eliminar una medición
router.delete('/:id', verificarToken, verificarRol('entrenador'), eliminarMedicion);

export default router;
