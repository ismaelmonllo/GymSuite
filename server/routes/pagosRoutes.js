import express from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import { obtenerPagos, obtenerMisPagos, generarPagos, registrarPago} from '../controllers/pagosController.js';


const router = express.Router();

// Obtener el historial de pagos de un cliente concreto (para admin y entrenador)
router.get('/cliente/:id_usuario', verificarToken, verificarRol(['admin', 'entrenador']), obtenerPagos);

// Obtener el historial de pagos del cliente autenticado (para el propio cliente)
router.get('/mis-pagos', verificarToken, verificarRol(['cliente']), obtenerMisPagos);

// Generar los pagos del mes para todos los clientes activos (manual desde el panel de admin)
router.post('/generar', verificarToken, verificarRol(['admin']), generarPagos);

// Registrar el cobro de una cuota, marcando todos los meses del grupo como pagados
router.post('/registrar', verificarToken, verificarRol(['admin', 'entrenador']), registrarPago);


export default router;
