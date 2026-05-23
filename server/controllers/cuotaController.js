import Cuota from '../models/TipoCuotaModel.js';
import { validarTipoCuota, validarEditarTipoCuota } from '../validators/validarRegistros.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * Devolver todas las cuotas disponibles para mostrarlas en el panel de admin
 * o en el modal de cambio de cuota.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON con array de cuotas
 */
export const listarCuotas = asyncHandler(async (_req, res) => {

    // Obtener todas las cuotas sin filtro; la colección suele tener pocos documentos
    const cuotas = await Cuota.find();
    return res.status(200).json({ cuotas });

});

/**
 * Crear una nueva cuota con nombre, duración en meses e importe total.
 * @param {import('express').Request} req - Body: { nombre, meses, importe (céntimos) }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con la cuota creada o 400 con errores de validación
 */
export const crearCuota = asyncHandler(async (req, res) => {

    // Extraer solo los campos necesarios para evitar que lleguen campos no deseados del body
    const { nombre, meses, importe } = req.body;

    // Validar los campos antes de instanciar el modelo
    const { valido, errores } = validarTipoCuota({ nombre, meses, importe });
    if (!valido) return res.status(400).json({ errores });

    // Crear y guardar el documento; save() lanza excepción si falla la validación del modelo
    const cuota = new Cuota({ nombre, meses, importe });
    await cuota.save();
    return res.status(201).json({ cuota });

});

/**
 * Actualizar los datos de una cuota existente. Soporta edición parcial
 * (solo se validan los campos presentes en el body).
 * @param {import('express').Request} req - params.id + body parcial { nombre?, meses?, importe? }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con la cuota actualizada, 400 si hay errores o 404 si no existe
 */
export const editarCuota = asyncHandler(async (req, res) => {

    const cuota_id = req.params.id;

    // Extraer solo los campos permitidos (whitelist)
    const { nombre, meses, importe } = req.body;
    const datos = Object.fromEntries(
        Object.entries({ nombre, meses, importe }).filter(([, valor]) => valor !== undefined)
    );

    // Validar solo los campos presentes (edición parcial)
    const { valido, errores } = validarEditarTipoCuota(datos);
    if (!valido) return res.status(400).json({ errores });

    // { new: true } devuelve el documento ya actualizado, no el anterior
    // runValidators aplica las restricciones del schema también en updates
    const cuotaActualizada = await Cuota.findByIdAndUpdate(
        cuota_id,
        { $set: datos },
        { new: true, runValidators: true }
    );

    // findByIdAndUpdate devuelve null si el id no existe
    if (!cuotaActualizada) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

    return res.status(200).json({ cuota: cuotaActualizada });

});

/**
 * Eliminar una cuota por su id.
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con la cuota eliminada o 404 si no existe
 */
export const eliminarCuota = asyncHandler(async (req, res) => {

    const cuota_id = req.params.id;

    // findByIdAndDelete devuelve null si el id no existe
    const cuotaEliminada = await Cuota.findByIdAndDelete(cuota_id);
    if (!cuotaEliminada) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

    return res.status(200).json({ cuota: cuotaEliminada });

});
