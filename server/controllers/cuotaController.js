import Cuota from '../models/Cuota.js';

// Devolver todas las cuotas disponibles para mostrarlas en el panel de admin o en el modal de cambio de cuota
export const listarCuotas = async (req, res) => {

    try {

        // Obtener todas las cuotas sin filtro; la colección suele tener pocos documentos
        const cuotas = await Cuota.find();
        return res.status(200).json({ cuotas });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Crear una nueva cuota con nombre, duración en meses e importe total
export const crearCuota = async (req, res) => {

    try {

        // Extraer solo los campos necesarios para evitar que lleguen campos no deseados del body
        const { nombre, meses, importe } = req.body;

        // Crear y guardar el documento; save() lanza excepción si falla la validación del modelo
        const cuota = new Cuota({ nombre, meses, importe });
        await cuota.save();
        return res.status(201).json({ cuota });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Actualizar los datos de una cuota existente; el id viene en los parámetros de la ruta
export const editarCuota = async (req, res) => {

    try {

        const cuota_id = req.params.id;

        // { new: true } devuelve el documento ya actualizado, no el anterior
        const cuotaActualizada = await Cuota.findByIdAndUpdate(
            cuota_id,
            req.body,
            { new: true }
        );

        // findByIdAndUpdate devuelve null si el id no existe
        if (!cuotaActualizada) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

        return res.status(200).json({ cuota: cuotaActualizada });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }

}

// Eliminar una cuota por su id; el id viene en los parámetros de la ruta
export const eliminarCuota = async (req, res) => {

    try {

        const cuota_id = req.params.id;

        // findByIdAndDelete devuelve null si el id no existe
        const cuotaEliminada = await Cuota.findByIdAndDelete(cuota_id);
        if (!cuotaEliminada) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

        return res.status(200).json({ cuota: cuotaEliminada });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}