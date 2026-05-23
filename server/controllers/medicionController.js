import Medicion from '../models/MedicionModel.js';
import { validarCrearMedicion, validarEditarMedicion } from '../validators/validarRegistros.js';
import { validarObjectId } from '../validators/validarCampos.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * Obtener el historial completo de mediciones de un cliente, ordenado de la
 * más reciente a la más antigua. Pensado para que admin o entrenador consulten
 * el progreso de un cliente.
 * @param {import('express').Request} req - `params.id_usuario` del cliente.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con array de mediciones; 400 si el id es inválido.
 */
export const obtenerMediciones = asyncHandler(async (req, res) => {

    // Extraer el id del cliente de los parámetros de la ruta
    const { id_usuario } = req.params;

    // Rechazar IDs con formato inválido antes de llegar a Mongoose
    const { valido } = validarObjectId(id_usuario);
    if (!valido) return res.status(400).json({ mensaje: 'ID de cliente no válido' });

    // Buscar todas las mediciones del cliente ordenadas de más reciente a más antigua
    const mediciones = await Medicion.find({ cliente_id: id_usuario }).sort({ fecha: -1 });

    return res.status(200).json(mediciones);

});

/**
 * Obtener las mediciones propias del cliente autenticado. El id se lee del
 * JWT (`req.usuario.id`), nunca de parámetros, para que un cliente no pueda
 * pedir las mediciones de otro.
 * @param {import('express').Request} req - `req.usuario.id` (lo rellena `verificarToken`).
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con array de mediciones del cliente.
 */
export const obtenerMisMediciones = asyncHandler(async (req, res) => {

    // Leer el id del usuario desde el token, no desde los parámetros
    const id_usuario = req.usuario.id;

    // Buscar todas las mediciones del cliente ordenadas de más reciente a más antigua
    const mediciones = await Medicion.find({ cliente_id: id_usuario }).sort({ fecha: -1 });

    return res.status(200).json(mediciones);

});

/**
 * Obtener una medición concreta por su id. Si el solicitante es un cliente,
 * comprueba además que la medición le pertenece (evita IDOR iterando ids).
 * @param {import('express').Request} req - `params.id`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con la medición; 400/403/404 según el caso.
 */
export const obtenerMedicion = asyncHandler(async (req, res) => {

    // Extraer el id de la medición de los parámetros de la ruta
    const { id } = req.params;

    // Rechazar IDs con formato inválido antes de llegar a Mongoose
    const { valido } = validarObjectId(id);
    if (!valido) return res.status(400).json({ mensaje: 'ID de medición no válido' });

    // Buscar la medición y devolver 404 si no existe
    const medicion = await Medicion.findById(id);
    if (!medicion) return res.status(404).json({ mensaje: 'Medición no encontrada' });

    // Un cliente solo puede ver sus propias mediciones (evita IDOR iterando ids)
    if (req.usuario.rol === 'cliente' && String(medicion.cliente_id) !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Acceso denegado' });
    }

    return res.status(200).json(medicion);

});

/**
 * Crear una nueva medición para un cliente. El `entrenador_id` se asigna
 * desde el token (no del body) para garantizar trazabilidad y evitar que se
 * suplante quién registró la medición.
 * @param {import('express').Request} req - Body con los datos de la medición.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con la medición creada o 400 si los datos no son válidos.
 */
export const crearMedicion = asyncHandler(async (req, res) => {

    // Obtener el id del entrenador desde el token, no del body
    const entrenador_id = req.usuario.id;

    // Validar el formato de los datos incluyendo el entrenador_id del token
    const { valido, errores } = validarCrearMedicion({ ...req.body, entrenador_id });
    if (!valido) return res.status(400).json({ errores });

    // Crear el documento con todos los campos del body más el entrenador y guardarlo
    const nuevaMedicion = new Medicion({ ...req.body, entrenador_id });

    const medicionGuardada = await nuevaMedicion.save();
    return res.status(201).json(medicionGuardada);

});

/**
 * Editar una medición existente. Solo el entrenador que la registró
 * originalmente puede modificarla, para conservar la responsabilidad sobre
 * los datos registrados.
 * @param {import('express').Request} req - `params.id` + body parcial.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con la medición actualizada; 403 si no es el autor; 404 si no existe.
 */
export const editarMedicion = asyncHandler(async (req, res) => {

    // Extraer el id de la medición de los parámetros de la ruta
    const { id } = req.params;

    // Validar los datos recibidos; rechaza cliente_id y entrenador_id si vienen en el body
    const { valido, errores } = validarEditarMedicion(req.body);
    if (!valido) return res.status(400).json({ errores });

    // Cargar la medición para comprobar quién la registró antes de modificarla
    const medicionExistente = await Medicion.findById(id);
    if (!medicionExistente) return res.status(404).json({ mensaje: 'Medición no encontrada' });

    // Solo el entrenador que la registró puede editarla
    if (String(medicionExistente.entrenador_id) !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el entrenador que la registró puede modificarla' });
    }

    // Actualizar la medición y devolver el documento actualizado
    const medicion = await Medicion.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });

    return res.status(200).json(medicion);

});

/**
 * Eliminar una medición por su id. Igual que en edición, solo el entrenador
 * que la registró puede borrarla.
 * @param {import('express').Request} req - `params.id`.
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si se elimina; 403 si no es el autor; 404 si no existe.
 */
export const eliminarMedicion = asyncHandler(async (req, res) => {

    // Extraer el id de la medición de los parámetros de la ruta
    const { id } = req.params;

    // Cargar la medición para comprobar quién la registró antes de borrarla
    const medicionExistente = await Medicion.findById(id);
    if (!medicionExistente) return res.status(404).json({ mensaje: 'Medición no encontrada' });

    // Solo el entrenador que la registró puede eliminarla
    if (String(medicionExistente.entrenador_id) !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el entrenador que la registró puede eliminarla' });
    }

    await Medicion.findByIdAndDelete(id);

    return res.status(200).json({ mensaje: 'Medición eliminada correctamente' });

});
